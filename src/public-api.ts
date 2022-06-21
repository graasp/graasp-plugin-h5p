import path from 'path';

import fastifyStatic from '@fastify/static';
import { FastifyPluginAsync } from 'fastify';

import { ServiceMethod } from 'graasp-plugin-file';

import { H5PPluginOptions } from './types';

const publicPlugin: FastifyPluginAsync<H5PPluginOptions> = async (fastify, options) => {
  const { serviceMethod, serviceOptions, pathPrefix } = options;

  /**
   * In local storage mode, proxy serve the H5P content files
   * In the future, consider refactoring the fileService so that it can be grabbed from the
   * core instance and can serve the files directly (with an option to use or not auth)
   */
  if (serviceMethod === ServiceMethod.LOCAL) {
    const h5pStorageRoot = path.join(serviceOptions.local.storageRootPath, pathPrefix);
    fastify.register(fastifyStatic, {
      root: h5pStorageRoot,
      prefix: `/${pathPrefix}`,
      decorateReply: false,
      setHeaders: (response) => {
        response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
      },
    });
  }
};

export default publicPlugin;
