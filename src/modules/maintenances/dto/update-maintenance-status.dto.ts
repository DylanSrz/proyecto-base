import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MaintenanceStatus } from '../../../common/enums/maintenance-status.enum.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * New status for a maintenance. The closing fields (workPerformed, finalCost,
 * finishedAt, finalMileage) are required to move to COMPLETED and are not
 * accepted for any other status.
 */
export class UpdateMaintenanceStatusDto {
  @ApiProperty({ enum: MaintenanceStatus, example: MaintenanceStatus.COMPLETED })
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;

  @ApiPropertyOptional({ example: 'Changed oil, oil filter and air filter' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  workPerformed?: string;

  @ApiPropertyOptional({ example: 350000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalCost?: number;

  @ApiPropertyOptional({ example: '2026-11-03T08:45:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  finishedAt?: Date;

  @ApiPropertyOptional({ example: 45010 })
  @IsOptional()
  @IsInt()
  @Min(0)
  finalMileage?: number;

  @ApiPropertyOptional({ description: 'Optional comment stored in the audit log' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export const CLOSING_FIELDS = [
  'workPerformed',
  'finalCost',
  'finishedAt',
  'finalMileage',
] as const;
