/**
 * [ES] Entidad base abstracta (base entity). Todas las entidades la extienden y
 * heredan: id (UUID), createdAt, updatedAt y deletedAt.
 * - @PrimaryGeneratedColumn('uuid'): ids no adivinables (a diferencia de 1,2,3).
 * - @CreateDateColumn/@UpdateDateColumn: TypeORM las llena solo.
 * - @DeleteDateColumn: habilita soft delete (borrado lógico). Los find normales
 *   excluyen filas con deletedAt != null. En este proyecto vehículos, mecánicos y
 *   talleres se INACTIVAN con un status en lugar de borrarse, para no perder
 *   el historial de mantenimientos.
 * [EN] Abstract base entity with uuid id, timestamps and soft-delete column.
 */
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class AppBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
  })
  deletedAt: Date | null;
}
