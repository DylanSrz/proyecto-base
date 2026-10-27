/**
 * [ES] PartialType (de @nestjs/swagger) vuelve opcionales todos los campos del
 * CreateVehicleDto conservando sus validaciones y la documentación Swagger.
 * No incluye status: el estado no se edita libremente.
 */
import { PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto.js';

/** Status is not editable here: it changes through activate/deactivate and maintenances. */
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
