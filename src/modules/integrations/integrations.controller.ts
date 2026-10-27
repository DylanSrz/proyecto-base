import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../common/decorators/api-key-auth.decorator.js';
import { IntegrationsService } from './integrations.service.js';

@ApiTags('integrations')
@ApiKeyAuth() // x-api-key instead of JWT for every route of this controller
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('vehicles/:plate/maintenances')
  @ApiOperation({
    summary: 'Vehicle maintenance history for external integrations',
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  getVehicleHistory(@Param('plate') plate: string) {
    return this.integrationsService.getVehicleHistory(plate);
  }
}
