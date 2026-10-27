import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { VehicleStatus } from '../../../common/enums/vehicle-status.enum.js';

export class QueryVehicleDto extends PaginationDto {
  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ description: 'Searches plate, brand or model' })
  @IsOptional()
  @IsString()
  search?: string;
}
