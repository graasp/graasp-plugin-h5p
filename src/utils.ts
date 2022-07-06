import path from 'path';

import { H5PPluginOptions } from './types';
import { H5P } from './validation/h5p';

/**
 * Helper to check the plugin options
 * Throws if an error is encountered
 */
export function validatePluginOptions(options: H5PPluginOptions) {
  const { pathPrefix, routes } = options;

  if (!pathPrefix) {
    throw new Error('H5P path prefix environment variable is not defined!');
  }

  if (pathPrefix.startsWith('/')) {
    throw new Error('H5P path prefix should not start with a "/"!');
  }

  if (routes) {
    Object.keys(routes).forEach((route) => {
      if (!route.startsWith('/') || !route.endsWith('/')) {
        throw new Error("H5P routes must start and end with a forward slash ('/') !");
      }
    });
  }
}

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
