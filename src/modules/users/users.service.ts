/**
 * [ES] Acceso a datos de usuarios (repositorio TypeORM).
 * [EN] User data access.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Role } from '../../common/enums/role.enum.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  create(data: { name: string; email: string; password: string; role?: Role }) {
    return this.usersRepo.save(this.usersRepo.create(data));
  }

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  /** [ES] Único método que trae el password (select explícito): solo lo usa el login. */
  findByEmailWithPassword(email: string) {
    return this.usersRepo.findOne({
      where: { email },
      select: { id: true, name: true, email: true, role: true, password: true },
    });
  }

  findAll() {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  /** [ES] Busca por id o lanza 404 NotFoundException. */
  async findOne(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}
