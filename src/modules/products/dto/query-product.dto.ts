import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationDto } from "../../../common/dto/pagination.dto.js";
import { IsOptional, IsString } from "class-validator";

export class QueryProductDto extends PaginationDto {
    @ApiPropertyOptional({ example: 'teclado' })
    @IsOptional()
    @IsString()
    search?: string
}