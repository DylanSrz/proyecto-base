/**
 * [ES] Configuración global de la app (global setup). La usan main.ts Y los tests
 * e2e, para que ambos se comporten igual.
 *
 * Orden de una petición en NestJS (request lifecycle):
 *   Middleware -> Guards -> Interceptors (antes) -> Pipes -> Controller -> Service
 *   -> Interceptors (después) -> respuesta.
 *   Si algo lanza una excepción en cualquier punto -> Exception Filter.
 * [EN] Global app configuration shared by main.ts and the e2e tests.
 */
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

/**
 * [ES] Aplica prefijo, CORS, helmet, ValidationPipe, interceptores y filtro globales.
 * @param app instancia de la aplicación Nest.
 */
export function configureApp(app: INestApplication) {
  // [ES] Todas las rutas quedan bajo /api (ej: /api/vehicles).
  app.setGlobalPrefix('api');
  // [ES] CORS: permite que un frontend de otro dominio consuma la API.
  app.enableCors();
  // [ES] helmet agrega cabeceras HTTP de seguridad (CSP, X-Frame-Options, etc.).
  app.use(helmet()); // if Swagger renders blank: helmet({ contentSecurityPolicy: false })

  // [ES] ValidationPipe (Pipe global): valida y transforma el body/query/params contra
  // las clases DTO usando class-validator y class-transformer. Si falla -> 400.
  app.useGlobalPipes(
    new ValidationPipe({
      // [ES] whitelist: elimina propiedades que el DTO no declara.
      whitelist: true, // strips properties that are not in the DTO
      // [ES] ...y si llegan propiedades extra (ej: "role" en el registro) responde 400.
      forbidNonWhitelisted: true, // and answers 400 when they are sent
      // [ES] transform: el body llega como INSTANCIA del DTO (no objeto plano).
      transform: true, // turns the body into a DTO instance
      // [ES] Conversión implícita según el tipo TS: "5" del query string -> 5 (number).
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // [ES] Interceptores globales. A la SALIDA se ejecutan en orden inverso:
  // 1) ClassSerializerInterceptor quita campos @Exclude (ej: password).
  // 2) TransformInterceptor envuelve en { success, statusCode, data, timestamp }.
  // On the way out the last one runs first: ClassSerializer removes @Exclude
  // fields and then TransformInterceptor wraps the result.
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // [ES] Filtro global de excepciones: todo error sale con el mismo formato JSON.
  app.useGlobalFilters(new AllExceptionsFilter());
}

/**
 * [ES] Swagger / OpenAPI en /docs. Declara los dos esquemas de seguridad:
 * - bearer: el JWT (botón Authorize -> Bearer token).
 * - x-api-key: la API key de integraciones externas.
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('FleetCore API')
    .setVersion('1.0')
    .setDescription('Fleet maintenance management API')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
