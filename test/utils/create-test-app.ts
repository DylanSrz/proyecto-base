/**
 * [ES] Utilidades e2e. createTestApp levanta la app COMPLETA (AppModule real, BD de
 * pruebas) con la misma configuración global que main.ts (configureApp), así el
 * test pasa por guards, pipes, interceptores y filtro reales.
 * [EN] e2e helpers.
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

export const ADMIN_CREDENTIALS = {
  email: 'admin@fleetcore.com',
  password: 'Admin12345',
};

/** Boots the full application with the same global config as main.ts. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export async function login(
  app: INestApplication,
  credentials: { email: string; password: string },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send(credentials)
    .expect(200);
  return res.body.data.accessToken as string;
}
