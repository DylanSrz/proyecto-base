/**
 * [ES] DTO de paginación reutilizable (?page=1&limit=10). Los DTO de consulta
 * (QueryVehicleDto, QueryMaintenanceDto...) lo extienden.
 * @Type(() => Number) convierte el string del query string a número antes de
 * validar; @Max(100) evita que alguien pida un millón de filas.
 * [EN] Reusable pagination query DTO.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 10
}