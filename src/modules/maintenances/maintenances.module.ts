/**
 * [ES] Módulo de mantenimientos. Importa VehiclesModule y MechanicsModule para usar
 * sus servicios. Ellos NO importan este módulo: así no hay dependencia circular.
 * Por eso las rutas /vehicles/:id/maintenances y /mechanics/:id/maintenances se
 * declaran aquí, en controladores propios.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MechanicsModule } from '../mechanics/mechanics.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { MaintenanceStatusLog } from './entities/maintenance-status-log.entity.js';
import { Maintenance } from './entities/maintenance.entity.js';
import { MaintenancesController } from './maintenances.controller.js';
import { MaintenancesService } from './maintenances.service.js';
import { MechanicMaintenancesController } from './mechanic-maintenances.controller.js';
import { VehicleMaintenancesController } from './vehicle-maintenances.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Maintenance, MaintenanceStatusLog]),
    VehiclesModule,
    MechanicsModule,
  ],
  controllers: [
    MaintenancesController,
    VehicleMaintenancesController,
    MechanicMaintenancesController,
  ],
  providers: [MaintenancesService],
  exports: [MaintenancesService],
})
export class MaintenancesModule {}
