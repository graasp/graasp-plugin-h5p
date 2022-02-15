import { Writable, Readable } from 'stream';
import path from 'path';
import { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import fastifyMultipart, { Multipart } from 'fastify-multipart';
import fastifyCors from 'fastify-cors';
import fastifyFormBody from 'fastify-formbody';
import {
  fs as h5pfs,
  fsImplementations,
  H5PConfig,
  H5PAjaxEndpoint,
  IContentStorage,
} from '@lumieducation/h5p-server';

import UrlGenerator from './urlGenerator';
import MemberForH5P from './MemberForH5P';

type H5PPluginOptions = {
  rootPath?: string;
  host: string
};

class H5PFile {
  data?: Buffer;
  mimetype: string;
  name: string;
  size: number;
  tempFilePath?: string;

  constructor(fileObject: Multipart, file: Buffer) {
    const { filename, mimetype } = fileObject;
    console.log('filename: ', filename);
    const size = Buffer.byteLength(file);
    this.data = file;
    this.mimetype = mimetype;
    this.name = filename;
    this.size = size;
  }
}

const plugin: FastifyPluginAsync<H5PPluginOptions> = async (fastify, options) => {
  const { rootPath = '/workspace/src/plugins/h5p', host } = options;

  // add CORS support
  if (fastify.corsPluginOptions) {
    fastify.register(fastifyCors, fastify.corsPluginOptions);
  }

  fastify.register(fastifyFormBody);

  fastify.register(fastifyMultipart, {
    limits: {
      // fieldNameSize: 0,             // Max field name size in bytes (Default: 100 bytes).
      // fieldSize: 1000000,           // Max field value size in bytes (Default: 1MB).
      fields: 0, // Max number of non-file fields (Default: Infinity).
      fileSize: 10, // For multipart forms, the max file size (Default: Infinity).
      files: 5, // Max number of file fields (Default: Infinity).
      // headerPairs: 2000             // Max number of header key=>value pairs (Default: 2000 - same as node's http).
    },
  });

  // const temporaryStorage = new S3TemporaryFileStorage(
  //   initS3({
  //     accessKeyId: 's3accesskey',
  //     secretAccessKey: 's3accesssecret',
  //     endpoint: 'http://127.0.0.1:6379',
  //     s3ForcePathStyle: true,
  //     signatureVersion: 'v4'
  //   }),
  //   { s3Bucket: 'graasp' }
  // );

  const config = await new H5PConfig(
    new fsImplementations.JsonStorage(
      path.join(rootPath, './config.json'), // the path on the local disc where the configuration file is stored
    ),
  ).load();

  const h5pEditor = h5pfs(
    config,
    path.join(rootPath, './libraries'), // the path on the local disc where libraries  should be stored
    path.join(rootPath, './temporary-storage'), // the path on the local disc where temporary files (uploads) should  be stored
    path.join(rootPath, './content'), // the path on the local disc where content is stored
    {} as unknown as IContentStorage,
    () => {
      return 'translation!';
    }, // as ITranslationCallback,
    new UrlGenerator(host, config),
  );

  h5pEditor.setRenderer((model) => model);

  const ajaxEndpoint = new H5PAjaxEndpoint(h5pEditor);

  /**
   * Retrieves a range that was specified in the HTTP request headers. Returns
   * undefined if no range was specified.
   */
  const getRange =
    (req: FastifyRequest) =>
      (fileSize: number): { end: number; start: number } => {
        // const range = req.range(fileSize);
        // if (range) {
        //   if (range === -2) {
        //     throw new H5pError('malformed-request', {}, 400);
        //   }
        //   if (range === -1) {
        //     throw new H5pError('unsatisfiable-range', {}, 416);
        //   }
        //   if (range.length > 1) {
        //     throw new H5pError('multipart-ranges-unsupported', {}, 400);
        //   }

        //   return range[0];
        // }
        // return undefined;
        return { end: 10, start: 0 };
      };

  /**
   * Pipes the contents of the file to the request object and sets the
   * 206 status code and all necessary headers.
   * @param mimetype the mimetype of the file
   * @param readStream a readable stream of the file (at the start position)
   * @param response the Express response object (a writable stream)
   * @param totalLength the total file size of the file
   * @param start the start of the range
   * @param end the end of the range
   */
  const pipeStreamToPartialResponse = (
    mimetype: string,
    readStream: Readable,
    response: FastifyReply,
    totalLength: number,
    start: number,
    end: number,
  ): void => {
    response.headers({
      'Content-Type': mimetype,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${totalLength}`,
    });
    response.status(206);

    readStream.on('error', (err) => {
      response.status(404);
    });
    response.send(readStream);
  };

  /**
   * Pipes the contents of the file to the request object and sets the
   * 200 status code and all necessary headers to indicate support for ranges.
   * @param mimetype the mimetype of the file
   * @param readStream a readable stream of the file (at the start position)
   * @param response the Express response object (a writable stream)
   * @param contentLength the total file size of the file
   */
  const pipeStreamToResponse = (
    mimetype: string,
    readStream: Readable,
    response: FastifyReply,
    contentLength: number,
    additionalHeaders?: { [key: string]: string },
  ): void => {
    response
      .headers({
        ...(additionalHeaders || {}),
        'Content-Type': mimetype,
        'Content-Length': contentLength,
        'Accept-Ranges': 'bytes',
      })
      .status(200);

    readStream.on('error', (err) => {
      return response.status(404);
    });
    response.send(readStream);
  };

  fastify.get<{
    Querystring: {
      action: string;
      machineName: string;
      majorVersion: string;
      minorVersion: string;
      language: string;
    };
  }>('/ajax', async (req, reply) => {
    console.log(
      '------',
      req.query.action,
      req.query.machineName,
      req.query.majorVersion,
      req.query.minorVersion,
      req.query.language,
    );
    const result = await ajaxEndpoint.getAjax(
      req.query.action,
      req.query.machineName,
      req.query.majorVersion,
      req.query.minorVersion,
      req.query.language,
      new MemberForH5P(req.member),
    );
    reply.status(200).send(result);
  });

  fastify.get<{ Params: { contentId: string; filename: string } }>(
    '/content/:contentId/:filename',
    async (req, reply) => {
      // depends on content storage: files in FileContentStorage can also be served statically
      const { contentId, filename } = req.params;
      const { mimetype, stream, stats, range } = await ajaxEndpoint.getContentFile(
        contentId,
        filename,
        new MemberForH5P(req.member),
        getRange(req),
      );
      if (range) {
        pipeStreamToPartialResponse(filename, stream, reply, stats.size, range.start, range.end);
      } else {
        pipeStreamToResponse(mimetype, stream, reply, stats.size);
      }
    },
  );

  fastify.get('/libraries', async () => {
    console.log('get libraries');
    return [];
  });

  fastify.get<{ Params: { uberName: string; file: string } }>(
    '/libraries/:ubername/:file',
    async (req, reply) => {
      // depends on library storage: files in FileLibraryStorage can also be served statically
      const { uberName, file } = req.params;
      console.log('get libraries', uberName, file);
      const { mimetype, stream, stats } = await ajaxEndpoint.getLibraryFile(uberName, file);

      pipeStreamToResponse(mimetype, stream, reply, stats.size, {
        'Cache-Control': 'public, max-age=31536000',
      });
    },
  );

  fastify.get<{ Params: { file: string } }>('/temp-files/:file', async (req, reply) => {
    const { file } = req.params;
    const { mimetype, stream, stats, range } = await ajaxEndpoint.getTemporaryFile(
      file,
      new MemberForH5P(req.member),
      getRange(req),
    );
    if (range) {
      pipeStreamToPartialResponse(file, stream, reply, stats.size, range.start, range.end);
    } else {
      pipeStreamToResponse(mimetype, stream, reply, stats.size);
    }
  });

  /**
   * POST /ajax
   * Post various things through the Ajax endpoint
   * Don't be confused by the fact that many of the requests dealt with here are not
   * really POST requests, but look more like GET requests. This is simply how the H5P
   * client works and we can't change it.
   */
  fastify.post<{ Querystring: { action: string; language: string; id: string; hubId: string } }>(
    '/ajax',
    async (req, reply) => {
      const files = req.files();

      for await (const fileObject of files) {
        const file = await fileObject.toBuffer();

        console.log(file);
        const result = await ajaxEndpoint.postAjax(
          req.query.action,
          req.body as any,
          (req.query?.language as string) ?? (req as any).language,
          new MemberForH5P(req.member),
          new H5PFile(fileObject, file),
          req.query.id as string,
          (stringId, _replacements) => stringId,
          new H5PFile(fileObject, file), //.h5p??
          req.query.hubId as string,
        );

        // suppose only one file
        return reply.status(200).send(result);
      }
    },
  );

  fastify.get<{ Params: { contentId: string } }>('/params/:contentId', async (req, reply) => {
    const { contentId } = req.params;
    // if you use the default renderer script of the editor
    const result = await ajaxEndpoint.getContentParameters(contentId, new MemberForH5P(req.member));
    reply.status(200);
    return result;
  });
  fastify.get<{ Params: { contentId: string } }>('/download/:contentId', async (req, reply) => {
    const { contentId } = req.params;
    const pipe = new Writable(); // some pipestream to save the data to
    // set filename for the package with .h5p extension
    reply.header('Content-disposition', `attachment; filename=${contentId}.h5p`);
    await ajaxEndpoint.getDownload(contentId, new MemberForH5P(req.member), pipe);
    return reply.send(pipe);
  });

  fastify.get<{ Params: { contentId: string; lang: string } }>(
    '/editor/:lang/:contentId',
    async (req) => {
      const { contentId, lang } = req.params;
      return h5pEditor.render(contentId, lang, new MemberForH5P(req.member));
    },
  );
};

export default plugin;
