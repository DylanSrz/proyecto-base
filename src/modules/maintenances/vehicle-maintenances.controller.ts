import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { MaintenancesService } from './maintenances.service.js';

/** /vehicles/:id/maintenances lives here to keep VehiclesModule free of this dependency. */
@ApiTags('vehicles')
@Controller('vehicles')
export class VehicleMaintenancesController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Auth(Role.ADMIN)
  @Get(':id/maintenances')
  @ApiOperation({ summary: 'Maintenance history of a vehicle' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenancesService.findVehicleHistory(id);
  }
}
