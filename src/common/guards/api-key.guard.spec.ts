/**
 * [ES] Tests del ApiKeyGuard: key válida pasa, sin key o key incorrecta -> 401. ConfigService y ExecutionContext son objetos falsos mínimos.
 */
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../config/env.schema.js';
import { ApiKeyGuard } from './api-key.guard.js';

const config = {
  get: () => ['key-partner-1', 'key-partner-2'],
} as unknown as ConfigService<Env, true>;

const contextWithKey = (key?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => (name === 'x-api-key' ? key : undefined),
      }),
    }),
  }) as unknown as ExecutionContext;

describe('ApiKeyGuard', () => {
  const guard = new ApiKeyGuard(config);

  it('allows a configured key', () => {
    expect(guard.canActivate(contextWithKey('key-partner-2'))).toBe(true);
  });

  it('rejects a missing key', () => {
    expect(() => guard.canActivate(contextWithKey())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong key', () => {
    expect(() => guard.canActivate(contextWithKey('wrong-key'))).toThrow(
      UnauthorizedException,
    );
  });
});
