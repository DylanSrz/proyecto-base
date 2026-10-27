/**
 * [ES] Módulo de autenticación. Registra JwtModule como GLOBAL (global: true)
 * para que JwtAuthGuard (en common) pueda inyectar JwtService sin importar este
 * módulo. registerAsync + ConfigService: el secreto y la expiración salen del
 * .env ya validado.
 * [EN] Auth module; registers JwtModule globally with secret/expiry from env.
 */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
