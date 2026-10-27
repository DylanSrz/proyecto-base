/**
 * [ES] Decorador compuesto @Auth(...roles) (decorator composition).
 * applyDecorators() agrupa varios decoradores en uno solo:
 * - Roles(...roles): metadata de roles para RolesGuard.
 * - ApiBearerAuth(): Swagger muestra el candado y envía el Bearer token.
 * - ApiUnauthorizedResponse / ApiForbiddenResponse: documentan 401 y 403.
 * @Auth() sin roles = cualquier usuario autenticado.
 * @Auth(Role.ADMIN) = solo administradores.
 * [EN] Composes role metadata and Swagger auth docs in one decorator.
 */
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Role } from '../enums/role.enum.js';
import { Roles } from './roles.decorator.js';

export const Auth = (...roles: Role[]) =>
  applyDecorators(
    Roles(...roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token' }),
    ApiForbiddenResponse({ description: 'Role not allowed' }),
  );
