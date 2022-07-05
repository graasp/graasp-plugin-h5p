import {
  GraaspLocalFileItemOptions,
  GraaspS3FileItemOptions,
  ServiceMethod,
} from 'graasp-plugin-file';

/**
 * Plugin options
 */
export interface H5PPluginOptions {
  /** storage type */
  serviceMethod: ServiceMethod;
  /** storage options, given storage type */
  serviceOptions: { s3: GraaspS3FileItemOptions; local: GraaspLocalFileItemOptions };
  /** path prefix of H5P content on storage */
  pathPrefix: string;
  /** optional: if serviceMethod is set to 'local', H5P assets and content will be mounted at the following routes (relative to the mount point of this plugin) otherwise defaults are used {@link file://./constants.ts} */
  routes?: {
    assets: string;
    content: string;
  };
}

/**
 * Extra for the H5P item type
 */
export type H5PExtra = {
  h5p: {
    /** storage ID */
    contentId: string;
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

/** Helper type for fastify-static */
export interface FastifyStaticReply {
  setHeader: (key: string, value: string) => void;
}
