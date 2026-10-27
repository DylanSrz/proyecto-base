import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class QueryWorkshopDto extends PaginationDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Admin only: include inactive workshops',
  })
  @IsOptional()
  // Read the raw query value: implicit conversion would turn "false" into true
  @Transform(({ obj, key }) => {
    const raw = (obj as Record<string, unknown>)[key];
    return raw === true || raw === 'true';
  })
  @IsBoolean()
  includeInactive?: boolean;
}
