import extract from 'extract-zip';
import fs, { PathLike } from 'fs';
import { lstat, mkdir, readdir, rm } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import uuid from 'uuid';

import fastifyMultipart from '@fastify/multipart';
import { FastifyPluginAsync, FastifyRequest as Request } from 'fastify';

import { Item } from 'graasp';
import {
  FileTaskManager,
  GraaspLocalFileItemOptions,
  GraaspS3FileItemOptions,
  ServiceMethod,
} from 'graasp-plugin-file';
import { buildFilePathFromPrefix } from 'graasp-plugin-file-item';

import {
  H5P_FILE_MIME_TYPE,
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_NON_FILE_FIELDS,
  TMP_EXTRACT_DIR,
} from './constants';
import { InvalidH5PFileError } from './errors';

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
 */
async function uploadH5P(
  h5pFile: PathLike,
  extractedContentDir: PathLike,
): Promise<Partial<Item>> {
}

/**
 * Creates a Graasp item for the uploaded H5P package
 */
async function createH5PItem(): Promise<Item> {}

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

    const tmpId = uuid.v4();
    const targetFolder = path.join(__dirname, TMP_EXTRACT_DIR, tmpId);
    await mkdir(targetFolder, { recursive: true });

    try {
      const savePath = path.join(targetFolder, `${tmpId}.h5p`);
      const contentFolder = path.join(targetFolder, 'content');
      // save H5P file
      await pipeline(h5pFile.file, fs.createWriteStream(savePath));
      await extract(savePath, { dir: contentFolder });

      const { isValid, error } = await validateH5P(savePath, contentFolder);
      if (!isValid) {
        throw new InvalidH5PFileError(error);
      }

      // upload to public storage
      await uploadH5P(savePath, contentFolder);

      const item = await createH5PItem();

      return item;
    } finally {
      rm(targetFolder, { recursive: true });
    }
  });
};

export default plugin;
