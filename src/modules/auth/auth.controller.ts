/**
 * [ES] Controlador de autenticación: POST /api/auth/register y /api/auth/login.
 * Ambas rutas son @Public() porque todavía no hay token.
 * El controlador solo recibe el DTO validado y delega al servicio (thin controller).
 * [EN] Public register/login endpoints.
 */
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  // [ES] Un POST responde 201 por defecto; login no crea nada, por eso se fuerza 200.
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
