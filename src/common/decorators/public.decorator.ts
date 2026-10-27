/**
 * [ES] Decorador personalizado @Public() (custom decorator).
 * Cómo funciona: SetMetadata guarda la metadata { isPublic: true } sobre el
 * método o la clase. JwtAuthGuard la lee con Reflector y, si existe, deja pasar
 * la petición SIN token. Se usa en register/login y dentro de @ApiKeyAuth().
 * [EN] Marks a route as public so the global JwtAuthGuard skips it.
 */
import { SetMetadata } from '@nestjs/common';

// [ES] Clave de la metadata; se comparte con JwtAuthGuard para leerla.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
