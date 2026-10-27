import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordStatus } from '../../common/enums/record-status.enum.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { Workshop } from './entities/workshop.entity.js';
import { WorkshopsService } from './workshops.service.js';

describe('WorkshopsService', () => {
  let service: WorkshopsService;

  const workshopsRepo = {
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => ({ id: 'w1', ...data })),
    exists: vi.fn(),
    findOne: vi.fn(),
    findAndCount: vi.fn(),
  };
  const maintenancesRepo = { exists: vi.fn() };
  const workshop = () => ({
    id: 'w1',
    name: 'North Workshop',
    address: '123 Main Street',
    status: RecordStatus.ACTIVE,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkshopsService,
        { provide: getRepositoryToken(Workshop), useValue: workshopsRepo },
        {
          provide: getRepositoryToken(Maintenance),
          useValue: maintenancesRepo,
        },
      ],
    }).compile();
    service = moduleRef.get(WorkshopsService);
  });

  it('creates a workshop with a free name', async () => {
    workshopsRepo.exists.mockResolvedValue(false);
    const result = await service.create({ name: 'South', address: 'Av 1' });
    expect(result.id).toBe('w1');
  });

  it('rejects a duplicated name with ConflictException', async () => {
    workshopsRepo.exists.mockResolvedValue(true);
    await expect(
      service.create({ name: 'South', address: 'Av 1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('lists only active workshops by default', async () => {
    workshopsRepo.findAndCount.mockResolvedValue([[workshop()], 1]);
    await service.findAll({ page: 1, limit: 10 });
    expect(workshopsRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: RecordStatus.ACTIVE } }),
    );
  });

  it('lists every workshop when includeInactive is true', async () => {
    workshopsRepo.findAndCount.mockResolvedValue([[], 0]);
    await service.findAll({ page: 1, limit: 10, includeInactive: true });
    expect(workshopsRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('throws NotFoundException for an unknown workshop', async () => {
    workshopsRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deactivates a workshop without active maintenances', async () => {
    workshopsRepo.findOne.mockResolvedValue(workshop());
    maintenancesRepo.exists.mockResolvedValue(false);
    const result = await service.deactivate('w1');
    expect(result.status).toBe(RecordStatus.INACTIVE);
  });

  it('refuses to deactivate a workshop with active maintenances', async () => {
    workshopsRepo.findOne.mockResolvedValue(workshop());
    maintenancesRepo.exists.mockResolvedValue(true);
    await expect(service.deactivate('w1')).rejects.toThrow(ConflictException);
  });

  it('activates an inactive workshop', async () => {
    workshopsRepo.findOne.mockResolvedValue({
      ...workshop(),
      status: RecordStatus.INACTIVE,
    });
    const result = await service.activate('w1');
    expect(result.status).toBe(RecordStatus.ACTIVE);
  });
});
