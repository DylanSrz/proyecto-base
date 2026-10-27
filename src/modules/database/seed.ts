import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { SeedService } from './seed.service.js';

/** Entry point of `npm run seed`: boots the app context (no HTTP) and seeds. */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    await app.get(SeedService).run();
  } finally {
    await app.close();
  }
}

seed().catch((error: unknown) => {
  Logger.error(error, 'Seed');
  process.exit(1);
});
