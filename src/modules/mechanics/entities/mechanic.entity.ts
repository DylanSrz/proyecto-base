import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  type Relation,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { RecordStatus } from '../../../common/enums/record-status.enum.js';
import { Maintenance } from '../../maintenances/entities/maintenance.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('mechanics')
export class Mechanic extends AppBaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ length: 100 })
  specialty: string;

  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE })
  status: RecordStatus;

  // Optional login account (TECHNICIAN) used to see assigned maintenances
  @Column({ name: 'user_id', type: 'uuid', nullable: true, unique: true })
  userId: string | null;

  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.mechanic)
  maintenances: Relation<Maintenance[]>;
}
