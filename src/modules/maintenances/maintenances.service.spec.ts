import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaintenanceStatus } from '../../common/enums/maintenance-status.enum.js';
import { MaintenanceType } from '../../common/enums/maintenance-type.enum.js';
import { RecordStatus } from '../../common/enums/record-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { MechanicsService } from '../mechanics/mechanics.service.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { Workshop } from '../workshops/entities/workshop.entity.js';
import { MaintenanceStatusLog } from './entities/maintenance-status-log.entity.js';
import { Maintenance } from './entities/maintenance.entity.js';
import { MaintenancesService } from './maintenances.service.js';

const admin = { sub: 'admin-1', email: 'admin@fleetcore.com', role: Role.ADMIN };
const technician = {
  sub: 'tech-1',
  email: 'tech@fleetcore.com',
  role: Role.TECHNICIAN,
};

const buildVehicle = (over: Partial<Vehicle> = {}) =>
  ({
    id: 'v1',
    plate: 'ABC123',
    mileage: 45000,
    status: VehicleStatus.AVAILABLE,
    ...over,
  }) as Vehicle;
const buildMechanic = (over: Partial<Mechanic> = {}) =>
  ({
    id: 'm1',
    name: 'Carlos Perez',
    status: RecordStatus.ACTIVE,
    userId: 'tech-1',
    ...over,
  }) as Mechanic;
const buildWorkshop = (over: Partial<Workshop> = {}) =>
  ({ id: 'w1', name: 'North', status: RecordStatus.ACTIVE, ...over }) as Workshop;
const buildMaintenance = (over: Partial<Maintenance> = {}) =>
  ({
    id: 'mt1',
    vehicleId: 'v1',
    mechanicId: 'm1',
    workshopId: 'w1',
    mileage: 45000,
    scheduledAt: new Date('2026-01-10T07:30:00Z'),
    estimatedEndAt: new Date('2026-01-10T09:00:00Z'),
    startedAt: new Date('2026-01-10T07:35:00Z'),
    status: MaintenanceStatus.SCHEDULED,
    mechanic: buildMechanic(),
    ...over,
  }) as Maintenance;

