/**
 * [ES] Decorador de parámetro @CurrentUser() (param decorator).
 * createParamDecorator crea un decorador que extrae datos del request:
 * JwtAuthGuard ya dejó el payload del token en request.user, y este decorador
 * lo inyecta en el parámetro del controlador.
 * - @CurrentUser()         -> el payload completo { sub, email, role }
 * - @CurrentUser('sub')    -> solo el id del usuario
 * - @CurrentUser('role')   -> solo el rol
 * Así el controlador no toca el objeto Request directamente (código más limpio).
 * [EN] Injects the authenticated user (or one of its fields) into a handler.
 */
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type {
  AuthRequest,
  JwtPayload,
} from '../interfaces/jwt-payload.interface.js';

export const CurrentUser = createParamDecorator(
  // [ES] field = argumento del decorador; ctx = contexto de ejecución (da acceso al request).
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const { user } = ctx.switchToHttp().getRequest<AuthRequest>();
    return field ? user?.[field] : user;
  },
);
