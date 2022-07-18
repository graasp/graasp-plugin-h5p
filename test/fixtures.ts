import path from 'path';

import { Item, Member, MemberType } from 'graasp';
import { ServiceMethod } from 'graasp-plugin-file';

import { H5PExtra, H5PPluginOptions } from '../src/types';

export const H5P_PACKAGES = {
  ACCORDION: {
    path: path.resolve(__dirname, 'fixtures/accordion-6-7138.h5p'),
    manifest: {
      title: 'Accordion',
      language: 'und',
      mainLibrary: 'H5P.Accordion',
      embedTypes: ['div'],
      license: 'U',
      preloadedDependencies: [
        { machineName: 'H5P.AdvancedText', majorVersion: '1', minorVersion: '1' },
        { machineName: 'H5P.Accordion', majorVersion: '1', minorVersion: '0' },
        { machineName: 'FontAwesome', majorVersion: '4', minorVersion: '5' },
      ],
    },
  },
};

export const DEFAULT_PLUGIN_OPTIONS: H5PPluginOptions = {
  pathPrefix: 'mock-prefix',
  serviceMethod: ServiceMethod.LOCAL,
  serviceOptions: {
    local: {
      storageRootPath: 'mock-root-path',
    },
    s3: {
      s3Region: 'mock-s3-region',
      s3Bucket: 'mock-s3-bucket',
      s3AccessKeyId: 'mock-s3-access-key-id',
      s3SecretAccessKey: 'mock-s3-secret-access-key',
    },
  },
};

export const MOCK_ITEM: Item<H5PExtra> = {
  id: 'mock-id',
  name: 'mock-name',
  description: 'mock-description',
  type: 'mock-type',
  path: 'mock-path',
  extra: {
    h5p: {
      contentId: 'mock-content-id',
      h5pFilePath: 'mock-h5p-file-path',
      contentFilePath: 'mock-content-file-path',
    },
  },
  creator: 'mock-creator',
  createdAt: 'mock-created-at',
  updatedAt: 'mock-updated-at',
  settings: {},
};

export const MOCK_MEMBER: Member = {
  name: 'mock-name',
  email: 'mock-email',
  type: 'individual' as MemberType,
  extra: {},
  createdAt: 'mock-created-at',
  updatedAt: 'mock-updated-at',
  id: 'mock-id',
};
