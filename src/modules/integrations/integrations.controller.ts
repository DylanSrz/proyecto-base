/**
 * [ES] Endpoint para sistemas externos: GET /api/integrations/vehicles/:plate/maintenances.
 * @ApiKeyAuth() a nivel de CLASE: todas las rutas de este controlador usan
 * x-api-key en lugar de JWT. Un JWT válido aquí NO sirve (401): son mecanismos
 * de autenticación distintos para consumidores distintos.
 * [EN] External integrations controller (x-api-key).
 */
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
