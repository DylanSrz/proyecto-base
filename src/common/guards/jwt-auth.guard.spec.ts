import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const jwt = { verifyAsync: vi.fn() };
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new JwtAuthGuard(
    jwt as unknown as JwtService,
    reflector as unknown as Reflector,
  );
  let request: { headers: { authorization?: string }; user?: unknown };
  const context = () =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    request = { headers: {} };
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it('lets @Public routes through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it('rejects a request without token', async () => {
    await expect(guard.canActivate(context())).rejects.toThrow(
      'Access token is required',
    );
  });

  it('rejects an invalid or expired token', async () => {
    request.headers.authorization = 'Bearer bad';
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(guard.canActivate(context())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the payload of a valid token to the request', async () => {
    request.headers.authorization = 'Bearer good';
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', role: 'ADMIN' });
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(request.user).toEqual({ sub: 'u1', role: 'ADMIN' });
  });
});
