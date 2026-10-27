/**
 * [ES] Interceptor de respuesta (response interceptor). GLOBAL.
 * Un interceptor envuelve la ejecución del controlador: puede actuar ANTES y
 * DESPUÉS. Aquí actúa después: next.handle() devuelve un Observable con lo que
 * retornó el controlador, y map() lo envuelve en el formato uniforme:
 *   { success: true, statusCode, data, timestamp }
 * Solo aplica a respuestas exitosas; los errores los formatea AllExceptionsFilter.
 * [EN] Wraps every successful response in the standard envelope.
 */
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  timestamp: string;
}

/**
 * Global interceptor: wraps every successful response as
 * { success: true, statusCode, data, timestamp } so all endpoints share one format.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    // [ES] Se toma el status real de la respuesta (200, 201...) para incluirlo en el cuerpo.
    const res = ctx.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        statusCode: res.statusCode,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
