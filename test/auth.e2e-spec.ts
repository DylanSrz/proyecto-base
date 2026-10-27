import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('Auth (e2e)', () => {
    let app: INestApplication;
    let token: string;
    const user = { name: 'Test', email: 'test@mail.com', password: 'Clave1234' };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleRef.createNestApplication();
        configureApp(app); // misma configuración que main.ts
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('registra un usuario → 201', async () => {
        const res = await request(app.getHttpServer()).post('/api/auth/register').send(user).expect(201);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.user.password).toBeUndefined();
    });

    it('rechaza email duplicado → 409', () =>
        request(app.getHttpServer()).post('/api/auth/register').send(user).expect(409));

    it('rechaza campos extra como role → 400', () =>
        request(app.getHttpServer())
            .post('/api/auth/register')
            .send({ ...user, email: 'otro@mail.com', role: 'admin' })
            .expect(400));

    it('hace login → 200 con token', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: user.email, password: user.password })
            .expect(200);
        token = res.body.data.accessToken;
    });

    it('GET /api/users/me sin token → 401', () =>
        request(app.getHttpServer()).get('/api/users/me').expect(401));

    it('GET /api/users/me con token → 200', () =>
        request(app.getHttpServer()).get('/api/users/me').set('Authorization', `Bearer ${token}`).expect(200));

    it('GET /api/users con rol user → 403', () =>
        request(app.getHttpServer()).get('/api/users').set('Authorization', `Bearer ${token}`).expect(403));
});