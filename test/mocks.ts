import { Actor, Task } from 'graasp';
import { FileTaskManager } from 'graasp-plugin-file';
import FileService from 'graasp-plugin-file/dist/fileServices/interface/fileService';
import DownloadFileTask from 'graasp-plugin-file/dist/tasks/download-file-task';

/**
 * Implements a mocked spy for {@link FileTaskManager.createDownloadFileTask}
 * @param fileTaskManager (mock) file task manager instance
 * @param fileService (mock) file service instance
 */
export const mockCreateDownloadFileTask = (
  fileTaskManager: FileTaskManager,
  fileService: FileService,
) =>
  jest
    .spyOn(fileTaskManager, 'createDownloadFileTask')
    .mockImplementation(
      (member, input) => new DownloadFileTask(member, fileService, input) as Task<Actor, unknown>,
    );
