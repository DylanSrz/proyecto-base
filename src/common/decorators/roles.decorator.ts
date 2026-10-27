/**
 * [ES] Decorador personalizado @Roles(...roles).
 * SetMetadata guarda la lista de roles permitidos bajo la clave 'roles'.
 * RolesGuard la lee con Reflector.getAllAndOverride() y compara con el rol que
 * viene dentro del JWT (request.user.role). Si no coincide -> 403 Forbidden.
 * Ejemplo: @Roles(Role.ADMIN)
 * [EN] Declares which roles may call a route; enforced by RolesGuard.
 */
import { SetMetadata } from '@nestjs/common';
import type { Role } from '../enums/role.enum.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
