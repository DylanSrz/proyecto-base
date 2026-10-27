/**
 * [ES] Punto de entrada de la aplicación (entry point).
 * 1. NestFactory.create(AppModule) construye el contenedor de inyección de
 *    dependencias (DI container) con todos los módulos.
 * 2. configureApp() aplica la configuración global (prefijo /api, pipes,
 *    interceptores, filtro). Es la MISMA función que usan los tests e2e, así
 *    los tests prueban exactamente lo que corre en producción.
 * 3. setupSwagger() publica la documentación en /docs.
 * 4. Lee PORT ya validado por Zod y empieza a escuchar.
 * [EN] Application entry point.
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, setupSwagger } from './app.setup.js';
import type { Env } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);

  // [ES] ConfigService<Env, true> + { infer: true } da tipado fuerte: PORT es number.
  const port = app
    .get<ConfigService<Env, true>>(ConfigService)
    .get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(
    `API http://localhost:${port}/api | Docs http://localhost:${port}/docs`,
    'Bootstrap',
  );
}
// [ES] Top-level await: posible porque el proyecto es ESM ("type": "module").
await bootstrap();
