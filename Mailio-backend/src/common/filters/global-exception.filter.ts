import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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
