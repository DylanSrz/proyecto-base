/**
 * [ES] Guard de autenticación JWT (authentication guard). Es GLOBAL (APP_GUARD).
 * Un Guard decide si la petición puede continuar (canActivate -> true/false o
 * excepción). Corre después del middleware y ANTES de pipes y controlador.
 * Flujo:
 * 1. Si la ruta tiene @Public() -> pasa sin token.
 * 2. Lee el header Authorization: "Bearer <token>". Si falta -> 401.
 * 3. Verifica firma y expiración con JwtService.verifyAsync. Si falla -> 401.
 * 4. Guarda el payload { sub, email, role } en request.user para RolesGuard y
 *    para @CurrentUser().
 * [EN] Global guard validating the Bearer token and attaching the payload.
 */
import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type {
  AuthRequest,
  JwtPayload,
} from '../interfaces/jwt-payload.interface.js';

/**
 * Global guard (registered with APP_GUARD): every route requires a valid
 * Bearer token unless it is marked with @Public().
 * On success the decoded payload is attached to `request.user`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // [ES] getAllAndOverride busca la metadata primero en el método y luego en la clase
    // (el método tiene prioridad).
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    // [ES] "Bearer abc.def.ghi" -> ['Bearer', 'abc.def.ghi'].
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Access token is required');

    try {
      // [ES] verifyAsync valida firma (JWT_SECRET) y expiración (exp). Token alterado o vencido -> catch -> 401.
      req.user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired');
    }
    return true;
  }
}
