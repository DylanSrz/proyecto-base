/**
 * [ES] Módulo raíz (root module): une toda la aplicación.
 * - ConfigModule: carga .env (o .env.test en tests) y lo VALIDA con Zod; si falta
 *   una variable la app no arranca (fail fast).
 * - TypeOrmModule: conexión a PostgreSQL. autoLoadEntities registra las entidades
 *   declaradas con TypeOrmModule.forFeature() en cada módulo.
 * - Módulos de negocio: users, auth, vehicles, workshops, mechanics,
 *   maintenances, integrations, database (seed).
 * - APP_GUARD: registra guards GLOBALES. Se ejecutan en el orden declarado:
 *   primero JwtAuthGuard (autenticación: ¿quién eres?) y luego RolesGuard
 *   (autorización: ¿puedes hacer esto?).
 * - configure(): aplica el LoggerMiddleware a todas las rutas.
 * [EN] Root module wiring config, database, feature modules and global guards.
 */
import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { envSchema, type Env } from './config/env.schema.js';
import { DatabaseModule } from './modules/database/database.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { MaintenancesModule } from './modules/maintenances/maintenances.module.js';
import { MechanicsModule } from './modules/mechanics/mechanics.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { WorkshopsModule } from './modules/workshops/workshops.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // [ES] En tests (NODE_ENV=test) usa .env.test, que apunta a la BD de pruebas.
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      // [ES] Si Zod falla, lanza error y la app no inicia: configuración inválida = no arranca.
      validate: (config) => envSchema.parse(config),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      // [ES] forRootAsync + useFactory: la conexión se arma DESPUÉS de cargar y validar el .env.
      useFactory: (config: ConfigService<Env, true>) => ({
        type: 'postgres',
        host: config.get('DB_HOST', { infer: true }),
        port: config.get('DB_PORT', { infer: true }),
        username: config.get('DB_USER', { infer: true }),
        password: config.get('DB_PASSWORD', { infer: true }),
        database: config.get('DB_NAME', { infer: true }),
        // [ES] Registra automáticamente las entidades de cada TypeOrmModule.forFeature([...]).
        autoLoadEntities: true,
        // [ES] synchronize crea/ajusta tablas según las entidades. Cómodo en desarrollo;
        // en producción lo correcto serían migraciones (riesgo: puede alterar datos).
        synchronize: config.get('DB_SYNC', { infer: true }),
        // [ES] Solo en tests: borra el esquema al iniciar, cada suite e2e empieza con BD limpia.
        dropSchema: config.get('NODE_ENV', { infer: true }) === 'test',
      }),
    }),
    UsersModule,
    AuthModule,
    VehiclesModule,
    WorkshopsModule,
    MechanicsModule,
    MaintenancesModule,
    IntegrationsModule,
    DatabaseModule,
  ],
  providers: [
    // [ES] Guards globales: TODA ruta pasa por ellos. Orden = orden de este arreglo.
    // Una ruta se libera del JWT con @Public(); los roles se declaran con @Roles()/@Auth().
    // Global guards, in order: JwtAuthGuard authenticates, RolesGuard authorizes
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // [ES] El middleware corre ANTES que los guards: registra método, URL, status y duración.
    consumer.apply(LoggerMiddleware).forRoutes('{*splat}');
  }
}
