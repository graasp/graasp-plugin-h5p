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

import {
  H5P_ALLOWED_FILE_EXTENSIONS,
  H5P_FILE_MIME_TYPE,
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_NON_FILE_FIELDS,
  REMOTE_ROOT_H5P_STORAGE_DIR,
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
   * IMPORTANT: the top-down traversal must not block or await (ensures that files
   * are uploaded in parallel as soon as possible). Results aggregation can however
   * await in parallel (note: await in a map fn does not block the map iteration).
   */
  async function uploadH5P(
    folder: string,
    uploadPath: string,
    member: Actor,
  ): Promise<Array<unknown>> {
    const children = await readdir(folder);

    return children.flatMap(async (child) => {
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

        // we're using flatMap, wrap result in array
        return [await taskRunner.runSingle(uploadTask)];
      }
    });
  }

  /**
   * Creates a Graasp item for the uploaded H5P package
   */
  async function createH5PItem(): Promise<Item> {}

  fastify.register(fastifyMultipart, {
    limits: {
      fields: MAX_NON_FILE_FIELDS,
      files: MAX_FILES,
      fileSize: MAX_FILE_SIZE,
    },
  });

  fastify.post('/h5p-import', async (request: Request) => {
    const { file, member, log, query } = request;

    const h5pFile = await file();

    if (h5pFile.mimetype !== H5P_FILE_MIME_TYPE) {
      throw new InvalidH5PFileError(h5pFile.mimetype);
    }

    const contentId = uuid.v4();
    const targetFolder = path.join(__dirname, TMP_EXTRACT_DIR, contentId);
    await mkdir(targetFolder, { recursive: true });

    try {
      const savePath = path.join(targetFolder, `${contentId}.h5p`);
      const contentFolder = path.join(targetFolder, 'content');
      // save H5P file
      await pipeline(h5pFile.file, fs.createWriteStream(savePath));
      await extract(savePath, { dir: contentFolder });

      const { isValid, error } = await validateH5P(savePath, contentFolder);
      if (!isValid) {
        throw new InvalidH5PFileError(error);
      }

      // upload whole folder to public storage
      const remoteRootPath = path.join(REMOTE_ROOT_H5P_STORAGE_DIR, contentId);
      await uploadH5P(targetFolder, remoteRootPath, member);

      const item = await createH5PItem();

      return item;
    } finally {
      rm(targetFolder, { recursive: true });
    }
  });
};

export default plugin;
