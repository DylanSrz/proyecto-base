/**
 * [ES] Guard de autorización por roles (authorization guard). GLOBAL, corre
 * DESPUÉS de JwtAuthGuard (ya existe request.user).
 * 1. Lee los roles requeridos declarados con @Roles()/@Auth().
 * 2. Si la ruta no declara roles -> basta con estar autenticado.
 * 3. Si el rol del token no está en la lista -> 403 Forbidden.
 * 401 = no sé quién eres (autenticación). 403 = sé quién eres, pero no puedes (autorización).
 * [EN] Global guard comparing the user's role with the declared roles.
 */
import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { Role } from '../enums/role.enum.js';
import type { AuthRequest } from '../interfaces/jwt-payload.interface.js';

/**
 * Global guard that runs after JwtAuthGuard. It reads the roles declared with
 * @Roles()/@Auth() and rejects with 403 when the user's role is not listed.
 * Routes without declared roles only need a valid token.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    // [ES] Sin roles declarados (ej: @Auth() vacío) -> cualquier usuario logueado pasa.
    if (!required?.length) return true;

    const { user } = ctx.switchToHttp().getRequest<AuthRequest>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
    return true;
  }
}
