import path from 'path';

import { H5P } from './validation/h5p';

/**
 * Helper to build the root remote path
 */
export const buildRootPath = (pathPrefix: string, contentId: string) =>
  path.join(pathPrefix, contentId);

/**
 * Helper to build the local or remote path of the .h5p file
 */
export const buildH5PPath = (rootPath: string, contentId: string) =>
  path.join(rootPath, `${contentId}.${H5P.H5P_FILE_EXTENSION}`);

/**
 * Helper to build the local or remote path of the h5p content root
 */
export const buildContentPath = (rootPath: string) => path.join(rootPath, 'content');
