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
