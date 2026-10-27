import { PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto.js';

/** Status is not editable here: it changes through activate/deactivate and maintenances. */
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
