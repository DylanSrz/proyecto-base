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
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain at least one uppercase letter and one number',
  })
  password: string;
}

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
