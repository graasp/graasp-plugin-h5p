/**
 * Extra for the H5P item type
 */
export type H5PExtra = {
  /** storage type is defined by service method at runtime */
  [storageType: string]: {
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
