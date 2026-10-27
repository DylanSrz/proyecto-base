import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ACTIVE_MAINTENANCE_STATUSES } from '../../common/enums/maintenance-status.enum.js';
import { RecordStatus } from '../../common/enums/record-status.enum.js';
import { paginate } from '../../common/utils/paginate.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import type { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import type { QueryWorkshopDto } from './dto/query-workshop.dto.js';
import type { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { Workshop } from './entities/workshop.entity.js';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopsRepo: Repository<Workshop>,
    @InjectRepository(Maintenance)
    private readonly maintenancesRepo: Repository<Maintenance>,
  ) {}

  async create(dto: CreateWorkshopDto) {
    await this.assertNameIsFree(dto.name);
    return this.workshopsRepo.save(this.workshopsRepo.create(dto));
  }

  /** Lists active workshops; inactive ones only when explicitly requested. */
  async findAll({ page, limit, includeInactive }: QueryWorkshopDto) {
    const [items, total] = await this.workshopsRepo.findAndCount({
      where: includeInactive ? {} : { status: RecordStatus.ACTIVE },
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const workshop = await this.workshopsRepo.findOne({ where: { id } });
    if (!workshop) throw new NotFoundException(`Workshop ${id} not found`);
    return workshop;
  }

  async update(id: string, dto: UpdateWorkshopDto) {
    const workshop = await this.findOne(id);
    if (dto.name && dto.name !== workshop.name)
      await this.assertNameIsFree(dto.name);
    Object.assign(workshop, dto);
    return this.workshopsRepo.save(workshop);
  }

  async deactivate(id: string) {
    const workshop = await this.findOne(id);
    if (workshop.status === RecordStatus.INACTIVE) return workshop;

    const hasActiveMaintenances = await this.maintenancesRepo.exists({
      where: { workshopId: id, status: In(ACTIVE_MAINTENANCE_STATUSES) },
    });
    if (hasActiveMaintenances) {
      throw new ConflictException(
        `Workshop ${workshop.name} has active maintenances and cannot be deactivated`,
      );
    }
    workshop.status = RecordStatus.INACTIVE;
    return this.workshopsRepo.save(workshop);
  }

  async activate(id: string) {
    const workshop = await this.findOne(id);
    workshop.status = RecordStatus.ACTIVE;
    return this.workshopsRepo.save(workshop);
  }

  private async assertNameIsFree(name: string) {
    const exists = await this.workshopsRepo.exists({
      where: { name },
      withDeleted: true,
    });
    if (exists)
      throw new ConflictException(`Workshop with name ${name} already exists`);
  }
}
