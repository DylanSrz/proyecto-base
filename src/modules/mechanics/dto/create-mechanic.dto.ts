import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const toLowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateMechanicDto {
  @ApiProperty({ example: 'Carlos Perez' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'carlos.perez@fleetcore.com' })
  @Transform(toLowerTrim)
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({ example: 'Engines' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  specialty: string;

  @ApiPropertyOptional({
    description: 'TECHNICIAN user account linked to this mechanic',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
