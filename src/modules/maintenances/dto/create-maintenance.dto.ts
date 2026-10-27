import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { MaintenanceType } from '../../../common/enums/maintenance-type.enum.js';

export class CreateMaintenanceDto {
  @ApiProperty({ enum: MaintenanceType, example: MaintenanceType.PREVENTIVE })
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @ApiProperty({ example: 'Oil and filter change' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    example: 45000,
    description: 'Vehicle mileage; cannot be lower than the current one',
  })
  @IsInt()
  @Min(0)
  mileage: number;

  @ApiProperty({ example: '2026-11-03T07:30:00.000Z' })
  @Type(() => Date)
  @IsDate()
  scheduledAt: Date;

  @ApiProperty({
    example: '2026-11-03T09:00:00.000Z',
    description: 'Expected end; used to prevent overlapping schedules',
  })
  @Type(() => Date)
  @IsDate()
  estimatedEndAt: Date;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  mechanicId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  workshopId: string;
}
