/**
 * [ES] Entidad Workshop (tabla workshops). name UNIQUE; status ACTIVE/INACTIVE. 1:N con Maintenance.
 */
import { Column, Entity, OneToMany, type Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { RecordStatus } from '../../../common/enums/record-status.enum.js';
import { Maintenance } from '../../maintenances/entities/maintenance.entity.js';

@Entity('workshops')
export class Workshop extends AppBaseEntity {
  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ length: 200 })
  address: string;

  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE })
  status: RecordStatus;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.workshop)
  maintenances: Relation<Maintenance[]>;
}
