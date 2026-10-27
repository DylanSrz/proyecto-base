import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Auth() // any authenticated user
  @Get('me') // must be declared BEFORE ':id' or ':id' would match it
  me(@CurrentUser('sub') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Auth(Role.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Auth(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }
}
