/**
 * [ES] Adapta el historial interno a un formato PÚBLICO y compacto (como el
 * ejemplo del enunciado): solo id y nombre de mecánico y taller, sin emails ni
 * datos internos. Separar este "mapeo" protege la API externa de cambios internos.
 * [EN] Maps vehicle history to the public integration format.
 */
import { Injectable } from '@nestjs/common';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { MaintenancesService } from '../maintenances/maintenances.service.js';

@Injectable()
export class IntegrationsService {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  /** Compact vehicle history for external partners (no internal fields). */
  async getVehicleHistory(plate: string) {
    const { vehicle, maintenances } =
      await this.maintenancesService.findVehicleHistoryByPlate(plate);

    return {
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        mileage: vehicle.mileage,
        status: vehicle.status,
        // [ES] Campo derivado útil para el partner: ¿el vehículo está disponible?
        available: vehicle.status === VehicleStatus.AVAILABLE,
      },
      maintenances: maintenances.map((m) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        description: m.description,
        workPerformed: m.workPerformed,
        // [ES] Si está cerrado se informa el kilometraje final; si no, el registrado al crear.
        mileage: m.finalMileage ?? m.mileage,
        cost: m.finalCost,
        scheduledAt: m.scheduledAt,
        finishedAt: m.finishedAt,
        mechanic: { id: m.mechanic.id, name: m.mechanic.name },
        workshop: { id: m.workshop.id, name: m.workshop.name },
      })),
    };
  }
}
