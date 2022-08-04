import { FileTaskManager } from '@graasp/plugin-file';

import { H5PTaskManager } from './task-manager';

/**
 * Implementation for the H5P service
 */
export class H5PService {
  public taskManager: H5PTaskManager;

  constructor(fileTaskManager: FileTaskManager, pathPrefix: string) {
    this.taskManager = new H5PTaskManager(fileTaskManager, pathPrefix);
  }
}
