/**
 * [ES] Tests unitarios de VehiclesService (Vitest, patrón AAA: Arrange-Act-Assert).
 * Los repositorios se reemplazan por objetos con vi.fn() (mocks) mediante
 * getRepositoryToken(Entidad): así se prueba SOLO la lógica del servicio, sin BD.
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesService } from './vehicles.service.js';

describe('VehiclesService', () => {
  let service: VehiclesService;

  const vehiclesRepo = {
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => ({ id: 'v1', ...data })),
    exists: vi.fn(),
    findOne: vi.fn(),
    findAndCount: vi.fn(),
  };
  const maintenancesRepo = { exists: vi.fn() };
  const vehicle = () => ({
    id: 'v1',
    plate: 'ABC123',
    brand: 'Chevrolet',
    model: 'NPR',
    year: 2022,
    mileage: 45000,
    status: VehicleStatus.AVAILABLE,
  });

  // [ES] Antes de cada test: limpia mocks y crea un módulo de testing con los mocks inyectados.
  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(Vehicle), useValue: vehiclesRepo },
        {
          provide: getRepositoryToken(Maintenance),
          useValue: maintenancesRepo,
        },
      ],
    }).compile();
    service = moduleRef.get(VehiclesService);
  });

  describe('create', () => {
    it('creates an AVAILABLE vehicle when the plate is free', async () => {
      // Arrange
      vehiclesRepo.exists.mockResolvedValue(false);
      const { id: _id, status: _status, ...dto } = vehicle();
      // Act
      const result = await service.create(dto);
      // Assert
      expect(result.status).toBe(VehicleStatus.AVAILABLE);
      expect(vehiclesRepo.save).toHaveBeenCalled();
    });

    it('throws ConflictException when the plate already exists', async () => {
      vehiclesRepo.exists.mockResolvedValue(true);
      const { id: _id, status: _status, ...dto } = vehicle();
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(vehiclesRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns items with pagination meta', async () => {
      vehiclesRepo.findAndCount.mockResolvedValue([[vehicle()], 11]);
      const result = await service.findAll({ page: 2, limit: 5 });
      expect(result.meta).toEqual({
        total: 11,
        page: 2,
        limit: 5,
        totalPages: 3,
      });
      expect(vehiclesRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('findByPlate', () => {
    it('normalizes the plate before searching', async () => {
      vehiclesRepo.findOne.mockResolvedValue(vehicle());
      await service.findByPlate(' abc123 ');
      expect(vehiclesRepo.findOne).toHaveBeenCalledWith({
        where: { plate: 'ABC123' },
      });
    });

    it('throws NotFoundException when no vehicle has the plate', async () => {
      vehiclesRepo.findOne.mockResolvedValue(null);
      await expect(service.findByPlate('ZZZ999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a mileage lower than the current one', async () => {
      vehiclesRepo.findOne.mockResolvedValue(vehicle());
      await expect(service.update('v1', { mileage: 100 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a plate already used by another vehicle', async () => {
      vehiclesRepo.findOne.mockResolvedValue(vehicle());
      vehiclesRepo.exists.mockResolvedValue(true);
      await expect(service.update('v1', { plate: 'XYZ987' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('saves the new data', async () => {
      vehiclesRepo.findOne.mockResolvedValue(vehicle());
      const result = await service.update('v1', { mileage: 50000 });
      expect(result.mileage).toBe(50000);
    });
  });

  describe('deactivate', () => {
    it('sets INACTIVE when there is no active maintenance', async () => {
      vehiclesRepo.findOne.mockResolvedValue(vehicle());
      maintenancesRepo.exists.mockResolvedValue(false);
      const result = await service.deactivate('v1');
      expect(result.status).toBe(VehicleStatus.INACTIVE);
    });

    it('throws ConflictException when the vehicle has an active maintenance', async () => {
      vehiclesRepo.findOne.mockResolvedValue(vehicle());
      maintenancesRepo.exists.mockResolvedValue(true);
      await expect(service.deactivate('v1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('activate', () => {
    it('turns an INACTIVE vehicle into AVAILABLE', async () => {
      vehiclesRepo.findOne.mockResolvedValue({
        ...vehicle(),
        status: VehicleStatus.INACTIVE,
      });
      const result = await service.activate('v1');
      expect(result.status).toBe(VehicleStatus.AVAILABLE);
    });

    it('does not touch a vehicle that is IN_MAINTENANCE', async () => {
      vehiclesRepo.findOne.mockResolvedValue({
        ...vehicle(),
        status: VehicleStatus.IN_MAINTENANCE,
      });
      const result = await service.activate('v1');
      expect(result.status).toBe(VehicleStatus.IN_MAINTENANCE);
      expect(vehiclesRepo.save).not.toHaveBeenCalled();
    });
  });
});
