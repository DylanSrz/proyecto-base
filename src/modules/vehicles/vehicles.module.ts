/**
 * [ES] Módulo de vehículos. forFeature registra Vehicle y también Maintenance
 * (para consultar si un vehículo tiene mantenimientos activos antes de inactivarlo)
 * sin importar MaintenancesModule, evitando una dependencia circular entre módulos.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Maintenance])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
