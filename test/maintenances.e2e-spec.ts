/**
 * [ES] Test e2e del flujo principal, de punta a punta contra la API real:
 * 1. Setup por API: talleres, mecánico vinculado al técnico, vehículos.
 * 2. Autorización: 401 sin token, 403 por rol, 400 por UUID inválido.
 * 3. Reglas de agenda: vehículo ocupado, cruce de horarios, 9:00 permitido...
 * 4. Flujo del técnico: iniciar, completar, transiciones inválidas, auditoría.
 * 5. Integración con x-api-key: sin key, key incorrecta, JWT no sirve, key válida.
 * Los tests de un describe comparten estado (ids) y corren en orden.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ADMIN_CREDENTIALS,
  createTestApp,
  login,
} from './utils/create-test-app.js';

describe('Fleet maintenance flow (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let techToken: string;
  let outsiderToken: string;
  let techUserId: string;
  let workshopId: string;
  let inactiveWorkshopId: string;
  let mechanicId: string;
  let vehicleId: string;
  let secondVehicleId: string;
  let firstMaintenanceId: string;
  let secondMaintenanceId: string;

  const http = () => request(app.getHttpServer());
  const asAdmin = (req: request.Test) =>
    req.set('Authorization', `Bearer ${adminToken}`);
  const asTech = (req: request.Test) =>
    req.set('Authorization', `Bearer ${techToken}`);

  const schedule = (start: string, end: string, overrides = {}) => ({
    type: 'PREVENTIVE',
    description: 'Oil and filter change',
    mileage: 45000,
    scheduledAt: start,
    estimatedEndAt: end,
    vehicleId,
    mechanicId,
    workshopId,
    ...overrides,
  });

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, ADMIN_CREDENTIALS);

    const tech = await http()
      .post('/api/auth/register')
      .send({
        name: 'Laura Gomez',
        email: 'laura@fleetcore.com',
        password: 'Secret1234',
      })
      .expect(201);
    techToken = tech.body.data.accessToken;
    techUserId = tech.body.data.user.id;

    const outsider = await http()
      .post('/api/auth/register')
      .send({
        name: 'Other Tech',
        email: 'other@fleetcore.com',
        password: 'Secret1234',
      })
      .expect(201);
    outsiderToken = outsider.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('setup through the API', () => {
    it('admin registers workshops', async () => {
      const res = await asAdmin(http().post('/api/workshops'))
        .send({ name: 'North Workshop', address: '45th Street' })
        .expect(201);
      workshopId = res.body.data.id;
      expect(res.body.data.status).toBe('ACTIVE');

      const other = await asAdmin(http().post('/api/workshops'))
        .send({ name: 'Downtown Workshop', address: '10th Avenue' })
        .expect(201);
      inactiveWorkshopId = other.body.data.id;
      await asAdmin(
        http().patch(`/api/workshops/${inactiveWorkshopId}/deactivate`),
      ).expect(200);
    });

    it('technicians only see active workshops', async () => {
      const res = await asTech(http().get('/api/workshops?includeInactive=true')).expect(200);
      expect(res.body.data.items.map((w: { name: string }) => w.name)).toEqual([
        'North Workshop',
      ]);
    });

    it('admin registers a mechanic linked to the technician account', async () => {
      const res = await asAdmin(http().post('/api/mechanics'))
        .send({
          name: 'Laura Gomez',
          email: 'laura.mechanic@fleetcore.com',
          specialty: 'Engines',
          userId: techUserId,
        })
        .expect(201);
      mechanicId = res.body.data.id;
      const me = await asTech(http().get('/api/mechanics/me')).expect(200);
      expect(me.body.data.id).toBe(mechanicId);
    });

    it('admin registers vehicles and plates are unique', async () => {
      const res = await asAdmin(http().post('/api/vehicles'))
        .send({ plate: 'abc123', brand: 'Chevrolet', model: 'NPR', year: 2022, mileage: 45000 })
        .expect(201);
      vehicleId = res.body.data.id;
      expect(res.body.data).toMatchObject({ plate: 'ABC123', status: 'AVAILABLE' });

      const second = await asAdmin(http().post('/api/vehicles'))
        .send({ plate: 'DEF456', brand: 'Toyota', model: 'Hilux', year: 2021, mileage: 30000 })
        .expect(201);
      secondVehicleId = second.body.data.id;

      const dup = await asAdmin(http().post('/api/vehicles'))
        .send({ plate: 'ABC123', brand: 'Ford', model: 'Cargo', year: 2020, mileage: 1 })
        .expect(409);
      expect(dup.body).toMatchObject({
        success: false,
        statusCode: 409,
        message: 'Vehicle with plate ABC123 already exists',
        path: '/api/vehicles',
      });
      expect(dup.body.timestamp).toBeDefined();
    });

    it('vehicles can be read by id or plate', async () => {
      await asTech(http().get(`/api/vehicles/${vehicleId}`)).expect(200);
      const res = await asTech(http().get('/api/vehicles/plate/abc123')).expect(200);
      expect(res.body.data.id).toBe(vehicleId);
      await asTech(http().get('/api/vehicles/plate/ZZZ999')).expect(404);
    });
  });

  describe('authorization', () => {
    it('rejects requests without token → 401', () =>
      http().get('/api/vehicles').expect(401));

    it('rejects a technician creating vehicles → 403', () =>
      asTech(http().post('/api/vehicles'))
        .send({ plate: 'XYZ999', brand: 'Kia', model: 'K', year: 2020, mileage: 0 })
        .expect(403));

    it('rejects a non uuid id → 400', () =>
      asAdmin(http().get('/api/vehicles/not-a-uuid')).expect(400));
  });

  describe('scheduling rules', () => {
    it('creates a SCHEDULED maintenance; the vehicle stays AVAILABLE', async () => {
      const res = await asAdmin(http().post('/api/maintenances'))
        .send(schedule('2027-01-10T07:30:00.000Z', '2027-01-10T09:00:00.000Z'))
        .expect(201);
      firstMaintenanceId = res.body.data.id;
      expect(res.body.data.status).toBe('SCHEDULED');
      expect(res.body.data.workshop.name).toBe('North Workshop');
      expect(res.body.data.vehicle.status).toBe('AVAILABLE');
    });

    it('rejects a second active maintenance for the same vehicle → 409', async () => {
      const res = await asAdmin(http().post('/api/maintenances'))
        .send(schedule('2027-02-10T07:30:00.000Z', '2027-02-10T09:00:00.000Z'))
        .expect(409);
      expect(res.body.message).toBe('Vehicle ABC123 already has an active maintenance');
    });

    it('rejects an overlapping schedule for the mechanic in any workshop → 409', async () => {
      const res = await asAdmin(http().post('/api/maintenances'))
        .send(
          schedule('2027-01-10T08:00:00.000Z', '2027-01-10T10:00:00.000Z', {
            vehicleId: secondVehicleId,
            mileage: 30000,
          }),
        )
        .expect(409);
      expect(res.body.message).toMatch(/overlaps the requested schedule/);
    });

    it('allows a maintenance that starts when the previous one ends', async () => {
      const res = await asAdmin(http().post('/api/maintenances'))
        .send(
          schedule('2027-01-10T09:00:00.000Z', '2027-01-10T10:00:00.000Z', {
            vehicleId: secondVehicleId,
            mileage: 30000,
            type: 'CORRECTIVE',
            description: 'Brake pad replacement',
          }),
        )
        .expect(201);
      secondMaintenanceId = res.body.data.id;
    });

    it('rejects an inactive workshop → 409', () =>
      asAdmin(http().post('/api/maintenances'))
        .send(
          schedule('2027-03-10T07:30:00.000Z', '2027-03-10T09:00:00.000Z', {
            workshopId: inactiveWorkshopId,
          }),
        )
        .expect(409));

    it('rejects a nonexistent vehicle → 404', () =>
      asAdmin(http().post('/api/maintenances'))
        .send(
          schedule('2027-03-10T07:30:00.000Z', '2027-03-10T09:00:00.000Z', {
            vehicleId: '00000000-0000-4000-8000-000000000000',
          }),
        )
        .expect(404));

    it('rejects an end date before the start → 400', () =>
      asAdmin(http().post('/api/maintenances'))
        .send(schedule('2027-03-10T09:00:00.000Z', '2027-03-10T07:30:00.000Z'))
        .expect(400));

    it('rejects an invalid type → 400', () =>
      asAdmin(http().post('/api/maintenances'))
        .send(
          schedule('2027-03-10T07:30:00.000Z', '2027-03-10T09:00:00.000Z', {
            type: 'OTHER',
          }),
        )
        .expect(400));

    it('lists active maintenances', async () => {
      const res = await asAdmin(http().get('/api/maintenances/active')).expect(200);
      expect(res.body.data.meta.total).toBe(2);
    });
  });

  describe('technician workflow and status rules', () => {
    it('the technician lists their assigned maintenances', async () => {
      const res = await asTech(http().get('/api/maintenances/mine')).expect(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items[0].workshop).toBeDefined();
    });

    it('another technician cannot read or change it → 403', async () => {
      await http()
        .get(`/api/maintenances/${firstMaintenanceId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
      await http()
        .patch(`/api/maintenances/${firstMaintenanceId}/status`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(403);
    });

    it('cannot complete a SCHEDULED maintenance → 409', async () => {
      const res = await asTech(
        http().patch(`/api/maintenances/${firstMaintenanceId}/status`),
      )
        .send({ status: 'COMPLETED' })
        .expect(409);
      expect(res.body.message).toMatch(/must be IN_PROGRESS/);
    });

    it('starting it puts the vehicle IN_MAINTENANCE', async () => {
      const res = await asTech(
        http().patch(`/api/maintenances/${firstMaintenanceId}/status`),
      )
        .send({ status: 'IN_PROGRESS' })
        .expect(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
      const vehicle = await asAdmin(http().get(`/api/vehicles/${vehicleId}`)).expect(200);
      expect(vehicle.body.data.status).toBe('IN_MAINTENANCE');
    });

    it('the mechanic cannot work on two maintenances at once → 409', () =>
      asTech(http().patch(`/api/maintenances/${secondMaintenanceId}/status`))
        .send({ status: 'IN_PROGRESS' })
        .expect(409));

    it('cannot deactivate a vehicle with an active maintenance → 409', () =>
      asAdmin(http().patch(`/api/vehicles/${vehicleId}/deactivate`)).expect(409));

    it('cannot complete without the closing information → 400', async () => {
      const res = await asTech(
        http().patch(`/api/maintenances/${firstMaintenanceId}/status`),
      )
        .send({ status: 'COMPLETED', workPerformed: 'Oil changed' })
        .expect(400);
      expect(res.body.message).toMatch(/missing closing information/);
    });

    it('completing it frees the vehicle and updates its mileage', async () => {
      const res = await asTech(
        http().patch(`/api/maintenances/${firstMaintenanceId}/status`),
      )
        .send({
          status: 'COMPLETED',
          workPerformed: 'Changed oil, oil filter and air filter',
          finalCost: 350000,
          finishedAt: new Date().toISOString(),
          finalMileage: 45120,
        })
        .expect(200);
      expect(res.body.data).toMatchObject({ status: 'COMPLETED', finalCost: 350000 });
      const vehicle = await asAdmin(http().get(`/api/vehicles/${vehicleId}`)).expect(200);
      expect(vehicle.body.data).toMatchObject({ status: 'AVAILABLE', mileage: 45120 });
    });

    it('a COMPLETED maintenance cannot go back → 409', async () => {
      const res = await asAdmin(
        http().patch(`/api/maintenances/${firstMaintenanceId}/status`),
      )
        .send({ status: 'IN_PROGRESS' })
        .expect(409);
      expect(res.body.message).toBe(
        'Cannot change maintenance status from COMPLETED to IN_PROGRESS: a completed maintenance cannot go back to a previous status',
      );
    });

    it('only the admin can cancel; a CANCELLED one cannot be started', async () => {
      await asTech(http().patch(`/api/maintenances/${secondMaintenanceId}/status`))
        .send({ status: 'CANCELLED' })
        .expect(403);
      await asAdmin(http().patch(`/api/maintenances/${secondMaintenanceId}/status`))
        .send({ status: 'CANCELLED', note: 'Vehicle not delivered' })
        .expect(200);
      await asAdmin(http().patch(`/api/maintenances/${secondMaintenanceId}/status`))
        .send({ status: 'IN_PROGRESS' })
        .expect(409);
    });

    it('keeps an audit trail of every status change', async () => {
      const res = await asAdmin(
        http().get(`/api/maintenances/${firstMaintenanceId}/audit`),
      ).expect(200);
      expect(
        res.body.data.map((log: { toStatus: string }) => log.toStatus),
      ).toEqual(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']);
      expect(res.body.data[0].changedBy.password).toBeUndefined();
    });

    it('shows the vehicle history and the mechanic assignments', async () => {
      const history = await asAdmin(
        http().get(`/api/vehicles/${vehicleId}/maintenances`),
      ).expect(200);
      expect(history.body.data.maintenances).toHaveLength(1);
      const byMechanic = await asAdmin(
        http().get(`/api/mechanics/${mechanicId}/maintenances`),
      ).expect(200);
      expect(byMechanic.body.data.meta.total).toBe(2);
    });

    it('an INACTIVE vehicle cannot receive new maintenances → 409', async () => {
      await asAdmin(http().patch(`/api/vehicles/${vehicleId}/deactivate`)).expect(200);
      const res = await asAdmin(http().post('/api/maintenances'))
        .send(schedule('2027-04-10T07:30:00.000Z', '2027-04-10T09:00:00.000Z', { mileage: 45120 }))
        .expect(409);
      expect(res.body.message).toMatch(/INACTIVE/);
    });
  });

  describe('external integration (x-api-key)', () => {
    const url = '/api/integrations/vehicles/ABC123/maintenances';

    it('rejects a missing API key → 401', () => http().get(url).expect(401));

    it('rejects a wrong API key → 401', () =>
      http().get(url).set('x-api-key', 'wrong-key').expect(401));

    it('ignores a JWT: only the API key is accepted → 401', () =>
      asAdmin(http().get(url)).expect(401));

    it('returns the vehicle history with a valid key', async () => {
      const res = await http()
        .get(url)
        .set('x-api-key', 'test-key-partner-2')
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicle).toMatchObject({ plate: 'ABC123', available: false });
      expect(res.body.data.maintenances[0]).toMatchObject({
        type: 'PREVENTIVE',
        status: 'COMPLETED',
        cost: 350000,
        mechanic: { name: 'Laura Gomez' },
        workshop: { name: 'North Workshop' },
      });
    });

    it('returns 404 for an unknown plate', () =>
      http()
        .get('/api/integrations/vehicles/ZZZ999/maintenances')
        .set('x-api-key', 'test-key-partner-1')
        .expect(404));
  });
});
