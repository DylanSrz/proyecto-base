import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto.js';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto.js';
import { MaintenancesService } from './maintenances.service.js';

@ApiTags('maintenances')
@Controller('maintenances')
export class MaintenancesController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Auth(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Schedule a maintenance (initial status SCHEDULED)' })
  @ApiNotFoundResponse({ description: 'Vehicle, mechanic or workshop not found' })
  @ApiConflictResponse({
    description:
      'Inactive vehicle/mechanic/workshop, vehicle busy or overlapping mechanic schedule',
  })
  @ApiBadRequestResponse({ description: 'Invalid dates or mileage' })
  create(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.maintenancesService.create(dto, userId);
  }

  @Auth(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List maintenances with filters (paginated)' })
  findAll(@Query() query: QueryMaintenanceDto) {
    return this.maintenancesService.findAll(query);
  }

  @Auth(Role.ADMIN)
  @Get('active') // static routes are declared before ':id'
  @ApiOperation({ summary: 'List active maintenances (SCHEDULED, IN_PROGRESS)' })
  findActive(@Query() query: PaginationDto) {
    return this.maintenancesService.findActive(query);
  }

  @Auth(Role.TECHNICIAN)
  @Get('mine')
  @ApiOperation({ summary: 'Maintenances assigned to the logged-in technician' })
  findMine(
    @Query() query: QueryMaintenanceDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.maintenancesService.findMine(userId, query);
  }

  @Auth(Role.ADMIN, Role.TECHNICIAN)
  @Get(':id')
  @ApiOperation({
    summary: 'Get a maintenance (technicians only their assigned ones)',
  })
  @ApiNotFoundResponse({ description: 'Maintenance not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.maintenancesService.findOne(id, user);
  }

  @Auth(Role.ADMIN)
  @Get(':id/audit')
  @ApiOperation({ summary: 'Audit trail of status changes' })
  findAudit(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenancesService.findAudit(id);
  }

  @Auth(Role.ADMIN, Role.TECHNICIAN)
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change the status of a maintenance',
    description:
      'Allowed: SCHEDULED→IN_PROGRESS, SCHEDULED→CANCELLED, IN_PROGRESS→COMPLETED, IN_PROGRESS→CANCELLED. ' +
      'COMPLETED requires workPerformed, finalCost, finishedAt and finalMileage. ' +
      'Technicians can only start or complete their own maintenances.',
  })
  @ApiConflictResponse({ description: 'Invalid status transition' })
  @ApiBadRequestResponse({ description: 'Missing or invalid closing information' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.maintenancesService.updateStatus(id, dto, user);
  }
}
