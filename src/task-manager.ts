import { FileTaskManager } from '@graasp/plugin-file';
import { Actor, Item, Task } from '@graasp/sdk';
import { ReadStream } from 'fs';
import path from 'path';

import { H5P_FILE_MIME_TYPE } from './constants';
import { H5PItemMissingExtraError } from './errors';
import { H5PExtra } from './types';

export class H5PTaskManager {
  private fileTaskManager: FileTaskManager;
  private pathPrefix: string;

  constructor(fileTaskManager: FileTaskManager, pathPrefix: string) {
    this.fileTaskManager = fileTaskManager;
    this.pathPrefix = pathPrefix;
  }

  /**
   * Creates a task to download an H5P file as a fs.ReadStream
   * @param item Graasp item associated to the requested H5P file
   * @param destinationPath Path on server filesystem to which the file should be saved
   * @param member Graasp member initiating the download action
   */
  createDownloadH5PFileTask(item: Item<Partial<H5PExtra>>, destinationPath: string, member: Actor) {
    const h5pPath = item.extra?.h5p?.h5pFilePath;
    if (!h5pPath) {
      throw new H5PItemMissingExtraError(item);
    }
    return this.fileTaskManager.createDownloadFileTask(member, {
      itemId: item.id,
      filepath: path.join(this.pathPrefix, h5pPath),
      mimetype: H5P_FILE_MIME_TYPE,
      fileStorage: destinationPath,
    }) as Task<Actor, ReadStream>;
  }
}
