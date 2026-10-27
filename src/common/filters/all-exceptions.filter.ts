import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

// PostgreSQL error codes that are client errors, not server failures
const PG_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  '23505': { status: HttpStatus.CONFLICT, message: 'Record already exists' },
  '23503': {
    status: HttpStatus.BAD_REQUEST,
    message: 'A referenced record does not exist',
  },
  '22P02': {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid value for one of the fields',
  },
};

/**
 * Global exception filter: every error leaves the API with the same shape
 * { success: false, statusCode, message, path, timestamp }.
 * - HttpException keeps its status and message (validation, auth, 404, 409...).
 * - Known database errors (unique, foreign key, invalid input) become 4xx,
 *   so business conflicts never surface as HTTP 500.
 * - Anything else is logged and answered as a generic 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
    } else if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string }).code;
      const known = code ? PG_ERRORS[code] : undefined;
      if (known) {
        status = known.status;
        message = known.message;
      }
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR)
      this.logger.error(exception);

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
