import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Env } from '../../config/env.schema.js';

export const API_KEY_HEADER = 'x-api-key';

// Hashing both sides gives equal-length buffers, as timingSafeEqual requires
const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Guard for external integrations. It is applied per route through
 * @ApiKeyAuth() (which also marks the route as @Public so the JWT guard is
 * skipped) and accepts the request only when the `x-api-key` header matches
 * one of the keys configured in the API_KEYS environment variable.
 * Keys are compared in constant time to avoid timing attacks.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validKeys: Buffer[];

  constructor(config: ConfigService<Env, true>) {
    this.validKeys = config.get('API_KEYS', { infer: true }).map(digest);
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const provided = req.header(API_KEY_HEADER);
    if (!provided) throw new UnauthorizedException('API key is required');

    const providedDigest = digest(provided);
    const isValid = this.validKeys.some((key) =>
      timingSafeEqual(key, providedDigest),
    );
    if (!isValid) throw new UnauthorizedException('API key is invalid');
    return true;
  }
}
