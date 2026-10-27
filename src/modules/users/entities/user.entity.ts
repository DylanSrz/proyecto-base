import { Exclude } from 'class-transformer';
import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Role } from '../../../common/enums/role.enum.js';

@Entity('users')
export class User extends AppBaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Exclude() // never serialized in a response
  @Column({ select: false }) // not loaded by regular finds
  password: string;

  @Column({ type: 'enum', enum: Role, default: Role.TECHNICIAN })
  role: Role;
}
