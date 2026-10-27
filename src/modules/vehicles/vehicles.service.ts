import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository, type FindOptionsWhere } from 'typeorm';
import { ACTIVE_MAINTENANCE_STATUSES } from '../../common/enums/maintenance-status.enum.js';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { paginate } from '../../common/utils/paginate.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import type { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { normalizePlate } from './dto/create-vehicle.dto.js';
import type { QueryVehicleDto } from './dto/query-vehicle.dto.js';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(Maintenance)
    private readonly maintenancesRepo: Repository<Maintenance>,
  ) {}

  async create(dto: CreateVehicleDto) {
    await this.assertPlateIsFree(dto.plate);
    return this.vehiclesRepo.save(
      this.vehiclesRepo.create({ ...dto, status: VehicleStatus.AVAILABLE }),
    );
  }

  async findAll({ page, limit, status, search }: QueryVehicleDto) {
    const base: FindOptionsWhere<Vehicle> = status ? { status } : {};
    const where = search
      ? ['plate', 'brand', 'model'].map((field) => ({
          ...base,
          [field]: ILike(`%${search}%`),
        }))
      : base;
    const [items, total] = await this.vehiclesRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const vehicle = await this.vehiclesRepo.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`);
    return vehicle;
  }

  async findByPlate(plate: string) {
    const normalized = normalizePlate(plate) as string;
    const vehicle = await this.vehiclesRepo.findOne({
      where: { plate: normalized },
    });
    if (!vehicle)
      throw new NotFoundException(`Vehicle with plate ${normalized} not found`);
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);
    if (dto.plate && dto.plate !== vehicle.plate)
      await this.assertPlateIsFree(dto.plate);
    if (dto.mileage !== undefined && dto.mileage < vehicle.mileage) {
      throw new BadRequestException(
        `Mileage cannot decrease (current: ${vehicle.mileage} km)`,
      );
    }
    Object.assign(vehicle, dto);
    return this.vehiclesRepo.save(vehicle);
  }

  /** Logical deletion: the vehicle and its maintenance history are kept. */
  async deactivate(id: string) {
    const vehicle = await this.findOne(id);
    if (vehicle.status === VehicleStatus.INACTIVE) return vehicle;

    const hasActiveMaintenance = await this.maintenancesRepo.exists({
      where: { vehicleId: id, status: In(ACTIVE_MAINTENANCE_STATUSES) },
    });
    if (hasActiveMaintenance) {
      throw new ConflictException(
        `Vehicle ${vehicle.plate} has an active maintenance and cannot be deactivated`,
      );
    }
    vehicle.status = VehicleStatus.INACTIVE;
    return this.vehiclesRepo.save(vehicle);
  }

  async activate(id: string) {
    const vehicle = await this.findOne(id);
    if (vehicle.status !== VehicleStatus.INACTIVE) return vehicle;
    vehicle.status = VehicleStatus.AVAILABLE;
    return this.vehiclesRepo.save(vehicle);
  }

  private async assertPlateIsFree(plate: string) {
    const exists = await this.vehiclesRepo.exists({
      where: { plate },
      withDeleted: true,
    });
    if (exists)
      throw new ConflictException(`Vehicle with plate ${plate} already exists`);
  }
}
