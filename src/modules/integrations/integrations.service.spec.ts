import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaintenanceStatus } from '../../common/enums/maintenance-status.enum.js';
import { MaintenanceType } from '../../common/enums/maintenance-type.enum.js';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { MaintenancesService } from '../maintenances/maintenances.service.js';
import { IntegrationsService } from './integrations.service.js';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  const maintenancesService = { findVehicleHistoryByPlate: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: MaintenancesService, useValue: maintenancesService },
      ],
    }).compile();
    service = moduleRef.get(IntegrationsService);
  });

  it('maps the vehicle history to the public integration format', async () => {
    // Arrange
    maintenancesService.findVehicleHistoryByPlate.mockResolvedValue({
      vehicle: {
        id: 'v1',
        plate: 'ABC123',
        brand: 'Chevrolet',
        model: 'NPR',
        year: 2022,
        mileage: 45100,
        status: VehicleStatus.AVAILABLE,
      },
      maintenances: [
        {
          id: 'mt1',
          type: MaintenanceType.PREVENTIVE,
          status: MaintenanceStatus.COMPLETED,
          description: 'Oil change',
          workPerformed: 'Oil and filters changed',
          mileage: 45000,
          finalMileage: 45100,
          finalCost: 350000,
          scheduledAt: new Date('2026-09-15T14:00:00Z'),
          finishedAt: new Date('2026-09-15T16:30:00Z'),
          mechanic: { id: 'm1', name: 'Carlos Perez', email: 'hidden' },
          workshop: { id: 'w1', name: 'North Workshop', address: 'hidden' },
        },
      ],
    });
    // Act
    const result = await service.getVehicleHistory('abc123');
    // Assert
    expect(result.vehicle).toMatchObject({ plate: 'ABC123', available: true });
    expect(result.maintenances[0]).toMatchObject({
      mileage: 45100,
      cost: 350000,
      mechanic: { id: 'm1', name: 'Carlos Perez' },
      workshop: { id: 'w1', name: 'North Workshop' },
    });
    expect(result.maintenances[0].mechanic).not.toHaveProperty('email');
  });
});
