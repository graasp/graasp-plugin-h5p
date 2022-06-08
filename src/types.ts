import {
  GraaspLocalFileItemOptions,
  GraaspS3FileItemOptions,
  ServiceMethod,
} from 'graasp-plugin-file';

/**
 * Plugin options
 */
export interface H5PPluginOptions {
  pathPrefix: string;
  serviceMethod: ServiceMethod;
  serviceOptions: { s3: GraaspS3FileItemOptions; local: GraaspLocalFileItemOptions };
}

/**
 * Extra for the H5P item type
 */
export type H5PExtra = {
  h5p: {
    /** relative path from root storage to the uploaded .h5p package */
    h5pFilePath: string;
    /** relative path from root storage to the assets folder */
    contentFilePath: string;
  };
};

/**
 * Item permissions level
 * TODO: use common graasp library
 */
export enum PermissionLevel {
  Read = 'read',
  Write = 'write',
  Admin = 'admin',
}
