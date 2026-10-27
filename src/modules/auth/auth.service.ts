/**
 * [ES] Lógica de autenticación.
 * - register: email único (409), hashea la contraseña con bcrypt (nunca se
 *   guarda en texto plano) y crea SIEMPRE un TECHNICIAN.
 * - login: busca el usuario CON password (select: false la oculta por defecto),
 *   compara con bcrypt.compare y devuelve un JWT.
 * [EN] Registration and login logic.
 */
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Role } from '../../common/enums/role.enum.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import type { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /** [ES] Registra un técnico y devuelve token + datos públicos del usuario. 409 si el email existe. */
  async register(dto: RegisterDto) {
    const exists = await this.usersService.findByEmail(dto.email);
    if (exists) throw new ConflictException('Email is already registered');

    // [ES] bcrypt con cost 10: hash lento a propósito (dificulta fuerza bruta) y con salt incluido.
    const password = await hash(dto.password, 10);
    // Public sign-up always creates a technician; the admin comes from the seed
    const user = await this.usersService.create({
      ...dto,
      password,
      role: Role.TECHNICIAN,
    });
    return this.buildAuthResponse(user);
  }

  /** [ES] Valida credenciales y emite el JWT. 401 con el mismo mensaje si falla email o password. */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !(await compare(dto.password, user.password))) {
      // [ES] Mismo mensaje en ambos casos: no revela si el email existe (evita enumeración de usuarios).
      throw new UnauthorizedException('Invalid credentials'); // same message for both cases
    }
    return this.buildAuthResponse(user);
  }

  /** [ES] Firma el JWT con { sub, email, role } y arma la respuesta SIN password. */
  private async buildAuthResponse(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
