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
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { QueryVehicleDto } from './dto/query-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { VehiclesService } from './vehicles.service.js';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Auth(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Register a vehicle' })
  @ApiConflictResponse({ description: 'Plate already registered' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Auth(Role.ADMIN, Role.TECHNICIAN)
  @Get()
  @ApiOperation({ summary: 'List vehicles (paginated)' })
  findAll(@Query() query: QueryVehicleDto) {
    return this.vehiclesService.findAll(query);
  }

  @Auth(Role.ADMIN, Role.TECHNICIAN)
  @Get('plate/:plate') // declared before ':id' so it is not captured by it
  @ApiOperation({ summary: 'Get a vehicle by plate' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  findByPlate(@Param('plate') plate: string) {
    return this.vehiclesService.findByPlate(plate);
  }

  @Auth(Role.ADMIN, Role.TECHNICIAN)
  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle by id' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Auth(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle data (not its status)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  @Auth(Role.ADMIN)
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a vehicle (logical deletion)' })
  @ApiConflictResponse({ description: 'Vehicle has an active maintenance' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.deactivate(id);
  }

  @Auth(Role.ADMIN)
  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivate an inactive vehicle' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.activate(id);
  }
}
