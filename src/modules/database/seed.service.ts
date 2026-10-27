import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { DataSource, type EntityManager } from 'typeorm';
import { Role } from '../../common/enums/role.enum.js';
import type { Env } from '../../config/env.schema.js';
import { MaintenanceStatusLog } from '../maintenances/entities/maintenance-status-log.entity.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Workshop } from '../workshops/entities/workshop.entity.js';
import {
  MECHANICS,
  STATUS_PATH,
  TECHNICIAN_PASSWORD,
  TECHNICIANS,
  VEHICLES,
  WORKSHOPS,
  buildMaintenances,
} from './seed-data.js';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** The admin account must always exist, so it is ensured on every boot. */
  async onApplicationBootstrap() {
    await this.ensureAdmin();
  }

  /**
   * Loads the demo data (`npm run seed`). Every record is looked up by a
   * natural key before being inserted, so running it twice creates nothing new.
   * Everything runs in one transaction: a failure leaves the database untouched.
   */
  async run() {
    await this.ensureAdmin();
    const created = await this.dataSource.transaction(async (manager) => {
      const counts = {
        users: 0,
        mechanics: 0,
        workshops: 0,
        vehicles: 0,
        maintenances: 0,
      };
      const users = new Map<string, User>();
      const admin = await manager.findOneByOrFail(User, {
        email: this.config.get('ADMIN_EMAIL', { infer: true }),
      });

      const technicianPassword = await hash(TECHNICIAN_PASSWORD, 10);
      for (const data of TECHNICIANS) {
        const { entity, isNew } = await this.findOrCreate(
          manager,
          User,
          { email: data.email },
          { ...data, password: technicianPassword, role: Role.TECHNICIAN },
        );
        users.set(entity.email, entity);
        counts.users += Number(isNew);
      }

      const mechanics = new Map<string, Mechanic>();
      for (const { userEmail, ...data } of MECHANICS) {
        const userId = userEmail ? (users.get(userEmail)?.id ?? null) : null;
        const { entity, isNew } = await this.findOrCreate(
          manager,
          Mechanic,
          { email: data.email },
          { ...data, userId },
        );
        mechanics.set(entity.email, entity);
        counts.mechanics += Number(isNew);
      }

      const workshops = new Map<string, Workshop>();
      for (const data of WORKSHOPS) {
        const { entity, isNew } = await this.findOrCreate(
          manager,
          Workshop,
          { name: data.name },
          data,
        );
        workshops.set(entity.name, entity);
        counts.workshops += Number(isNew);
      }

      const vehicles = new Map<string, Vehicle>();
      for (const data of VEHICLES) {
        const { entity, isNew } = await this.findOrCreate(
          manager,
          Vehicle,
          { plate: data.plate },
          data,
        );
        vehicles.set(entity.plate, entity);
        counts.vehicles += Number(isNew);
      }

      for (const seed of buildMaintenances()) {
        const vehicle = vehicles.get(seed.plate) as Vehicle;
        const mechanic = mechanics.get(seed.mechanicEmail) as Mechanic;
        const { entity, isNew } = await this.findOrCreate(
          manager,
          Maintenance,
          { vehicleId: vehicle.id, description: seed.description },
          {
            type: seed.type,
            description: seed.description,
            mileage: seed.mileage,
            scheduledAt: seed.scheduledAt,
            estimatedEndAt: seed.estimatedEndAt,
            startedAt: seed.startedAt ?? null,
            status: seed.status,
            ...seed.closing,
            vehicleId: vehicle.id,
            mechanicId: mechanic.id,
            workshopId: (workshops.get(seed.workshopName) as Workshop).id,
          },
        );
        if (!isNew) continue;
        counts.maintenances++;

        // Audit trail consistent with the final status
        const path = STATUS_PATH[seed.status];
        const logs = path.map((toStatus, index) =>
          manager.create(MaintenanceStatusLog, {
            maintenanceId: entity.id,
            fromStatus: index === 0 ? null : path[index - 1],
            toStatus,
            changedById: index === 0 ? admin.id : mechanic.userId,
          }),
        );
        await manager.save(logs);
      }
      return counts;
    });

    this.logger.log(`Seed finished. New records: ${JSON.stringify(created)}`);
    return created;
  }

  private async ensureAdmin() {
    const email = this.config.get('ADMIN_EMAIL', { infer: true });
    if (await this.usersService.findByEmail(email)) return;

    await this.usersService.create({
      name: 'Administrator',
      email,
      password: await hash(
        this.config.get('ADMIN_PASSWORD', { infer: true }),
        10,
      ),
      role: Role.ADMIN,
    });
    this.logger.log(`Admin created: ${email}`);
  }

  private async findOrCreate<T extends object>(
    manager: EntityManager,
    entity: new () => T,
    where: Partial<T>,
    data: Partial<T>,
  ): Promise<{ entity: T; isNew: boolean }> {
    const existing = await manager.findOne(entity, {
      where: where as never,
      withDeleted: true,
    });
    if (existing) return { entity: existing, isNew: false };
    const created = await manager.save(manager.create(entity, data as never));
    return { entity: created, isNew: true };
  }
}
