import path from 'path';

import { H5P } from './validation/h5p';

/**
 * Helper to build the root remote path for a specific H5P
 * @note
 * We want the following path structure: pathPrefix/pathPrefix/contentId
 * This allows serving pathPrefix as root URL, while keeping the routes
 * matched to the physical paths of the files
 * @see buildRootRoute
 */
export const buildRootPath = (pathPrefix: string, contentId: string) =>
  path.join(pathPrefix, pathPrefix, contentId);

/**
 * Helper to build the route for a specific H5P
 * @note
 * We want the following route structure: pathPrefix/contentId
 * @see buildRootPath
 */
export const buildRootRoute = (pathPrefix: string, contentId: string) =>
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
