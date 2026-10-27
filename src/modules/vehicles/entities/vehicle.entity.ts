/**
 * [ES] Entidad Vehicle (tabla vehicles).
 * - plate: UNIQUE en la base de datos (segunda línea de defensa además de la
 *   validación del servicio; si dos peticiones simultáneas crean la misma placa,
 *   el índice único lo impide y el filtro responde 409).
 * - status: AVAILABLE / IN_MAINTENANCE / INACTIVE. Solo el admin cambia entre
 *   AVAILABLE e INACTIVE; IN_MAINTENANCE lo pone el ciclo del mantenimiento.
 * - maintenances: relación 1:N. Relation<T> evita problemas de importación
 *   circular en ESM con relaciones bidireccionales.
 * [EN] Vehicle entity.
 */
import { Column, Entity, OneToMany, type Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { VehicleStatus } from '../../../common/enums/vehicle-status.enum.js';
import { Maintenance } from '../../maintenances/entities/maintenance.entity.js';

@Entity('vehicles')
export class Vehicle extends AppBaseEntity {
  @Column({ unique: true, length: 10 })
  plate: string;

  @Column({ length: 60 })
  brand: string;

  @Column({ length: 60 })
  model: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int', default: 0 })
  mileage: number;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.AVAILABLE,
  })
  status: VehicleStatus;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.vehicle)
  maintenances: Relation<Maintenance[]>;
}
