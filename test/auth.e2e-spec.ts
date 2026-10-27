/**
 * [ES] Tests e2e de autenticación con Supertest: registro, duplicados (409), campos extra (400), login, 401 y 403.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ADMIN_CREDENTIALS,
  createTestApp,
  login,
} from './utils/create-test-app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const user = {
    name: 'Test User',
    email: 'test@fleetcore.com',
    password: 'Secret1234',
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a technician → 201 without exposing the password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(user)
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('TECHNICIAN');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects a duplicated email → 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(user)
      .expect(409);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 409,
      path: '/api/auth/register',
    });
  });

  it('rejects extra fields such as role → 400', () =>
    request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...user, email: 'other@fleetcore.com', role: 'ADMIN' })
      .expect(400));

  it('logs in → 200 with token', async () => {
    token = await login(app, { email: user.email, password: user.password });
    expect(token).toBeDefined();
  });

  it('rejects a wrong password → 401', () =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Wrong1234' })
      .expect(401));

  it('GET /api/users/me without token → 401', () =>
    request(app.getHttpServer()).get('/api/users/me').expect(401));

  it('GET /api/users/me with an invalid token → 401', () =>
    request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401));

  it('GET /api/users/me with token → 200', () =>
    request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200));

  it('GET /api/users as technician → 403', () =>
    request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403));

  it('GET /api/users as the seeded admin → 200', async () => {
    const adminToken = await login(app, ADMIN_CREDENTIALS);
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
