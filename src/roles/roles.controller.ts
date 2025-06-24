import { Controller, Post, Get, Put, Delete, Param, Body, Query, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
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
    return { statusCode: HttpStatus.CREATED, data: role };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(@Request() req: RequestWithUser, @Query() paginationDto: PaginationDto) {
    const result = await this.rolesService.getRoles(req.user.sub, paginationDto);
    return { 
      statusCode: HttpStatus.OK, 
      data: result.data,
      pagination: result.pagination
    };
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Request() req: RequestWithUser, @Param('id') id: string) {
    await this.rolesService.deleteRole(req.user.sub, id);
    return { statusCode: HttpStatus.OK, message: 'Role deleted successfully' };
  }

  @Post('users/:userId/roles')
  @UseGuards(JwtAuthGuard)
  async assignRole(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    const userRole = await this.rolesService.assignRole(req.user.sub, userId, dto);
    return { statusCode: HttpStatus.CREATED, data: userRole };
  }

  @Post('users/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  async grantPermission(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: GrantPermissionDto,
  ) {
    const permission = await this.rolesService.grantPermission(req.user.sub, userId, dto);
    return { statusCode: HttpStatus.CREATED, data: permission };
  }

  @Get('users/:userId/roles')
  @UseGuards(JwtAuthGuard)
  async getUserRoles(
    @Request() req: RequestWithUser, 
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto
  ) {
    const result = await this.rolesService.getUserRoles(req.user.sub, userId, paginationDto);
    return { 
      statusCode: HttpStatus.OK, 
      data: result.data,
      pagination: result.pagination
    };
  }

  @Get('users/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  async getUserPermissions(
    @Request() req: RequestWithUser, 
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto
  ) {
    const result = await this.rolesService.getUserPermissions(req.user.sub, userId, paginationDto);
    return { 
      statusCode: HttpStatus.OK, 
      data: result.data,
      pagination: result.pagination
    };
  }

  @Delete('users/:userId/permissions/:permissionId')
  @UseGuards(JwtAuthGuard)
  async revokePermission(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.rolesService.revokePermission(req.user.sub, userId, permissionId);
    return { statusCode: HttpStatus.OK, message: 'Permission revoked successfully' };
  }
}