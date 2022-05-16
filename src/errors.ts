import { GraaspError, GraaspErrorDetails } from 'graasp';
import { StatusCodes } from 'http-status-codes';

export class GraaspImportH5PError implements GraaspError {
  data?: unknown;
  origin: 'plugin' | string;
  code: string;
  name: string;
  statusCode?: number;
  message: string;

  constructor({ code, statusCode, message }: GraaspErrorDetails, data?: unknown) {
    this.name = code;
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
    this.origin = 'plugin';
  }
}

export class InvalidH5PFileError extends GraaspImportH5PError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GPH5PERR001',
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'File is not a valid H5P package',
      },
      data,
    );
  }
}
