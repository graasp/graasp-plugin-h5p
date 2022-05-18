import extract from 'extract-zip';
import fs, { PathLike } from 'fs';
import { lstat, mkdir, readdir, rm } from 'fs/promises';
import mmm from 'mmmagic';
import path from 'path';
import { pipeline } from 'stream/promises';
import util from 'util';
import uuid from 'uuid';

import fastifyMultipart from '@fastify/multipart';
import { FastifyPluginAsync, FastifyRequest as Request } from 'fastify';

import { Actor, Item } from 'graasp';
import {
  FileTaskManager,
  GraaspLocalFileItemOptions,
  GraaspS3FileItemOptions,
  ServiceMethod,
} from 'graasp-plugin-file';
import { ORIGINAL_FILENAME_TRUNCATE_LIMIT } from 'graasp-plugin-file-item';

import {
  H5P_ALLOWED_FILE_EXTENSIONS,
  H5P_FILE_MIME_TYPE,
  H5P_ITEM_TYPE,
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_NON_FILE_FIELDS,
  TMP_EXTRACT_DIR,
} from './constants';
import { InvalidH5PFileError } from './errors';

const magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE); // don't set MAGIC_CONTINUE!
const detectMimeType = util.promisify(magic.detectFile.bind(magic));

export interface H5PPluginOptions {
  pathPrefix: string;
  serviceMethod: ServiceMethod;
  serviceOptions: { s3: GraaspS3FileItemOptions; local: GraaspLocalFileItemOptions };
}

const plugin: FastifyPluginAsync<H5PPluginOptions> = async (fastify, options) => {
  // get services from server instance
  const {
    items: { taskManager: itemTaskManager },
    taskRunner,
  } = fastify;

  const { serviceMethod, serviceOptions, pathPrefix } = options;

  const fileTaskManager = new FileTaskManager(serviceOptions, serviceMethod);

  /**
   * Validates H5P package content against the (poorly documented) H5P spec
   * https://h5p.org/documentation/developers/h5p-specification
   */
  async function validateH5P(
    h5pFile: PathLike,
    extractedContentDir: PathLike,
  ): Promise<{ isValid: boolean; error?: string }> {}

  /**
   * Uploads both the .h5p and the package content into public storage
   * Recursive function to traverse and upload the H5P folder
   * IMPORTANT: the top-down traversal must not wait for long (ensures that files
   * are uploaded in parallel as soon as possible). Results aggregation can however
   * await in parallel (note: await in a map fn does not block the map iteration).
   */
  async function uploadH5P(
    folder: string,
    uploadPath: string,
    member: Actor,
  ): Promise<Array<string>> {
    const children = await readdir(folder);

    // we will flatMap with promises: first map
    const uploads = children.map(async (child) => {
      const childPath = path.join(folder, child);
      const childUploadPath = path.join(uploadPath, child);
      const stats = await lstat(child);

      if (stats.isDirectory()) {
        // recursively upload child folder
        return await uploadH5P(childPath, childUploadPath, member);
      } else {
        // check if file extension is allowed
        const extension = path.extname(childPath);
        const normalizedExtension = (
          extension[0] === '.' ? extension.slice(1) : extension
        ).toLowerCase();
        // ignore this file if extension is not allowed
        if (!H5P_ALLOWED_FILE_EXTENSIONS.includes(normalizedExtension)) {
          // we're using flatMap, represent none value with empty array
          return [];
        }

        // SAFE CAST
        // we are guaranteed that the resulting `mimetype` is a string
        // from the docs: "Result is a string, except when MAGIC_CONTINUE is set"
        const mimetype = (await detectMimeType(childPath)) as string;
        const size = stats.size;
        const uploadTask = fileTaskManager.createUploadFileTask(member, {
          file: fs.createReadStream(childPath),
          filepath: childUploadPath,
          mimetype,
          size,
        });

        await taskRunner.runSingle(uploadTask);
        // we're using flatMap, wrap result in array
        return [childUploadPath];
      }
    });
    // then resolve promises array and flatten
    return (await Promise.all(uploads)).flat();
  }

  /**
   * Creates a Graasp item for the uploaded H5P package
   * @param filename Name of the original H5P file
   * @param h5pFilePath Path of the saved H5P file
   * @param contentFilePath Root path of the extracted contents
   */
  async function createH5PItem(
    filename: string,
    h5pFilePath: string,
    contentFilePath: string,
    member: Actor,
    parentId?: string,
  ): Promise<Item> {
    const metadata = {
      name: filename.substring(0, ORIGINAL_FILENAME_TRUNCATE_LIMIT),
      type: H5P_ITEM_TYPE,
      extra: {
        [serviceMethod]: {
          h5pFilePath,
          contentFilePath,
        },
      },
    };
    const create = itemTaskManager.createCreateTaskSequence(member, metadata, parentId);
    return taskRunner.runSingleSequence(create) as Promise<Item>;
  }

  // Helper to build the local or remote path of the .h5p file
  const buildH5PPath = (rootPath: string, contentId: string) =>
    path.join(rootPath, `${contentId}.h5p`);
  // Helper to build the local or remote path of the h5p content root
  const buildContentPath = (rootPath: string) => path.join(rootPath, 'content');

  fastify.register(fastifyMultipart, {
    limits: {
      fields: MAX_NON_FILE_FIELDS,
      files: MAX_FILES,
      fileSize: MAX_FILE_SIZE,
    },
  });

  fastify.post('/h5p-import', async (request: Request) => {
    const { file, member, log, query } = request;
    const { parentId } = query as { parentId?: string };

    const h5pFile = await file();

    if (h5pFile.mimetype !== H5P_FILE_MIME_TYPE) {
      throw new InvalidH5PFileError(h5pFile.mimetype);
    }

    const contentId = uuid.v4();
    const targetFolder = path.join(__dirname, TMP_EXTRACT_DIR, contentId);
    const remoteRootPath = path.join(pathPrefix, contentId);

    await mkdir(targetFolder, { recursive: true });

    // try-catch block for local storage cleanup
    try {
      const savePath = buildH5PPath(targetFolder, contentId);
      const contentFolder = buildContentPath(targetFolder);

      // save H5P file
      await pipeline(h5pFile.file, fs.createWriteStream(savePath));
      await extract(savePath, { dir: contentFolder });

      const { isValid, error } = await validateH5P(savePath, contentFolder);
      if (!isValid) {
        throw new InvalidH5PFileError(error);
      }

      // try-catch block for remote storage cleanup
      try {
        // upload whole folder to public storage
        await uploadH5P(targetFolder, remoteRootPath, member);

        const item = await createH5PItem(
          h5pFile.filename,
          buildH5PPath(remoteRootPath, contentId),
          buildContentPath(remoteRootPath),
          member,
          parentId,
        );
        return item;
      } catch (error) {
        // delete public storage folder of this H5P if upload or creation fails
        fileTaskManager.createDeleteFolderTask(member, {
          folderPath: remoteRootPath,
        });
        // log and rethrow to let fastify handle the error response
        log.error('graasp-plugin-h5p: unexpected error occured while importing H5P:');
        log.error(error);
        throw error;
      }
      // end of try-catch block for remote storage cleanup
    } finally {
      // in all cases, remove local temp folder
      rm(targetFolder, { recursive: true });
    }
    // end of try-catch block for local storage cleanup
  });
};

export default plugin;