describe('MaintenancesService', () => {
  let service: MaintenancesService;

  // Records in "database" returned by manager.findOne for each entity
  let db: {
    vehicle: Vehicle | null;
    mechanic: Mechanic | null;
    workshop: Workshop | null;
    maintenance: Maintenance | null;
  };
  let overlapping: Maintenance | null;
  // Answers for manager.exists, keyed by entity
  let existsAnswers: Map<unknown, boolean[]>;

  const queryBuilder = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getOne: vi.fn(async () => overlapping),
  };
  const saved: unknown[] = [];
  const manager = {
    findOne: vi.fn(async (entity: unknown) => {
      if (entity === Vehicle) return db.vehicle;
      if (entity === Mechanic) return db.mechanic;
      if (entity === Workshop) return db.workshop;
      if (entity === Maintenance) return db.maintenance;
      return null;
    }),
    findOneOrFail: vi.fn(async (entity: unknown) => {
      const found = await manager.findOne(entity);
      if (!found) throw new Error('not found');
      return found;
    }),
    exists: vi.fn(
      async (entity: unknown) => existsAnswers.get(entity)?.shift() ?? false,
    ),
    create: vi.fn((_entity: unknown, data: object) => ({ ...data })),
    save: vi.fn(async (data: object) => {
      saved.push(data);
      return { id: 'mt-new', ...data };
    }),
    createQueryBuilder: vi.fn(() => queryBuilder),
  };
  const dataSource = {
    transaction: vi.fn(async (cb: (m: typeof manager) => unknown) => cb(manager)),
  };
  const maintenancesRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    findAndCount: vi.fn(),
  };
  const logsRepo = { find: vi.fn() };
  const vehiclesService = { findOne: vi.fn(), findByPlate: vi.fn() };
  const mechanicsService = { findByUserId: vi.fn(), findOne: vi.fn() };

  const createDto = () => ({
    type: MaintenanceType.PREVENTIVE,
    description: 'Oil change',
    mileage: 45500,
    scheduledAt: new Date('2026-01-10T07:30:00Z'),
    estimatedEndAt: new Date('2026-01-10T09:00:00Z'),
    vehicleId: 'v1',
    mechanicId: 'm1',
    workshopId: 'w1',
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    saved.length = 0;
    db = {
      vehicle: buildVehicle(),
      mechanic: buildMechanic(),
      workshop: buildWorkshop(),
      maintenance: buildMaintenance(),
    };
    overlapping = null;
    existsAnswers = new Map();
    maintenancesRepo.findOne.mockImplementation(async () => db.maintenance);

    const moduleRef = await Test.createTestingModule({
      providers: [
        MaintenancesService,
        { provide: getRepositoryToken(Maintenance), useValue: maintenancesRepo },
        {
          provide: getRepositoryToken(MaintenanceStatusLog),
          useValue: logsRepo,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: VehiclesService, useValue: vehiclesService },
        { provide: MechanicsService, useValue: mechanicsService },
      ],
    }).compile();
    service = moduleRef.get(MaintenancesService);
  });

  describe('create', () => {
    it('creates a SCHEDULED maintenance and its first audit entry', async () => {
      // Act
      await service.create(createDto(), admin.sub);
      // Assert
      expect(saved[0]).toMatchObject({ status: MaintenanceStatus.SCHEDULED });
      expect(saved[1]).toMatchObject({
        fromStatus: null,
        toStatus: MaintenanceStatus.SCHEDULED,
        changedById: admin.sub,
      });
    });

    it('rejects an estimated end before the start', async () => {
      const dto = { ...createDto(), estimatedEndAt: createDto().scheduledAt };
      await expect(service.create(dto, admin.sub)).rejects.toThrow(
        BadRequestException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it.each([
      ['vehicle', NotFoundException],
      ['mechanic', NotFoundException],
      ['workshop', NotFoundException],
    ] as const)('throws when the %s does not exist', async (key, error) => {
      db[key] = null;
      await expect(service.create(createDto(), admin.sub)).rejects.toThrow(
        error,
      );
    });

    it('rejects an INACTIVE vehicle', async () => {
      db.vehicle = buildVehicle({ status: VehicleStatus.INACTIVE });
      await expect(service.create(createDto(), admin.sub)).rejects.toThrow(
        /INACTIVE/,
      );
    });

    it('rejects an inactive mechanic', async () => {
      db.mechanic = buildMechanic({ status: RecordStatus.INACTIVE });
      await expect(service.create(createDto(), admin.sub)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects an inactive workshop', async () => {
      db.workshop = buildWorkshop({ status: RecordStatus.INACTIVE });
      await expect(service.create(createDto(), admin.sub)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects a mileage lower than the vehicle mileage', async () => {
      const dto = { ...createDto(), mileage: 100 };
      await expect(service.create(dto, admin.sub)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a vehicle that already has an active maintenance', async () => {
      existsAnswers.set(Maintenance, [true]);
      await expect(service.create(createDto(), admin.sub)).rejects.toThrow(
        'Vehicle ABC123 already has an active maintenance',
      );
    });

    it('rejects an overlapping schedule for the mechanic', async () => {
      overlapping = buildMaintenance();
      await expect(service.create(createDto(), admin.sub)).rejects.toThrow(
        /overlaps the requested schedule/,
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'm.scheduledAt < :end AND m.estimatedEndAt > :start',
        expect.any(Object),
      );
    });
  });

  describe('updateStatus', () => {
    it('SCHEDULED → IN_PROGRESS puts the vehicle IN_MAINTENANCE', async () => {
      await service.updateStatus(
        'mt1',
        { status: MaintenanceStatus.IN_PROGRESS },
        admin,
      );
      expect(db.maintenance?.status).toBe(MaintenanceStatus.IN_PROGRESS);
      expect(db.maintenance?.startedAt).toBeInstanceOf(Date);
      expect(db.vehicle?.status).toBe(VehicleStatus.IN_MAINTENANCE);
      expect(saved.at(-1)).toMatchObject({
        fromStatus: MaintenanceStatus.SCHEDULED,
        toStatus: MaintenanceStatus.IN_PROGRESS,
      });
    });

    it('refuses to start when the mechanic is working on another maintenance', async () => {
      existsAnswers.set(Maintenance, [true]);
      await expect(
        service.updateStatus(
          'mt1',
          { status: MaintenanceStatus.IN_PROGRESS },
          admin,
        ),
      ).rejects.toThrow(/already working on another maintenance/);
    });

    it('IN_PROGRESS → COMPLETED stores closing data and frees the vehicle', async () => {
      db.maintenance = buildMaintenance({
        status: MaintenanceStatus.IN_PROGRESS,
      });
      db.vehicle = buildVehicle({ status: VehicleStatus.IN_MAINTENANCE });
      const finishedAt = new Date();
      await service.updateStatus(
        'mt1',
        {
          status: MaintenanceStatus.COMPLETED,
          workPerformed: 'Oil changed',
          finalCost: 350000,
          finishedAt,
          finalMileage: 45100,
        },
        admin,
      );
      expect(db.maintenance).toMatchObject({
        status: MaintenanceStatus.COMPLETED,
        workPerformed: 'Oil changed',
        finalCost: 350000,
        finishedAt,
        finalMileage: 45100,
      });
      expect(db.vehicle).toMatchObject({
        status: VehicleStatus.AVAILABLE,
        mileage: 45100,
      });
    });

    it('refuses to complete without the closing information', async () => {
      db.maintenance = buildMaintenance({
        status: MaintenanceStatus.IN_PROGRESS,
      });
      await expect(
        service.updateStatus(
          'mt1',
          { status: MaintenanceStatus.COMPLETED, workPerformed: 'Done' },
          admin,
        ),
      ).rejects.toThrow(
        'Cannot complete the maintenance: missing closing information (finalCost, finishedAt, finalMileage)',
      );
    });

    it('refuses a final mileage lower than the maintenance mileage', async () => {
      db.maintenance = buildMaintenance({
        status: MaintenanceStatus.IN_PROGRESS,
      });
      await expect(
        service.updateStatus(
          'mt1',
          {
            status: MaintenanceStatus.COMPLETED,
            workPerformed: 'Done',
            finalCost: 10,
            finishedAt: new Date(),
            finalMileage: 1,
          },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses a finish date earlier than the start', async () => {
      db.maintenance = buildMaintenance({
        status: MaintenanceStatus.IN_PROGRESS,
      });
      await expect(
        service.updateStatus(
          'mt1',
          {
            status: MaintenanceStatus.COMPLETED,
            workPerformed: 'Done',
            finalCost: 10,
            finishedAt: new Date('2020-01-01T00:00:00Z'),
            finalMileage: 46000,
          },
          admin,
        ),
      ).rejects.toThrow(/earlier than the start/);
    });

    it('refuses a finish date in the future', async () => {
      db.maintenance = buildMaintenance({
        status: MaintenanceStatus.IN_PROGRESS,
      });
      await expect(
        service.updateStatus(
          'mt1',
          {
            status: MaintenanceStatus.COMPLETED,
            workPerformed: 'Done',
            finalCost: 10,
            finishedAt: new Date(Date.now() + 24 * 3600 * 1000),
            finalMileage: 46000,
          },
          admin,
        ),
      ).rejects.toThrow('finishedAt cannot be in the future');
    });

    it('refuses closing information for a status other than COMPLETED', async () => {
      await expect(
        service.updateStatus(
          'mt1',
          { status: MaintenanceStatus.IN_PROGRESS, finalCost: 10 },
          admin,
        ),
      ).rejects.toThrow(/only accepted when the status is COMPLETED/);
    });

    it('cancelling an IN_PROGRESS maintenance frees the vehicle', async () => {
      db.maintenance = buildMaintenance({
        status: MaintenanceStatus.IN_PROGRESS,
      });
      db.vehicle = buildVehicle({ status: VehicleStatus.IN_MAINTENANCE });
      await service.updateStatus(
        'mt1',
        { status: MaintenanceStatus.CANCELLED },
        admin,
      );
      expect(db.vehicle.status).toBe(VehicleStatus.AVAILABLE);
    });

    it('rejects COMPLETED → IN_PROGRESS with ConflictException', async () => {
      db.maintenance = buildMaintenance({ status: MaintenanceStatus.COMPLETED });
      await expect(
        service.updateStatus(
          'mt1',
          { status: MaintenanceStatus.IN_PROGRESS },
          admin,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects CANCELLED → IN_PROGRESS with ConflictException', async () => {
      db.maintenance = buildMaintenance({ status: MaintenanceStatus.CANCELLED });
      await expect(
        service.updateStatus(
          'mt1',
          { status: MaintenanceStatus.IN_PROGRESS },
          admin,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for an unknown maintenance', async () => {
      db.maintenance = null;
      await expect(
        service.updateStatus(
          'missing',
          { status: MaintenanceStatus.IN_PROGRESS },
          admin,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('lets the assigned technician start the maintenance', async () => {
      existsAnswers.set(Mechanic, [true]);
      await service.updateStatus(
        'mt1',
        { status: MaintenanceStatus.IN_PROGRESS },
        technician,
      );
      expect(db.maintenance?.status).toBe(MaintenanceStatus.IN_PROGRESS);
    });

    it('forbids a technician that is not assigned', async () => {
      existsAnswers.set(Mechanic, [false]);
      await expect(
        service.updateStatus(
          'mt1',
          { status: MaintenanceStatus.IN_PROGRESS },
          technician,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids a technician from cancelling', async () => {
      existsAnswers.set(Mechanic, [true]);
      await expect(
        service.updateStatus(
          'mt1',
          { status: MaintenanceStatus.CANCELLED },
          technician,
        ),
      ).rejects.toThrow('Only an administrator can cancel a maintenance');
    });
  });

  describe('queries', () => {
    it('findOne forbids technicians from reading other assignments', async () => {
      db.maintenance = buildMaintenance({
        mechanic: buildMechanic({ userId: 'someone-else' }),
      });
      await expect(service.findOne('mt1', technician)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('findOne returns the maintenance to its assigned technician', async () => {
      const result = await service.findOne('mt1', technician);
      expect(result.id).toBe('mt1');
    });

    it('findOne throws NotFoundException when it does not exist', async () => {
      db.maintenance = null;
      await expect(service.findOne('missing', admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('findAll ignores undefined filters and paginates', async () => {
      maintenancesRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({
        page: 1,
        limit: 10,
        status: MaintenanceStatus.SCHEDULED,
        vehicleId: undefined,
      });
      expect(maintenancesRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: MaintenanceStatus.SCHEDULED },
        }),
      );
    });

    it('findActive filters by SCHEDULED and IN_PROGRESS', async () => {
      maintenancesRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.findActive({ page: 1, limit: 10 });
      expect(result.meta.total).toBe(0);
      const [{ where }] = maintenancesRepo.findAndCount.mock.calls[0];
      expect(where.status.value).toEqual([
        MaintenanceStatus.SCHEDULED,
        MaintenanceStatus.IN_PROGRESS,
      ]);
    });

    it('findMine filters by the mechanic linked to the user', async () => {
      mechanicsService.findByUserId.mockResolvedValue(buildMechanic());
      maintenancesRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findMine('tech-1', { page: 1, limit: 10 });
      expect(maintenancesRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { mechanicId: 'm1' } }),
      );
    });

    it('findByMechanic validates the mechanic exists', async () => {
      mechanicsService.findOne.mockRejectedValue(new NotFoundException());
      await expect(
        service.findByMechanic('missing', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('findVehicleHistoryByPlate returns the vehicle and its maintenances', async () => {
      vehiclesService.findByPlate.mockResolvedValue(buildVehicle());
      maintenancesRepo.find.mockResolvedValue([buildMaintenance()]);
      const result = await service.findVehicleHistoryByPlate('abc123');
      expect(result.vehicle.plate).toBe('ABC123');
      expect(result.maintenances).toHaveLength(1);
    });

    it('findVehicleHistory looks the vehicle up by id', async () => {
      vehiclesService.findOne.mockResolvedValue(buildVehicle());
      maintenancesRepo.find.mockResolvedValue([]);
      const result = await service.findVehicleHistory('v1');
      expect(result.maintenances).toEqual([]);
    });

    it('findAudit returns the status logs in order', async () => {
      logsRepo.find.mockResolvedValue([{ toStatus: MaintenanceStatus.SCHEDULED }]);
      const result = await service.findAudit('mt1');
      expect(result).toHaveLength(1);
      expect(logsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'ASC' } }),
      );
    });
  });
});
