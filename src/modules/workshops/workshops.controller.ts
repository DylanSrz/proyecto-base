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
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { QueryWorkshopDto } from './dto/query-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { WorkshopsService } from './workshops.service.js';

@ApiTags('workshops')
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Auth(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Register a workshop' })
  @ApiConflictResponse({ description: 'Workshop name already registered' })
  create(@Body() dto: CreateWorkshopDto) {
    return this.workshopsService.create(dto);
  }

  @Auth(Role.ADMIN, Role.TECHNICIAN)
  @Get()
  @ApiOperation({ summary: 'List active workshops (paginated)' })
  findAll(@Query() query: QueryWorkshopDto, @CurrentUser('role') role: Role) {
    // Only administrators may see inactive workshops
    const includeInactive = role === Role.ADMIN && query.includeInactive;
    return this.workshopsService.findAll({ ...query, includeInactive });
  }

  @Auth(Role.ADMIN, Role.TECHNICIAN)
  @Get(':id')
  @ApiOperation({ summary: 'Get a workshop by id' })
  @ApiNotFoundResponse({ description: 'Workshop not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workshopsService.findOne(id);
  }

  @Auth(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update workshop data' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkshopDto,
  ) {
    return this.workshopsService.update(id, dto);
  }

  @Auth(Role.ADMIN)
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a workshop' })
  @ApiConflictResponse({ description: 'Workshop has active maintenances' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.workshopsService.deactivate(id);
  }

  @Auth(Role.ADMIN)
  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a workshop' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.workshopsService.activate(id);
  }
}
