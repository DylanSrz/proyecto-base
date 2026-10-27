/**
 * [ES] Tests del RolesGuard: sin roles declarados pasa, rol permitido pasa, rol no permitido -> 403.
 */
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '../enums/role.enum.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);
  const context = (role?: Role) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  it('allows any authenticated user when no roles are declared', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context(Role.TECHNICIAN))).toBe(true);
  });

  it('allows a user whose role is declared', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.TECHNICIAN]);
    expect(guard.canActivate(context(Role.TECHNICIAN))).toBe(true);
  });

  it('rejects a user without the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(() => guard.canActivate(context(Role.TECHNICIAN))).toThrow(
      ForbiddenException,
    );
  });
});
