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

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.enableCors();
  app.use(helmet()); // si Swagger se ve en blanco: helmet({ contentSecurityPolicy: false })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // borra propiedades que no están en el DTO
      forbidNonWhitelisted: true, // y si llegan, responde 400
      transform: true, // convierte el body en instancia del DTO
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // En la respuesta actúa primero el último: ClassSerializer quita los @Exclude
  // y después TransformInterceptor envuelve el resultado.
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API Prueba de desempeño')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
