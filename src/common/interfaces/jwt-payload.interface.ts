/**
 * [ES] Contenido del JWT (payload). sub = id del usuario (estándar JWT "subject").
 * AuthRequest = Request de Express con user ya adjuntado por JwtAuthGuard.
 * Es una interface (solo tipos), por eso se importa con "import type".
 * [EN] JWT payload shape and the request type carrying it.
 */
import type { Request } from 'express';
import type { Role } from '../enums/role.enum.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export type AuthRequest = Request & { user: JwtPayload };
