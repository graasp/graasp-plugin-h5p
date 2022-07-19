import tmp, { DirectoryResult } from 'tmp-promise';
import { createMock } from 'ts-auto-mock';

import fastify, { FastifyInstance } from 'fastify';

import { Actor, ItemMembershipTaskManager, ItemTaskManager, TaskRunner } from 'graasp';
import { ServiceMethod } from 'graasp-plugin-file';

import { H5PService } from '../src/service';
import plugin from '../src/service-api';

describe('service plugin', () => {
  /* mocks */
  const mockItemTaskManager = createMock<ItemTaskManager>();
  const mockItemMembershipTaskManager = createMock<ItemMembershipTaskManager>();
  const mockTaskRunner = createMock<TaskRunner<Actor>>();

  /* params */
  let tmpDir: DirectoryResult;
  const pathPrefix = 'h5p';

  /** instance under test */
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify();

    app.decorate('items', { taskManager: mockItemTaskManager });
    app.decorate('itemMemberships', { taskManager: mockItemMembershipTaskManager });
    app.decorate('taskRunner', mockTaskRunner);

    tmpDir = await tmp.dir({ unsafeCleanup: true });

    await app.register(plugin, {
      serviceMethod: ServiceMethod.LOCAL,
      serviceOptions: {
        local: {
          storageRootPath: tmpDir.path,
        },
        // todo: file service refactor should not require both configs
        s3: {
          s3Region: 'mock-s3-region',
          s3Bucket: 'mock-s3-bucket',
          s3AccessKeyId: 'mock-s3-access-key-id',
          s3SecretAccessKey: 'mock-s3-secret-access-key',
        },
      },
      pathPrefix,
    });
  });

  afterAll(() => {
    tmpDir.cleanup;
  });

  it('decorates the fastify instance with h5p service', () => {
    expect(app.h5p).toBeDefined();
    expect(app.h5p instanceof H5PService).toBeTruthy();
  });

  it('uploads valid .h5p package', () => {});
});
