/**
 * [ES] Controlador de mecánicos: gestión para ADMIN y /mechanics/me para el TECHNICIAN.
 */
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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { CreateMechanicDto } from './dto/create-mechanic.dto.js';
import { QueryMechanicDto } from './dto/query-mechanic.dto.js';
import { UpdateMechanicDto } from './dto/update-mechanic.dto.js';
import { MechanicsService } from './mechanics.service.js';

@ApiTags('mechanics')
@Controller('mechanics')
export class MechanicsController {
  constructor(private readonly mechanicsService: MechanicsService) {}

  @Auth(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Register a mechanic' })
  @ApiConflictResponse({ description: 'Email or user already in use' })
  create(@Body() dto: CreateMechanicDto) {
    return this.mechanicsService.create(dto);
  }

  @Auth(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List mechanics (paginated)' })
  findAll(@Query() query: QueryMechanicDto) {
    return this.mechanicsService.findAll(query);
  }

  @Auth(Role.TECHNICIAN)
  // [ES] El id del usuario sale del token (@CurrentUser('sub')), no de la URL: nadie puede pedir el perfil de otro.
  @Get('me') // declared before ':id' so it is not captured by it
  @ApiOperation({ summary: 'Mechanic profile of the logged-in technician' })
  @ApiNotFoundResponse({ description: 'User not linked to a mechanic' })
  me(@CurrentUser('sub') userId: string) {
    return this.mechanicsService.findByUserId(userId);
  }

  @Auth(Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get a mechanic by id' })
  @ApiNotFoundResponse({ description: 'Mechanic not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mechanicsService.findOne(id);
  }

  @Auth(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update mechanic data' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMechanicDto,
  ) {
    return this.mechanicsService.update(id, dto);
  }

  @Auth(Role.ADMIN)
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a mechanic (history is kept)' })
  @ApiConflictResponse({ description: 'Mechanic has active maintenances' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.mechanicsService.deactivate(id);
  }

  @Auth(Role.ADMIN)
  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a mechanic' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.mechanicsService.activate(id);
  }
}
