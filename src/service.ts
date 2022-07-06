import { FileTaskManager } from 'graasp-plugin-file';

import { H5PService } from './interfaces/h5p-service';

export class Service implements H5PService {
  public fileTaskManager: FileTaskManager;

  constructor(fileTaskManager: FileTaskManager) {
    this.fileTaskManager = fileTaskManager;
  }
}
