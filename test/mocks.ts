import { FastifyLoggerInstance } from 'fastify';

import {
  Actor,
  DatabaseTransactionHandler,
  Item,
  ItemMembershipTaskManager,
  ItemTaskManager,
  Task,
  TaskRunner,
  TaskStatus,
  UnknownExtra,
} from 'graasp';
import { FileTaskManager } from 'graasp-plugin-file';
import FileService from 'graasp-plugin-file/dist/fileServices/interface/fileService';
import DownloadFileTask from 'graasp-plugin-file/dist/tasks/download-file-task';

import { MOCK_ITEM, MOCK_MEMBERSHIP } from './fixtures';

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

/** Mock item result task factory */
export const mockTask = <T>(
  name: string,
  actor: Actor,
  result: T,
  status: TaskStatus = 'NEW',
): Task<Actor, T> => ({
  name,
  actor,
  status,
  result,
  run: async function (
    handler: DatabaseTransactionHandler,
    log: FastifyLoggerInstance,
  ): Promise<void | Task<Actor, T>[]> {
    this.status = 'OK';
  },
});

/**
 * Implements a mocked spy for {@link ItemTaskManager.createCreateTaskSequence}
 */
export const mockCreateCreateItemTaskSequence = (itemTaskManager: ItemTaskManager) =>
  jest
    .spyOn(itemTaskManager, 'createCreateTaskSequence')
    .mockImplementation((actor, item, extra) => [
      mockTask<unknown>('MockCreateItemTask', actor, { ...MOCK_ITEM, ...item }),
    ]);

/**
 * Implements a mocked spy for {@link ItemTaskManager.createGetTask}
 */
export const mockCreateGetTask = (itemTaskManager: ItemTaskManager) =>
  jest
    .spyOn(itemTaskManager, 'createGetTask')
    .mockImplementation((actor, id) =>
      mockTask<Item<UnknownExtra>>('MockGetItemTask', actor, MOCK_ITEM),
    );

/**
 * Implements a mocked spy for {@link ItemMembershipTaskManager.createGetMemberItemMembershipTask}
 */
export const mockCreateGetMembershipTask = (itemMembershipTaskManager: ItemMembershipTaskManager) =>
  jest
    .spyOn(itemMembershipTaskManager, 'createGetMemberItemMembershipTask')
    .mockImplementation((member) =>
      mockTask('MockGetMemberItemMembershipTask', member, MOCK_MEMBERSHIP),
    );

/**
 * Implements a mocked spy for {@link TaskRunner.runSingle}
 */
export const mockRunSingle = (
  taskRunner: TaskRunner<Actor>,
  handler: DatabaseTransactionHandler,
  log: FastifyLoggerInstance,
) => jest.spyOn(taskRunner, 'runSingle').mockImplementation((task) => task.run(handler, log));

/**
 * Implements a mocked spy for {@link TaskRunner.runSingleSequence}
 */
export const mockRunSingleSequence = (
  taskRunner: TaskRunner<Actor>,
  handler: DatabaseTransactionHandler,
  log: FastifyLoggerInstance,
) =>
  jest
    .spyOn(taskRunner, 'runSingleSequence')
    .mockImplementation((tasks) =>
      Promise.resolve([...tasks].map((t) => (t.run(handler, log), t)).pop()?.result),
    );
