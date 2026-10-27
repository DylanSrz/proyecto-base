import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const normalizePlate = (value: unknown) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC123', description: 'Unique license plate' })
  @Transform(({ value }) => normalizePlate(value))
  @IsString()
  @Matches(/^[A-Z0-9-]{5,10}$/, {
    message: 'plate must have 5 to 10 letters, digits or dashes',
  })
  plate: string;

  @ApiProperty({ example: 'Chevrolet' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  brand: string;

  @ApiProperty({ example: 'NPR' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  model: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(1950)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({ example: 45000, description: 'Current mileage in km' })
  @IsInt()
  @Min(0)
  mileage: number;
}
