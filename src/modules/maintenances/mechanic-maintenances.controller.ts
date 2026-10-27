/**
 * [ES] Mantenimientos asignados a un mecánico: GET /mechanics/:id/maintenances (ADMIN).
 */
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto.js';
import { MaintenancesService } from './maintenances.service.js';

/** /mechanics/:id/maintenances lives here to keep MechanicsModule free of this dependency. */
@ApiTags('mechanics')
@Controller('mechanics')
export class MechanicMaintenancesController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Auth(Role.ADMIN)
  @Get(':id/maintenances')
  @ApiOperation({ summary: 'Maintenances assigned to a mechanic' })
  @ApiNotFoundResponse({ description: 'Mechanic not found' })
  findByMechanic(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMaintenanceDto,
  ) {
    return this.maintenancesService.findByMechanic(id, query);
  }
}
