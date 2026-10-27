/**
 * [ES] Filtros del listado de mecánicos: paginación + status + búsqueda.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { RecordStatus } from '../../../common/enums/record-status.enum.js';

export class QueryMechanicDto extends PaginationDto {
  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @ApiPropertyOptional({ description: 'Searches name, email or specialty' })
  @IsOptional()
  @IsString()
  search?: string;
}
