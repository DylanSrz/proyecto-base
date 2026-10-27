/**
 * [ES] Todos los campos opcionales (PartialType). El status se cambia con activate/deactivate.
 */
import { PartialType } from '@nestjs/swagger';
import { CreateWorkshopDto } from './create-workshop.dto.js';

export class UpdateWorkshopDto extends PartialType(CreateWorkshopDto) {}
