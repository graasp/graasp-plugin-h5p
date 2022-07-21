import fs from 'fs';
import fsp from 'fs/promises';
import { StatusCodes } from 'http-status-codes';
import LightMyRequest from 'light-my-request';
import path from 'path';
import { createMock } from 'ts-auto-mock';

import { FastifyInstance } from 'fastify';

import { Actor, Item, PostHookHandlerType, TaskRunner } from 'graasp';

import { H5P_ITEM_TYPE } from '../src/constants';
import { H5PService } from '../src/service';
import { H5PExtra } from '../src/types';
import {
  BuildAppType,
  CoreSpiesType,
  buildApp,
  expectH5PFiles,
  injectH5PImport,
  mockCoreServices,
} from './app';
import { H5P_PACKAGES, MOCK_ITEM, MOCK_MEMBER, mockParentId } from './fixtures';

describe('Service plugin', () => {
  let build: BuildAppType;
  let app: FastifyInstance;

  /* spies */
  let spies: CoreSpiesType;

  beforeAll(async () => {
    build = await buildApp();
    await build.registerH5PPlugin();
    spies = mockCoreServices(build);
    app = build.app;
  });

  it('decorates the fastify instance with h5p service', () => {
    expect(app.h5p).toBeDefined();
    expect(app.h5p instanceof H5PService).toBeTruthy();
  });

  describe('Upload valid .h5p package', () => {
    const h5pFileName = path.basename(H5P_PACKAGES.ACCORDION.path);

    let res: LightMyRequest.Response,
      json: Item<H5PExtra>,
      contentId: string,
      expectedExtra: H5PExtra,
      expectedMetadata: Partial<Item<H5PExtra>>;

    beforeAll(async () => {
      res = await injectH5PImport(app);

      json = res.json();

      // contentId is generated by the server so we have to retrieve it from response
      contentId = json.extra.h5p.contentId;

      expectedExtra = {
        h5p: {
          contentId,
          h5pFilePath: `${contentId}/${h5pFileName}`,
          contentFilePath: `${contentId}/content`,
        },
      };

      expectedMetadata = {
        name: h5pFileName,
        type: H5P_ITEM_TYPE,
        extra: expectedExtra,
      };
    });

    it('returns the created item object', () => {
      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(json).toEqual({
        ...MOCK_ITEM,
        ...expectedMetadata,
      });
    });

    it('validates the write permission in parent if it exists', () => {
      expect(spies.getItem).toHaveBeenCalledTimes(1);
      expect(spies.getItem).toHaveBeenCalledWith(MOCK_MEMBER, mockParentId);

      expect(spies.getMembership).toHaveBeenCalledTimes(1);
      expect(spies.getMembership).toHaveBeenCalledWith(MOCK_MEMBER);

      const usedGetItemTask = spies.getItem.mock.results[0].value;
      const usedGetMembershipTask = spies.getMembership.mock.results[0].value;
      expect(spies.runSingleSequence).toHaveBeenCalledWith([
        usedGetItemTask,
        usedGetMembershipTask,
      ]);
    });

    it('extracts the files correctly', async () => {
      const { storageRootPath, pathPrefix } = build.options;
      await expectH5PFiles(H5P_PACKAGES.ACCORDION, storageRootPath, pathPrefix, contentId);
    });

    it('creates the item through the item service', () => {
      expect(spies.createItem).toHaveBeenCalledTimes(1);
      expect(spies.createItem).toHaveBeenCalledWith(MOCK_MEMBER, expectedMetadata, mockParentId);

      const usedCreateItemSequence = spies.createItem.mock.results[0].value;
      expect(spies.runSingleSequence).toHaveBeenCalledWith(usedCreateItemSequence);
    });

    it('removes the temporary extraction folder', async () => {
      const { extractionRootPath } = build.options;
      const contents = await fsp.readdir(extractionRootPath);
      expect(contents.length).toEqual(0);
    });
  });
});

describe('Hooks', () => {
  /** we manually create a mock task runner to inject implementations */
  let taskRunner: TaskRunner<Actor>;

  let build: BuildAppType;
  let spies: CoreSpiesType;
  let app: FastifyInstance;

  beforeAll(() => {
    taskRunner = createMock<TaskRunner<Actor>>();
  });

  beforeEach(async () => {
    // create a fresh app at each test
    build = await buildApp({ services: { taskRunner } });
    spies = mockCoreServices(build);
    app = build.app;
  });

  it('deletes H5P assets on item delete', async () => {
    // setup handler storage to execute it when we will simulate an item delete
    const onDeleteStore = new Promise<PostHookHandlerType<Item<H5PExtra>>>((resolve, reject) => {
      spies.setTaskPostHookHandler.mockImplementation((taskName, handler) => {
        resolve(handler);
      });
    });
    // onDelete will be saved after registerH5PPlugin
    await build.registerH5PPlugin();

    // create an H5P item through import
    const res = await injectH5PImport(app, { filePath: H5P_PACKAGES.ACCORDION.path });
    expect(res.statusCode).toEqual(StatusCodes.OK);
    const item: Item<H5PExtra> = res.json();
    const contentId = item.extra.h5p.contentId;
    const { storageRootPath, pathPrefix } = build.options;
    await expectH5PFiles(H5P_PACKAGES.ACCORDION, storageRootPath, pathPrefix, contentId);

    // simulate an item delete
    const onDelete = await onDeleteStore;
    expect(onDelete).toBeDefined();
    await onDelete(item, MOCK_MEMBER, { log: build.services.logger });

    // H5P folder should now be deleted
    const h5pFolder = path.join(storageRootPath, pathPrefix, contentId);
    expect(fs.existsSync(h5pFolder)).toBeFalsy();
  });

  it('copies H5P assets on item copy', () => {});
});
