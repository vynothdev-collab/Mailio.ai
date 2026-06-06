import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MulterError } from 'multer';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof MulterError) {
      const msg =
        exception.code === 'LIMIT_FILE_SIZE'
          ? 'File too large. Maximum size is 5 MB per file.'
          : exception.code === 'LIMIT_FILE_COUNT'
            ? 'Too many files. Maximum is 5 files per request.'
            : exception.code === 'LIMIT_UNEXPECTED_FILE'
              ? 'Unexpected file field in the request.'
              : exception.message;
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: msg,
      });
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      const err = exception as Error & {
        code?: string;
        detail?: string;
        query?: string;
        parameters?: unknown[];
      };
      this.logger.error(
        `${request.method} ${request.url}\n` +
          `  name:   ${err?.name ?? 'unknown'}\n` +
          `  msg:    ${err?.message ?? exception}\n` +
          (err?.code ? `  code:   ${err.code}\n` : '') +
          (err?.detail ? `  detail: ${err.detail}\n` : '') +
          (err?.query ? `  query:  ${err.query}\n` : ''),
        err?.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'object' && 'message' in message
          ? (message as { message: string }).message
          : message,
    });
  }
}
