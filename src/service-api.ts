import { FileTaskManager } from '@graasp/plugin-file';
import { Actor, H5PExtra, Item, PermissionLevel, Task } from '@graasp/sdk';
import extract from 'extract-zip';
import fs from 'fs';
import { lstat, mkdir, readdir } from 'fs/promises';
import mime from 'mime';
import path from 'path';
import { pipeline } from 'stream/promises';
import tmp from 'tmp-promise';
import { v4 } from 'uuid';

import fastifyMultipart from '@fastify/multipart';
import { FastifyLoggerInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import {
  DEFAULT_MIME_TYPE,
  H5P_FILE_DOT_EXTENSION,
  H5P_ITEM_TYPE,
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_NON_FILE_FIELDS,
  PLUGIN_NAME,
} from './constants';
import { GraaspH5PError, H5PImportError, InvalidH5PFileError } from './errors';
import { h5pImport } from './schemas';
import { H5PService } from './service';
import { H5PPluginOptions } from './types';
import { buildContentPath, buildH5PPath, buildRootPath, validatePluginOptions } from './utils';
import { H5PValidator } from './validation/h5p-validator';

const plugin: FastifyPluginAsync<H5PPluginOptions> = async (fastify, options) => {
  // get services from server instance
  const {
    items: { taskManager: itemTaskManager },
    itemMemberships: { taskManager: itemMembershipTaskManager },
    taskRunner,
    db,
    log,
  } = fastify;

  validatePluginOptions(options);
  const { fileItemType, fileConfigurations, pathPrefix, tempDir } = options;

  const fileTaskManager = new FileTaskManager(fileConfigurations, fileItemType);
  const h5pValidator = new H5PValidator();

  const h5pService = new H5PService(fileTaskManager, pathPrefix);
  fastify.decorate('h5p', h5pService);

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
    log: FastifyLoggerInstance,
  ): Promise<Array<string>> {
    const children = await readdir(folder);

    // we will flatMap with promises: first map
    const uploads = children.map(async (child) => {
      const childPath = path.join(folder, child);
      const childUploadPath = path.join(uploadPath, child);
      const stats = await lstat(childPath);

      if (stats.isDirectory()) {
        // recursively upload child folder
        return await uploadH5P(childPath, childUploadPath, member, log);
      } else {
        // ignore this file if extension is not allowed
        const ext = path.extname(childPath);
        if (!h5pValidator.isExtensionAllowed(ext)) {
          log.info('H5P import: illegal file extension detected, skipping file: ', childPath);
          // we're using flatMap, represent none value with empty array
          return [];
        }

        const mimetype = mime.getType(ext) ?? DEFAULT_MIME_TYPE;
        const size = stats.size;
        const uploadTask = fileTaskManager.createUploadFileTask(member, {
          file: fs.createReadStream(childPath),
          filepath: childUploadPath,
          size,
          mimetype,
        });

        // WARNING: we purposedly bypass the task runner
        // (this prevents opening unwanted db connections)
        // TODO: file plugin refactor should be task agnostic and provide a fileService
        // so we'll simply call fileService.uploadFile in the future
        await uploadTask.run(db.pool, log);

        // we're using flatMap, wrap result in array
        return [childUploadPath];
      }
    });
    // then resolve promises array and flatten
    return (await Promise.all(uploads)).flat();
  }

  /**
   * Helper to create H5P extra
   */
  function buildH5PExtra(contentId: string, filename: string): H5PExtra {
    return {
      h5p: {
        contentId,
        h5pFilePath: buildH5PPath(contentId, filename), // <contentId>/<filename>.h5p
        contentFilePath: buildContentPath(contentId), // <contentId>/content
      },
    };
  }

  /**
   * Creates a Graasp item for the uploaded H5P package
   * @param filename Name of the original H5P file WITHOUT EXTENSION
   * @param contentId Storage ID of the remote content
   * @param remoteRootPath Root path on the remote storage
   * @param member Actor member
   * @param parentId Optional parent id of the newly created item
   */
  async function createH5PItem(
    filename: string,
    contentId: string,
    member: Actor,
    parentId?: string,
  ): Promise<Item<H5PExtra>> {
    const metadata = {
      name: buildH5PPath('', filename),
      type: H5P_ITEM_TYPE,
      extra: buildH5PExtra(contentId, filename),
    };
    const create = itemTaskManager.createCreateTaskSequence(member, metadata, parentId);
    return taskRunner.runSingleSequence(create) as Promise<Item<H5PExtra>>;
  }

  /*
    we create an artificial plugin scope, so that fastify-multipart does not conflict
    with other instances since we use fp to remove the outer scope
  */
  await fastify.register(async (fastify) => {
    fastify.register(fastifyMultipart, {
      limits: {
        fields: MAX_NON_FILE_FIELDS,
        files: MAX_FILES,
        fileSize: MAX_FILE_SIZE,
      },
    });

    fastify.post<{ Querystring: { parentId?: string } }>(
      '/h5p-import',
      { schema: h5pImport },
      async (request) => {
        const {
          member,
          log,
          query: { parentId },
        } = request;

        // validate write permission in parent if it exists
        if (parentId) {
          const getParentTask = itemTaskManager.createGetTask(member, parentId);
          const getMembershipTask =
            itemMembershipTaskManager.createGetMemberItemMembershipTask(member);
          getMembershipTask.getInput = () => ({
            item: getParentTask.result,
            validatePermission: PermissionLevel.Write,
          });
          // type cast: force variance on broader type
          const tasks = [getParentTask, getMembershipTask] as Task<Actor, unknown>[];
          // getMembershipTask will throw if permission is not met
          await taskRunner.runSingleSequence(tasks);
        }

        // WARNING: cannot destructure { file } = request, which triggers an undefined TypeError internally
        // (maybe getter performs side-effect on promise handler?)
        // so use request.file notation instead
        const h5pFile = await request.file();

        /*
        // uppy tries to guess the mime type but fails and falls back to application/octet-stream, so we disable this check for now
        if (h5pFile.mimetype !== H5P_FILE_MIME_TYPE) {
          throw new InvalidH5PFileError(h5pFile.mimetype);
        }
        */

        const contentId = v4();
        const tmpDir = await tmp.dir({ tmpdir: tempDir, unsafeCleanup: true });
        const targetFolder = path.join(tmpDir.path, contentId);
        const remoteRootPath = buildRootPath(pathPrefix, contentId);

        await mkdir(targetFolder, { recursive: true });
        const baseName = path.basename(h5pFile.filename, H5P_FILE_DOT_EXTENSION);

        // try-catch block for local storage cleanup
        try {
          const savePath = buildH5PPath(targetFolder, baseName);
          const contentFolder = buildContentPath(targetFolder);

          // save H5P file
          await pipeline(h5pFile.file, fs.createWriteStream(savePath));
          await extract(savePath, { dir: contentFolder });

          const result = await h5pValidator.validatePackage(contentFolder);
          if (!result.isValid) {
            throw new InvalidH5PFileError(result.error);
          }

          // try-catch block for remote storage cleanup
          try {
            // upload whole folder to public storage
            await uploadH5P(targetFolder, remoteRootPath, member, log);
            const item = await createH5PItem(baseName, contentId, member, parentId);
            return item;
          } catch (error) {
            // delete public storage folder of this H5P if upload or creation fails
            const deleteTask = fileTaskManager.createDeleteFolderTask(member, {
              folderPath: remoteRootPath,
            });
            // WARNING: we purposedly bypass the task runner
            // (this prevents opening unwanted db connections)
            // TODO: file plugin refactor should be task agnostic and provide a fileService
            // so we'll simply call fileService.uploadFile in the future
            await deleteTask.run(db.pool, log);
            // rethrow above
            throw error;
          }
          // end of try-catch block for remote storage cleanup
        } catch (error) {
          // log and rethrow to let fastify handle the error response
          log.error('graasp-plugin-h5p: unexpected error occured while importing H5P:');
          log.error(error);
          // wrap into plugin error type if not ours
          if (!(error instanceof GraaspH5PError)) {
            error = new H5PImportError();
          }
          throw error;
        } finally {
          // in all cases, remove local temp folder
          await tmpDir.cleanup();
        }
        // end of try-catch block for local storage cleanup
      },
    );

    /**
     * Delete H5P assets on item delete
     */
    const deleteItemTaskName = itemTaskManager.getDeleteTaskName();
    taskRunner.setTaskPostHookHandler<Item<H5PExtra>>(
      deleteItemTaskName,
      async (item, actor, { handler }) => {
        if (item.type !== H5P_ITEM_TYPE) {
          return;
        }
        const deleteTask = fileTaskManager.createDeleteFolderTask(actor, {
          folderPath: buildRootPath(pathPrefix, item.extra.h5p.contentId),
        });

        // WARNING: we purposedly bypass the task runner
        // (this prevents opening unwanted db connections)
        // TODO: file plugin refactor should be task agnostic and provide a fileService
        await deleteTask.run(handler ?? db.pool, log);
      },
    );

    /**
     * Copy H5P assets on item copy
     */
    const copyItemTaskName = itemTaskManager.getCopyTaskName();
    taskRunner.setTaskPreHookHandler<Item<H5PExtra>>(
      copyItemTaskName,
      async (item, actor, { handler }) => {
        // only execute this handler for H5P item types
        if (item.type !== H5P_ITEM_TYPE) {
          return;
        }
        if (!item.name) {
          throw new Error('Invalid state: missing previous H5P item name on copy');
        }
        if (!item.extra?.h5p) {
          throw new Error('Invalid state: missing previous H5P item extra on copy');
        }

        const baseName = path.basename(item.name, H5P_FILE_DOT_EXTENSION);
        const copySuffix = '-1';
        const newName = `${baseName}${copySuffix}`;

        const newContentId = v4();
        const remoteRootPath = buildRootPath(pathPrefix, newContentId);

        // copy .h5p file
        const copyH5PTask = fileTaskManager.createCopyFileTask(actor, {
          originalPath: path.join(pathPrefix, item.extra.h5p.h5pFilePath),
          newFilePath: buildH5PPath(remoteRootPath, newName),
        });
        // copy content folder
        const copyContentTask = fileTaskManager.createCopyFolderTask(actor, {
          originalFolderPath: path.join(pathPrefix, item.extra.h5p.contentFilePath),
          newFolderPath: buildContentPath(remoteRootPath),
        });

        // WARNING: we purposedly bypass the task runner
        // (this prevents opening unwanted db connections)
        // TODO: file plugin refactor should be task agnostic and provide a fileService
        const copyH5PPromise = copyH5PTask.run(handler ?? db.pool, log);
        const copyContentPromise = copyContentTask.run(handler ?? db.pool, log);
        await Promise.all([copyH5PPromise, copyContentPromise]);

        item.name = buildH5PPath('', newName);
        item.extra.h5p = buildH5PExtra(newContentId, newName).h5p;
      },
    );
  });
};

export default fp(plugin, {
  fastify: '3.x',
  name: PLUGIN_NAME,
});
