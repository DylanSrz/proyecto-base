/**
 * [ES] Tests unitarios de MechanicsService. UsersService también se reemplaza por un mock.
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordStatus } from '../../common/enums/record-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { UsersService } from '../users/users.service.js';
import { Mechanic } from './entities/mechanic.entity.js';
import { MechanicsService } from './mechanics.service.js';

describe('MechanicsService', () => {
  let service: MechanicsService;

  const mechanicsRepo = {
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => ({ id: 'm1', ...data })),
    exists: vi.fn(),
    findOne: vi.fn(),
    findAndCount: vi.fn(),
  };
  const maintenancesRepo = { exists: vi.fn() };
  const usersService = { findOne: vi.fn() };
  const dto = {
    name: 'Carlos Perez',
    email: 'carlos@fleetcore.com',
    specialty: 'Engines',
  };
  const mechanic = () => ({
    id: 'm1',
    ...dto,
    status: RecordStatus.ACTIVE,
    userId: null,
    user: null,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MechanicsService,
        { provide: getRepositoryToken(Mechanic), useValue: mechanicsRepo },
        {
          provide: getRepositoryToken(Maintenance),
          useValue: maintenancesRepo,
        },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = moduleRef.get(MechanicsService);
  });

  describe('create', () => {
    it('creates a mechanic with a free email', async () => {
      mechanicsRepo.exists.mockResolvedValue(false);
      const result = await service.create(dto);
      expect(result.id).toBe('m1');
    });

    it('rejects a duplicated email', async () => {
      mechanicsRepo.exists.mockResolvedValue(true);
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('links a TECHNICIAN user that is not linked yet', async () => {
      mechanicsRepo.exists.mockResolvedValue(false);
      usersService.findOne.mockResolvedValue({
        id: 'u1',
        role: Role.TECHNICIAN,
      });
      const result = await service.create({ ...dto, userId: 'u1' });
      expect(result.userId).toBe('u1');
    });

    it('rejects linking an ADMIN user', async () => {
      mechanicsRepo.exists.mockResolvedValue(false);
      usersService.findOne.mockResolvedValue({ id: 'u1', role: Role.ADMIN });
      await expect(service.create({ ...dto, userId: 'u1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a user already linked to another mechanic', async () => {
      mechanicsRepo.exists
        // [ES] mockResolvedValueOnce encadenado: 1ª llamada a exists() = false, 2ª = true.
        .mockResolvedValueOnce(false) // email check
        .mockResolvedValueOnce(true); // user already linked
      usersService.findOne.mockResolvedValue({
        id: 'u1',
        role: Role.TECHNICIAN,
      });
      await expect(service.create({ ...dto, userId: 'u1' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  it('findByUserId throws NotFoundException when the user has no profile', async () => {
    mechanicsRepo.findOne.mockResolvedValue(null);
    await expect(service.findByUserId('u1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update saves the new data', async () => {
    mechanicsRepo.findOne.mockResolvedValue(mechanic());
    const result = await service.update('m1', { specialty: 'Brakes' });
    expect(result.specialty).toBe('Brakes');
  });

  describe('deactivate', () => {
    it('sets INACTIVE when there are no active maintenances', async () => {
      mechanicsRepo.findOne.mockResolvedValue(mechanic());
      maintenancesRepo.exists.mockResolvedValue(false);
      const result = await service.deactivate('m1');
      expect(result.status).toBe(RecordStatus.INACTIVE);
    });

    it('throws ConflictException when there are active maintenances', async () => {
      mechanicsRepo.findOne.mockResolvedValue(mechanic());
      maintenancesRepo.exists.mockResolvedValue(true);
      await expect(service.deactivate('m1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  it('activate sets ACTIVE', async () => {
    mechanicsRepo.findOne.mockResolvedValue({
      ...mechanic(),
      status: RecordStatus.INACTIVE,
    });
    const result = await service.activate('m1');
    expect(result.status).toBe(RecordStatus.ACTIVE);
  });
});
