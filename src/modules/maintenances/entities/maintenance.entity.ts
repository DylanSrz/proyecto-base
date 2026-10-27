/**
 * [ES] Entidad Maintenance (tabla maintenances): el corazón del sistema.
 * - Relaciones N:1 con Vehicle, Mechanic y Workshop. onDelete RESTRICT: la BD
 *   impide borrar un vehículo/mecánico/taller con mantenimientos (protege el historial).
 * - scheduledAt + estimatedEndAt: rango horario usado para detectar cruces.
 * - startedAt: se llena al pasar a IN_PROGRESS.
 * - workPerformed, finalCost, finishedAt, finalMileage: datos de CIERRE, nulos
 *   hasta completar (obligatorios para pasar a COMPLETED).
 * - Índices compuestos (vehicleId, status) y (mechanicId, status): aceleran las
 *   consultas de "mantenimientos activos" de un vehículo o de un mecánico.
 * [EN] Maintenance entity.
 */
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { MaintenanceStatus } from '../../../common/enums/maintenance-status.enum.js';
import { MaintenanceType } from '../../../common/enums/maintenance-type.enum.js';
import { numericTransformer } from '../../../common/utils/numeric.transformer.js';
import { Mechanic } from '../../mechanics/entities/mechanic.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { Workshop } from '../../workshops/entities/workshop.entity.js';
import { MaintenanceStatusLog } from './maintenance-status-log.entity.js';

@Entity('maintenances')
@Index(['vehicleId', 'status'])
@Index(['mechanicId', 'status'])
export class Maintenance extends AppBaseEntity {
  @Column({ type: 'enum', enum: MaintenanceType })
  type: MaintenanceType;

  @Column({ type: 'text' })
  description: string;

  // Vehicle mileage when the maintenance was registered
  @Column({ type: 'int' })
  mileage: number;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ name: 'estimated_end_at', type: 'timestamptz' })
  estimatedEndAt: Date;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  // Closing information, required to complete the maintenance
  @Column({ name: 'work_performed', type: 'text', nullable: true })
  workPerformed: string | null;

  @Column({
    name: 'final_cost',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  finalCost: number | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'final_mileage', type: 'int', nullable: true })
  finalMileage: number | null;

  // [ES] La FK se expone como columna (vehicleId) además de la relación: permite filtrar y crear sin cargar la entidad.
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenances, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Relation<Vehicle>;

  @Column({ name: 'mechanic_id', type: 'uuid' })
  mechanicId: string;

  @ManyToOne(() => Mechanic, (mechanic) => mechanic.maintenances, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'mechanic_id' })
  mechanic: Relation<Mechanic>;

  @Column({ name: 'workshop_id', type: 'uuid' })
  workshopId: string;

  @ManyToOne(() => Workshop, (workshop) => workshop.maintenances, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'workshop_id' })
  workshop: Relation<Workshop>;

  @OneToMany(() => MaintenanceStatusLog, (log) => log.maintenance)
  statusLogs: Relation<MaintenanceStatusLog[]>;
}
