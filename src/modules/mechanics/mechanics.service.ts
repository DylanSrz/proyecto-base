import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository, type FindOptionsWhere } from 'typeorm';
import { ACTIVE_MAINTENANCE_STATUSES } from '../../common/enums/maintenance-status.enum.js';
import { RecordStatus } from '../../common/enums/record-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { paginate } from '../../common/utils/paginate.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { UsersService } from '../users/users.service.js';
import type { CreateMechanicDto } from './dto/create-mechanic.dto.js';
import type { QueryMechanicDto } from './dto/query-mechanic.dto.js';
import type { UpdateMechanicDto } from './dto/update-mechanic.dto.js';
import { Mechanic } from './entities/mechanic.entity.js';

@Injectable()
export class MechanicsService {
  constructor(
    @InjectRepository(Mechanic)
    private readonly mechanicsRepo: Repository<Mechanic>,
    @InjectRepository(Maintenance)
    private readonly maintenancesRepo: Repository<Maintenance>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateMechanicDto) {
    await this.assertEmailIsFree(dto.email);
    if (dto.userId) await this.assertUserCanBeLinked(dto.userId);
    return this.mechanicsRepo.save(this.mechanicsRepo.create(dto));
  }

  async findAll({ page, limit, status, search }: QueryMechanicDto) {
    const base: FindOptionsWhere<Mechanic> = status ? { status } : {};
    const where = search
      ? ['name', 'email', 'specialty'].map((field) => ({
          ...base,
          [field]: ILike(`%${search}%`),
        }))
      : base;
    const [items, total] = await this.mechanicsRepo.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const mechanic = await this.mechanicsRepo.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!mechanic) throw new NotFoundException(`Mechanic ${id} not found`);
    return mechanic;
  }

  /** Mechanic profile of a TECHNICIAN user. */
  async findByUserId(userId: string) {
    const mechanic = await this.mechanicsRepo.findOne({ where: { userId } });
    if (!mechanic) {
      throw new NotFoundException(
        'Your user account is not linked to a mechanic profile',
      );
    }
    return mechanic;
  }

  async update(id: string, dto: UpdateMechanicDto) {
    const mechanic = await this.findOne(id);
    if (dto.email && dto.email !== mechanic.email)
      await this.assertEmailIsFree(dto.email);
    if (dto.userId && dto.userId !== mechanic.userId)
      await this.assertUserCanBeLinked(dto.userId);
    Object.assign(mechanic, dto);
    // Drop the loaded relation so the new userId column value is the one saved
    const { user: _user, ...data } = mechanic;
    return this.mechanicsRepo.save(data);
  }

  /** Inactivation keeps the mechanic and the history of its maintenances. */
  async deactivate(id: string) {
    const mechanic = await this.findOne(id);
    if (mechanic.status === RecordStatus.INACTIVE) return mechanic;

    const hasActiveMaintenances = await this.maintenancesRepo.exists({
      where: { mechanicId: id, status: In(ACTIVE_MAINTENANCE_STATUSES) },
    });
    if (hasActiveMaintenances) {
      throw new ConflictException(
        `Mechanic ${mechanic.name} has active maintenances; complete or cancel them before deactivating`,
      );
    }
    mechanic.status = RecordStatus.INACTIVE;
    return this.mechanicsRepo.save(mechanic);
  }

  async activate(id: string) {
    const mechanic = await this.findOne(id);
    mechanic.status = RecordStatus.ACTIVE;
    return this.mechanicsRepo.save(mechanic);
  }

  private async assertEmailIsFree(email: string) {
    const exists = await this.mechanicsRepo.exists({
      where: { email },
      withDeleted: true,
    });
    if (exists)
      throw new ConflictException(`Mechanic with email ${email} already exists`);
  }

  private async assertUserCanBeLinked(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (user.role !== Role.TECHNICIAN) {
      throw new BadRequestException(
        'Only TECHNICIAN users can be linked to a mechanic',
      );
    }
    const alreadyLinked = await this.mechanicsRepo.exists({
      where: { userId },
    });
    if (alreadyLinked) {
      throw new ConflictException(
        `User ${userId} is already linked to another mechanic`,
      );
    }
  }
}
