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
  app.use(helmet()); // if Swagger renders blank: helmet({ contentSecurityPolicy: false })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips properties that are not in the DTO
      forbidNonWhitelisted: true, // and answers 400 when they are sent
      transform: true, // turns the body into a DTO instance
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // On the way out the last one runs first: ClassSerializer removes @Exclude
  // fields and then TransformInterceptor wraps the result.
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}

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
