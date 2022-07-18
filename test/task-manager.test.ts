import { FastifyLoggerInstance } from 'fastify';

import { Item } from 'graasp';
import TaskManager from 'graasp-plugin-file/dist/task-manager';

import { H5PItemMissingExtraError } from '../src/errors';
import { H5PTaskManager } from '../src/task-manager';
import { H5PExtra } from '../src/types';
import { MOCK_ITEM, MOCK_MEMBER } from './fixtures';
import { MockFileService, MockFileTaskManager } from './mocks';

describe('H5P task manager', () => {
  const mockFileService = new MockFileService();
  const mockFileTaskManager = new MockFileTaskManager(mockFileService) as unknown as TaskManager;
  const taskManager = new H5PTaskManager(mockFileTaskManager, 'mock-prefix');

  it('creates download H5P file task', () => {
    const task = taskManager.createDownloadH5PFileTask(
      MOCK_ITEM,
      'mock-destination-path',
      MOCK_MEMBER,
    );
    expect(task.actor).toEqual(MOCK_MEMBER);
    expect(task.getInput).toEqual(undefined);
    expect(task.getResult).toEqual(undefined);
    expect(task.input).toEqual({
      fileStorage: 'mock-destination-path',
      filepath: 'mock-prefix/mock-h5p-file-path',
      itemId: 'mock-id',
      mimetype: 'application/zip',
    });
    expect(task.name).toEqual('DownloadFileTask');
  });

  it('runs download H5P file task', async () => {
    const task = taskManager.createDownloadH5PFileTask(
      MOCK_ITEM,
      'mock-destination-path',
      MOCK_MEMBER,
    );
    await task.run({}, {} as FastifyLoggerInstance);
    expect(mockFileService.downloadFile).toHaveBeenCalledWith({
      fileStorage: 'mock-destination-path',
      filepath: 'mock-prefix/mock-h5p-file-path',
      itemId: 'mock-id',
      mimetype: 'application/zip',
    });
  });

  it.each([undefined, {}, { h5p: {} }])('throws if H5P item is missing extra: %o', (extra) => {
    const missingExtraItem = {
      ...MOCK_ITEM,
      extra,
    } as Item<H5PExtra>;
    expect(() =>
      taskManager.createDownloadH5PFileTask(missingExtraItem, 'mock-destination-path', MOCK_MEMBER),
    ).toThrowError(new H5PItemMissingExtraError(missingExtraItem));
  });
});
