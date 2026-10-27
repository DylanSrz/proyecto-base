import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Not,
  Repository,
  type EntityManager,
  type FindOptionsWhere,
} from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import {
  ACTIVE_MAINTENANCE_STATUSES,
  MaintenanceStatus,
} from '../../common/enums/maintenance-status.enum.js';
import { RecordStatus } from '../../common/enums/record-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { paginate } from '../../common/utils/paginate.js';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { MechanicsService } from '../mechanics/mechanics.service.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { Workshop } from '../workshops/entities/workshop.entity.js';
import type { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import type { QueryMaintenanceDto } from './dto/query-maintenance.dto.js';
import {
  CLOSING_FIELDS,
  type UpdateMaintenanceStatusDto,
} from './dto/update-maintenance-status.dto.js';
import { MaintenanceStatusLog } from './entities/maintenance-status-log.entity.js';
import { Maintenance } from './entities/maintenance.entity.js';
import { assertTransition } from './maintenance-transitions.js';

// Small tolerance for clock differences when validating finishedAt
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const LOCK = { mode: 'pessimistic_write' } as const;

@Injectable()
export class MaintenancesService {
  constructor(
    @InjectRepository(Maintenance)
    private readonly maintenancesRepo: Repository<Maintenance>,
    @InjectRepository(MaintenanceStatusLog)
    private readonly logsRepo: Repository<MaintenanceStatusLog>,
    private readonly dataSource: DataSource,
    private readonly vehiclesService: VehiclesService,
    private readonly mechanicsService: MechanicsService,
  ) {}

  /**
   * Creates a SCHEDULED maintenance.
   * Runs in a transaction that locks the vehicle and mechanic rows (always in
   * that order), so two concurrent requests for the same vehicle or mechanic
   * are serialized and cannot both pass the availability checks.
   */
  async create(dto: CreateMaintenanceDto, userId: string) {
    if (dto.estimatedEndAt <= dto.scheduledAt) {
      throw new BadRequestException(
        'estimatedEndAt must be later than scheduledAt',
      );
    }

    const id = await this.dataSource.transaction(async (manager) => {
      const vehicle = await manager.findOne(Vehicle, {
        where: { id: dto.vehicleId },
        lock: LOCK,
      });
      if (!vehicle)
        throw new NotFoundException(`Vehicle ${dto.vehicleId} not found`);
      if (vehicle.status === VehicleStatus.INACTIVE) {
        throw new ConflictException(
          `Vehicle ${vehicle.plate} is INACTIVE and cannot receive new maintenances`,
        );
      }

      const mechanic = await manager.findOne(Mechanic, {
        where: { id: dto.mechanicId },
        lock: LOCK,
      });
      if (!mechanic)
        throw new NotFoundException(`Mechanic ${dto.mechanicId} not found`);
      if (mechanic.status !== RecordStatus.ACTIVE) {
        throw new ConflictException(
          `Mechanic ${mechanic.name} is inactive and cannot be assigned`,
        );
      }

      const workshop = await manager.findOne(Workshop, {
        where: { id: dto.workshopId },
      });
      if (!workshop)
        throw new NotFoundException(`Workshop ${dto.workshopId} not found`);
      if (workshop.status !== RecordStatus.ACTIVE) {
        throw new ConflictException(
          `Workshop ${workshop.name} is inactive and cannot be assigned`,
        );
      }

      if (dto.mileage < vehicle.mileage) {
        throw new BadRequestException(
          `Mileage (${dto.mileage} km) cannot be lower than the current mileage of vehicle ${vehicle.plate} (${vehicle.mileage} km)`,
        );
      }

      const vehicleBusy = await manager.exists(Maintenance, {
        where: {
          vehicleId: vehicle.id,
          status: In(ACTIVE_MAINTENANCE_STATUSES),
        },
      });
      if (vehicleBusy) {
        throw new ConflictException(
          `Vehicle ${vehicle.plate} already has an active maintenance`,
        );
      }

      // Two ranges overlap when each one starts before the other ends; a
      // maintenance may start exactly when the previous one ends.
      const overlapping = await manager
        .createQueryBuilder(Maintenance, 'm')
        .where('m.mechanicId = :mechanicId', { mechanicId: mechanic.id })
        .andWhere('m.status IN (:...statuses)', {
          statuses: ACTIVE_MAINTENANCE_STATUSES,
        })
        .andWhere('m.scheduledAt < :end AND m.estimatedEndAt > :start', {
          start: dto.scheduledAt,
          end: dto.estimatedEndAt,
        })
        .getOne();
      if (overlapping) {
        throw new ConflictException(
          `Mechanic ${mechanic.name} already has an active maintenance from ${overlapping.scheduledAt.toISOString()} to ${overlapping.estimatedEndAt.toISOString()} that overlaps the requested schedule`,
        );
      }

      const maintenance = await manager.save(
        manager.create(Maintenance, {
          ...dto,
          status: MaintenanceStatus.SCHEDULED,
        }),
      );
      await manager.save(
        manager.create(MaintenanceStatusLog, {
          maintenanceId: maintenance.id,
          fromStatus: null,
          toStatus: MaintenanceStatus.SCHEDULED,
          changedById: userId,
        }),
      );
      return maintenance.id;
    });

    return this.findOneWithRelations(id);
  }

  async findAll(query: QueryMaintenanceDto) {
    const { page, limit, ...filters } = query;
    return this.findPaginated(
      this.cleanFilters(filters),
      { page, limit },
      'DESC',
    );
  }

  /** SCHEDULED and IN_PROGRESS maintenances, soonest first. */
  findActive({ page, limit }: PaginationDto) {
    return this.findPaginated(
      { status: In(ACTIVE_MAINTENANCE_STATUSES) },
      { page, limit },
      'ASC',
    );
  }

  /** Maintenances assigned to the mechanic linked to a TECHNICIAN user. */
  async findMine(userId: string, query: QueryMaintenanceDto) {
    const mechanic = await this.mechanicsService.findByUserId(userId);
    return this.findAll({ ...query, mechanicId: mechanic.id });
  }

  async findByMechanic(mechanicId: string, query: QueryMaintenanceDto) {
    await this.mechanicsService.findOne(mechanicId);
    return this.findAll({ ...query, mechanicId });
  }

  async findOne(id: string, user: JwtPayload) {
    const maintenance = await this.findOneWithRelations(id);
    if (
      user.role === Role.TECHNICIAN &&
      maintenance.mechanic.userId !== user.sub
    ) {
      throw new ForbiddenException(
        'You can only access maintenances assigned to you',
      );
    }
    return maintenance;
  }

  /** Full maintenance history of a vehicle, most recent first. */
  async findVehicleHistory(vehicleId: string) {
    const vehicle = await this.vehiclesService.findOne(vehicleId);
    return this.buildVehicleHistory(vehicle);
  }

  async findVehicleHistoryByPlate(plate: string) {
    const vehicle = await this.vehiclesService.findByPlate(plate);
    return this.buildVehicleHistory(vehicle);
  }

  /** Audit trail of status changes. */
  async findAudit(id: string) {
    await this.findOneWithRelations(id);
    return this.logsRepo.find({
      where: { maintenanceId: id },
      relations: { changedBy: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Changes the status of a maintenance and keeps the vehicle in sync:
   * - IN_PROGRESS → vehicle IN_MAINTENANCE
   * - COMPLETED   → vehicle AVAILABLE and its mileage updated
   * - CANCELLED from IN_PROGRESS → vehicle AVAILABLE
   * The maintenance, the vehicle and the audit log are written in one
   * transaction, so they are either all saved or none is.
   */
  async updateStatus(
    id: string,
    dto: UpdateMaintenanceStatusDto,
    user: JwtPayload,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const maintenance = await manager.findOne(Maintenance, {
        where: { id },
        lock: LOCK,
      });
      if (!maintenance) throw new NotFoundException(`Maintenance ${id} not found`);

      if (user.role === Role.TECHNICIAN)
        await this.assertTechnicianCanChange(manager, maintenance, dto, user);

      const fromStatus = maintenance.status;
      assertTransition(fromStatus, dto.status);
      this.assertClosingFieldsOnlyForCompletion(dto);

      const vehicle = await manager.findOneOrFail(Vehicle, {
        where: { id: maintenance.vehicleId },
        lock: LOCK,
      });

      switch (dto.status) {
        case MaintenanceStatus.IN_PROGRESS:
          await this.start(manager, maintenance, vehicle);
          break;
        case MaintenanceStatus.COMPLETED:
          this.complete(maintenance, vehicle, dto);
          break;
        case MaintenanceStatus.CANCELLED:
          if (fromStatus === MaintenanceStatus.IN_PROGRESS)
            vehicle.status = VehicleStatus.AVAILABLE;
          break;
      }

      maintenance.status = dto.status;
      await manager.save(maintenance);
      await manager.save(vehicle);
      await manager.save(
        manager.create(MaintenanceStatusLog, {
          maintenanceId: maintenance.id,
          fromStatus,
          toStatus: dto.status,
          changedById: user.sub,
          note: dto.note ?? null,
        }),
      );
    });

    return this.findOneWithRelations(id);
  }

  private async start(
    manager: EntityManager,
    maintenance: Maintenance,
    vehicle: Vehicle,
  ) {
    // Lock order vehicle → mechanic, the same used when creating
    const mechanic = await manager.findOneOrFail(Mechanic, {
      where: { id: maintenance.mechanicId },
      lock: LOCK,
    });
    const alreadyWorking = await manager.exists(Maintenance, {
      where: {
        id: Not(maintenance.id),
        mechanicId: mechanic.id,
        status: MaintenanceStatus.IN_PROGRESS,
      },
    });
    if (alreadyWorking) {
      throw new ConflictException(
        `Mechanic ${mechanic.name} is already working on another maintenance`,
      );
    }
    maintenance.startedAt = new Date();
    vehicle.status = VehicleStatus.IN_MAINTENANCE;
  }

  private complete(
    maintenance: Maintenance,
    vehicle: Vehicle,
    dto: UpdateMaintenanceStatusDto,
  ) {
    const missing = CLOSING_FIELDS.filter(
      (field) => dto[field] === undefined || dto[field] === null,
    );
    if (missing.length) {
      throw new BadRequestException(
        `Cannot complete the maintenance: missing closing information (${missing.join(', ')})`,
      );
    }
    const finishedAt = dto.finishedAt as Date;
    const finalMileage = dto.finalMileage as number;

    if (finalMileage < maintenance.mileage) {
      throw new BadRequestException(
        `finalMileage (${finalMileage} km) cannot be lower than the mileage registered for the maintenance (${maintenance.mileage} km)`,
      );
    }
    const startedAt = maintenance.startedAt ?? maintenance.scheduledAt;
    if (finishedAt < startedAt) {
      throw new BadRequestException(
        `finishedAt cannot be earlier than the start of the maintenance (${startedAt.toISOString()})`,
      );
    }
    if (finishedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException('finishedAt cannot be in the future');
    }

    maintenance.workPerformed = dto.workPerformed as string;
    maintenance.finalCost = dto.finalCost as number;
    maintenance.finishedAt = finishedAt;
    maintenance.finalMileage = finalMileage;
    vehicle.status = VehicleStatus.AVAILABLE;
    vehicle.mileage = Math.max(vehicle.mileage, finalMileage);
  }

  private assertClosingFieldsOnlyForCompletion(dto: UpdateMaintenanceStatusDto) {
    if (dto.status === MaintenanceStatus.COMPLETED) return;
    const sent = CLOSING_FIELDS.filter((field) => dto[field] !== undefined);
    if (sent.length) {
      throw new BadRequestException(
        `Closing information (${sent.join(', ')}) is only accepted when the status is COMPLETED`,
      );
    }
  }

  /** Technicians may only start or complete maintenances assigned to them. */
  private async assertTechnicianCanChange(
    manager: EntityManager,
    maintenance: Maintenance,
    dto: UpdateMaintenanceStatusDto,
    user: JwtPayload,
  ) {
    const assigned = await manager.exists(Mechanic, {
      where: { id: maintenance.mechanicId, userId: user.sub },
    });
    if (!assigned) {
      throw new ForbiddenException(
        'You can only update maintenances assigned to you',
      );
    }
    if (dto.status === MaintenanceStatus.CANCELLED) {
      throw new ForbiddenException(
        'Only an administrator can cancel a maintenance',
      );
    }
  }

  private async findOneWithRelations(id: string) {
    const maintenance = await this.maintenancesRepo.findOne({
      where: { id },
      relations: { vehicle: true, mechanic: true, workshop: true },
    });
    if (!maintenance) throw new NotFoundException(`Maintenance ${id} not found`);
    return maintenance;
  }

  private async buildVehicleHistory(vehicle: Vehicle) {
    const maintenances = await this.maintenancesRepo.find({
      where: { vehicleId: vehicle.id },
      relations: { mechanic: true, workshop: true },
      order: { scheduledAt: 'DESC' },
    });
    return { vehicle, maintenances };
  }

  private async findPaginated(
    where: FindOptionsWhere<Maintenance>,
    { page, limit }: PaginationDto,
    order: 'ASC' | 'DESC',
  ) {
    const [items, total] = await this.maintenancesRepo.findAndCount({
      where,
      relations: { vehicle: true, mechanic: true, workshop: true },
      order: { scheduledAt: order },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(items, total, page, limit);
  }

  // Drops undefined filters so they are not turned into IS NULL conditions
  private cleanFilters(filters: Omit<QueryMaintenanceDto, 'page' | 'limit'>) {
    return Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined),
    ) as FindOptionsWhere<Maintenance>;
  }
}
