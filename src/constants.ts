import { H5P } from './validation/h5p';

export const MAX_FILE_SIZE = 1024 * 1024 * 50; // 50 MB
export const MAX_NON_FILE_FIELDS = 0;
export const MAX_FILES = 1;

export const H5P_ITEM_TYPE = 'h5p';
export const H5P_FILE_MIME_TYPE = 'application/zip';
export const H5P_FILE_DOT_EXTENSION = `.${H5P.H5P_FILE_EXTENSION}`;

export const DEFAULT_MIME_TYPE = 'application/octet-stream';

export const DEFAULT_H5P_CONTENT_ROUTE = '/h5p-content/';
export const DEFAULT_H5P_ASSETS_ROUTE = '/h5p-assets/';

export const PLUGIN_NAME = 'graasp-plugin-h5p';
export const PUBLIC_PLUGIN_NAME = 'graasp-plugin-h5p-public';
