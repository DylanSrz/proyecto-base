import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';

@Entity()
export class Product extends AppBaseEntity {
  @Column()
  name: string;

  @Column()
  price: number;
}
