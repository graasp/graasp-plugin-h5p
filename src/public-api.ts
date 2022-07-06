import path from 'path';

import fastifyStatic from '@fastify/static';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { FileTaskManager, ServiceMethod } from 'graasp-plugin-file';

import { DEFAULT_H5P_ASSETS_ROUTE, DEFAULT_H5P_CONTENT_ROUTE } from './constants';
import { H5PService } from './service';
import { FastifyStaticReply, H5PPluginOptions } from './types';
import { validatePluginOptions } from './utils';

const publicPlugin: FastifyPluginAsync<H5PPluginOptions> = async (fastify, options) => {
  validatePluginOptions(options);
  const { serviceMethod, serviceOptions, pathPrefix, routes } = options;

  const fileTaskManager = new FileTaskManager(serviceOptions, serviceMethod);
  const h5pService = new H5PService(fileTaskManager, pathPrefix);
  fastify.decorate('h5p', h5pService);

  /**
   * In local storage mode, proxy serve the H5P content files
   * In the future, consider refactoring the fileService so that it can be grabbed from the
   * core instance and can serve the files directly (with an option to use or not auth)
   */
  if (serviceMethod === ServiceMethod.LOCAL) {
    /** Helper to set CORS headers policy */
    const setHeaders = (response: FastifyStaticReply) => {
      response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    };

    // hack to serve the "dist" folder of package "h5p-standalone"
    const h5pAssetsRoot = path.dirname(require.resolve('h5p-standalone'));
    fastify.register(fastifyStatic, {
      root: h5pAssetsRoot,
      prefix: routes?.assets ?? DEFAULT_H5P_ASSETS_ROUTE,
      decorateReply: false,
      setHeaders,
    });

    const h5pStorageRoot = path.join(serviceOptions.local.storageRootPath, pathPrefix);
    fastify.register(fastifyStatic, {
      root: h5pStorageRoot,
      prefix: routes?.content ?? DEFAULT_H5P_CONTENT_ROUTE,
      decorateReply: false,
      setHeaders,
    });
  }
};

export default fp(publicPlugin, {
  fastify: '3.x',
  name: 'graasp-plugin-h5p.public',
});
