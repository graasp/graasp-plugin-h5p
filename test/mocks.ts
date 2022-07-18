import { Actor, Task } from 'graasp';
import FileService from 'graasp-plugin-file/dist/fileServices/interface/fileService';
import CopyFileTask, { CopyInputType } from 'graasp-plugin-file/dist/tasks/copy-file-task';
import CopyFolderTask, { CopyFolderType } from 'graasp-plugin-file/dist/tasks/copy-folder-task';
import DeleteFileTask, {
  DeleteFileInputType,
} from 'graasp-plugin-file/dist/tasks/delete-file-task';
import DeleteFolderTask, {
  DeleteFolderInputType,
} from 'graasp-plugin-file/dist/tasks/delete-folder-task';
import DownloadFileTask, {
  DownloadFileInputType,
} from 'graasp-plugin-file/dist/tasks/download-file-task';
import { UploadFileInputType } from 'graasp-plugin-file/dist/tasks/upload-file-task';

export class MockFileService implements FileService {
  copyFile = jest.fn();
  copyFolder = jest.fn();
  deleteFile = jest.fn();
  deleteFolder = jest.fn();
  downloadFile = jest.fn();
  uploadFile = jest.fn();
}

export class MockFileTaskManager {
  private fileService: FileService;

  constructor(fileService: FileService) {
    this.fileService = fileService;
  }

  getUploadFileTaskName: () => string = jest.fn().mockReturnValue('UploadFileTask');

  getDownloadFileTaskName: () => string = jest.fn().mockReturnValue('DownloadFileTask');

  createUploadFileTask: (
    member: Actor,
    data?: UploadFileInputType | undefined,
  ) => Task<Actor, unknown> = jest
    .fn()
    .mockImplementation((member, data) => new DownloadFileTask(member, this.fileService, data));

  createDownloadFileTask: (member: Actor, data: DownloadFileInputType) => Task<Actor, unknown> =
    jest
      .fn()
      .mockImplementation((member, data) => new DownloadFileTask(member, this.fileService, data));

  createDeleteFileTask: (member: Actor, data: DeleteFileInputType) => Task<Actor, unknown> = jest
    .fn()
    .mockImplementation((member, data) => new DeleteFileTask(member, this.fileService, data));

  createDeleteFolderTask: (member: Actor, data: DeleteFolderInputType) => Task<Actor, unknown> =
    jest
      .fn()
      .mockImplementation((member, data) => new DeleteFolderTask(member, this.fileService, data));

  createCopyFileTask: (member: Actor, data?: CopyInputType | undefined) => Task<Actor, unknown> =
    jest
      .fn()
      .mockImplementation((member, data) => new CopyFileTask(member, this.fileService, data));

  createCopyFolderTask: (member: Actor, data: CopyFolderType) => Task<Actor, unknown> = jest
    .fn()
    .mockImplementation((member, data) => new CopyFolderTask(member, this.fileService, data));
}
