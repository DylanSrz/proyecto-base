import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { MaintenanceStatus } from '../../../common/enums/maintenance-status.enum.js';
import { User } from '../../users/entities/user.entity.js';
import { Maintenance } from './maintenance.entity.js';

/** Audit trail: one row per status change of a maintenance. */
@Entity('maintenance_status_logs')
export class MaintenanceStatusLog extends AppBaseEntity {
  @Column({ name: 'maintenance_id', type: 'uuid' })
  maintenanceId: string;

  @ManyToOne(() => Maintenance, (maintenance) => maintenance.statusLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'maintenance_id' })
  maintenance: Relation<Maintenance>;

  // null for the creation entry
  @Column({
    name: 'from_status',
    type: 'enum',
    enum: MaintenanceStatus,
    nullable: true,
  })
  fromStatus: MaintenanceStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: MaintenanceStatus })
  toStatus: MaintenanceStatus;

  @Column({ name: 'changed_by_id', type: 'uuid', nullable: true })
  changedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy: Relation<User> | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
