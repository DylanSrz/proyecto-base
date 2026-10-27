/**
 * [ES] Filtro global de excepciones (exception filter). @Catch() sin argumentos
 * atrapa TODO error lanzado en guards, pipes, controladores o servicios.
 * Responde siempre: { success: false, statusCode, message, path, timestamp }.
 * - HttpException (NotFound, Conflict, BadRequest, Unauthorized, Forbidden,
 *   errores de ValidationPipe): conserva su status y mensaje.
 * - QueryFailedError de PostgreSQL: traduce códigos conocidos a 4xx para que
 *   los conflictos de negocio/BD NUNCA salgan como 500:
 *     23505 unique_violation        -> 409
 *     23503 foreign_key_violation   -> 400
 *     22P02 invalid_text_representation -> 400
 * - Cualquier otro error -> 500 genérico y se registra en el log (no se filtran
 *   detalles internos al cliente).
 * [EN] Global filter producing one error format and mapping DB errors to 4xx.
 */
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
// [ES] Tabla de códigos de error de PostgreSQL que son culpa del cliente, no del servidor.
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

    // [ES] Errores HTTP lanzados por nosotros (servicios) o por Nest (guards, pipes).
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
    // [ES] Errores de la base de datos. Ej: dos peticiones crean la misma placa a la vez;
    // la segunda choca con el índice UNIQUE (23505) y responde 409, no 500.
    } else if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string }).code;
      const known = code ? PG_ERRORS[code] : undefined;
      if (known) {
        status = known.status;
        message = known.message;
      }
    }

    // [ES] Solo los 500 se registran como error: son los que indican un bug real.
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
