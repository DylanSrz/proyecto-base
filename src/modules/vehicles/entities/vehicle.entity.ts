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
