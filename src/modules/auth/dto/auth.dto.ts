/**
 * [ES] DTOs de autenticación (Data Transfer Objects).
 * Los decoradores de class-validator los usa ValidationPipe para responder 400
 * si el formato es inválido. @Transform normaliza el email (trim + minúsculas)
 * ANTES de validar, para que "Ana@Mail.com " y "ana@mail.com" sean el mismo.
 * RegisterDto NO tiene campo role: con forbidNonWhitelisted, enviar "role" -> 400.
 * [EN] Register/login DTOs.
 */
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const toLowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** [ES] Body de POST /auth/register. */
export class RegisterDto {
  @ApiProperty({ example: 'Carlos Perez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'carlos@fleetcore.com' })
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'Secret1234' })
  @IsString()
  @MinLength(8)
  // [ES] Regex: al menos una mayúscula (?=.*[A-Z]) y un dígito (?=.*\d).
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain at least one uppercase letter and one number',
  })
  password: string;
}

/** [ES] Body de POST /auth/login. */
export class LoginDto {
  @ApiProperty({ example: 'carlos@fleetcore.com' })
  @Transform(toLowerTrim)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secret1234' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
