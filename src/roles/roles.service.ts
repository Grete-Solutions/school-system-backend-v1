import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(userId: string, dto: CreateRoleDto) {
    await this.checkAdminAccess(userId);
    console.log('Creating role:', dto);

    const existingRole = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existingRole) throw new BadRequestException('Role name already exists');

    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions || [],
      },
    });
  }

  async getRoles(userId: string) {
    await this.checkAdminAccess(userId);
    return this.prisma.role.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getRoleById(userId: string, roleId: string) {
    await this.checkAdminAccess(userId);
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async updateRole(userId: string, roleId: string, dto: UpdateRoleDto) {
    await this.checkAdminAccess(userId);
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    if (dto.name) {
      const existingRole = await this.prisma.role.findUnique({ where: { name: dto.name } });
      if (existingRole && existingRole.id !== roleId) {
        throw new BadRequestException('Role name already exists');
      }
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
      },
    });
  }

  async assignRole(userId: string, targetUserId: string, dto: AssignRoleDto) {
    await this.checkAdminAccess(userId);
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const existingUserRole = await this.prisma.userRole.findFirst({
      where: { user_id: targetUserId, role_id: dto.roleId },
    });
    if (existingUserRole) throw new BadRequestException('User already has this role');

    return this.prisma.userRole.create({
      data: {
        user_id: targetUserId,
        role_id: dto.roleId,
      },
    });
  }

  async grantPermission(userId: string, targetUserId: string, dto: GrantPermissionDto) {
    await this.checkAdminAccess(userId);
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    const existingPermission = await this.prisma.userPermission.findFirst({
      where: {
        user_id: targetUserId,
        permission_key: dto.permissionKey,
        resource_type: dto.resourceType,
        resource_id: dto.resourceId,
      },
    });
    if (existingPermission) throw new BadRequestException('Permission already granted');

    return this.prisma.userPermission.create({
      data: {
        user_id: targetUserId,
        permission_key: dto.permissionKey,
        resource_type: dto.resourceType,
        resource_id: dto.resourceId,
        granted_by: userId,
      },
    });
  }

  async getUserRoles(userId: string, targetUserId: string) {
    if (userId !== targetUserId) await this.checkAdminAccess(userId);
    return this.prisma.userRole.findMany({
      where: { user_id: targetUserId },
      include: { role: true },
    });
  }

  async getUserPermissions(userId: string, targetUserId: string) {
    if (userId !== targetUserId) await this.checkAdminAccess(userId);
    return this.prisma.userPermission.findMany({
      where: { user_id: targetUserId },
    });
  }

  private async checkAdminAccess(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!['super_admin', 'system_admin'].includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }
  }
}