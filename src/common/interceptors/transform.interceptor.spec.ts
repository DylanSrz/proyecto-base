/**
 * [ES] Test del interceptor: of() crea un Observable con lo que "retornó el controlador" y lastValueFrom lo resuelve.
 */
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { TransformInterceptor } from './transform.interceptor.js';

describe('TransformInterceptor', () => {
  it('wraps the handler result in the standard success format', async () => {
    const context = {
      switchToHttp: () => ({ getResponse: () => ({ statusCode: 201 }) }),
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of({ id: 'v1' }) };

    const result = await lastValueFrom(
      new TransformInterceptor().intercept(context, next),
    );

    expect(result).toEqual({
      success: true,
      statusCode: 201,
      data: { id: 'v1' },
      timestamp: expect.any(String),
    });
  });
});
