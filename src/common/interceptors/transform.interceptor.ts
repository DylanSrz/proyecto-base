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
