/**
 * [ES] Campos opcionales (PartialType).
 */
import { PartialType } from '@nestjs/swagger';
import { CreateMechanicDto } from './create-mechanic.dto.js';

/** Status is changed through the activate/deactivate endpoints. */
export class UpdateMechanicDto extends PartialType(CreateMechanicDto) {}
