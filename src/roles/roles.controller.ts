import { Controller, Post, Get, Put, Param, Body, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: RequestWithUser, @Body() dto: CreateRoleDto) {
    const role = await this.rolesService.createRole(req.user.sub, dto);
    return { statusCode: HttpStatus.OK, data: role };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(@Request() req: RequestWithUser) {
    const roles = await this.rolesService.getRoles(req.user.sub);
    return { statusCode: HttpStatus.OK, data: roles };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Request() req: RequestWithUser, @Param('id') id: string) {
    const role = await this.rolesService.getRoleById(req.user.sub, id);
    return { statusCode: HttpStatus.OK, data: role };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const role = await this.rolesService.updateRole(req.user.sub, id, dto);
    return { statusCode: HttpStatus.OK, data: role };
  }

  @Post('users/:userId/roles')
  @UseGuards(JwtAuthGuard)
  async assignRole(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    const userRole = await this.rolesService.assignRole(req.user.sub, userId, dto);
    return { statusCode: HttpStatus.OK, data: userRole };
  }

  @Post('users/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  async grantPermission(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: GrantPermissionDto,
  ) {
    const permission = await this.rolesService.grantPermission(req.user.sub, userId, dto);
    return { statusCode: HttpStatus.OK, data: permission };
  }

  @Get('users/:userId/roles')
  @UseGuards(JwtAuthGuard)
  async getUserRoles(@Request() req: RequestWithUser, @Param('userId') userId: string) {
    const roles = await this.rolesService.getUserRoles(req.user.sub, userId);
    return { statusCode: HttpStatus.OK, data: roles };
  }

  @Get('users/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  async getUserPermissions(@Request() req: RequestWithUser, @Param('userId') userId: string) {
    const permissions = await this.rolesService.getUserPermissions(req.user.sub, userId);
    return { statusCode: HttpStatus.OK, data: permissions };
  }
}