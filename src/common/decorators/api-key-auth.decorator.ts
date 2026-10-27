/**
 * [ES] Decorador compuesto @ApiKeyAuth() para integraciones externas.
 * - Public(): hace que el JwtAuthGuard GLOBAL deje pasar la ruta (si no, exigiría JWT).
 * - UseGuards(ApiKeyGuard): aplica el guard de API key SOLO a esta ruta/controlador.
 * - ApiSecurity('x-api-key'): Swagger pide la API key en vez del token.
 * Diferencia clave: el JWT identifica a un USUARIO (con rol); la API key
 * identifica a un SISTEMA externo (sin usuario ni rol).
 * [EN] Swaps JWT auth for x-api-key auth on a route.
 */
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiKeyGuard, API_KEY_HEADER } from '../guards/api-key.guard.js';
import { Public } from './public.decorator.js';

/**
 * Protects a route with the x-api-key header instead of a JWT.
 * @Public() skips the global JwtAuthGuard and ApiKeyGuard validates the key.
 */
export const ApiKeyAuth = () =>
  applyDecorators(
    Public(),
    UseGuards(ApiKeyGuard),
    ApiSecurity(API_KEY_HEADER),
    ApiUnauthorizedResponse({ description: 'Missing or invalid API key' }),
  );
