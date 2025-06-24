import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(userId: string, dto: CreateRoleDto) {
    await this.checkSuperAdminAccess(userId);
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

  async getRoles(userId: string, paginationDto: PaginationDto) {
    await this.checkAdminAccess(userId);
    
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;
    
    // Validate sortBy field
    const allowedSortFields = ['name', 'description', 'created_at', 'updated_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const [roles, totalRecords] = await Promise.all([
      this.prisma.role.findMany({
        skip,
        take: limit,
        orderBy: { [validSortBy]: validSortOrder },
      }),
      this.prisma.role.count(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: roles,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        recordsPerPage: limit,
      },
    };
  }

  async getRoleById(userId: string, roleId: string) {
    await this.checkAdminAccess(userId);
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async updateRole(userId: string, roleId: string, dto: UpdateRoleDto) {
    await this.checkSuperAdminAccess(userId);
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    // Prevent updating system roles
    if (role.is_system_role) {
      throw new ForbiddenException('Cannot update system roles');
    }

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

  async deleteRole(userId: string, roleId: string) {
    await this.checkSuperAdminAccess(userId);
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    // Prevent deleting system roles
    if (role.is_system_role) {
      throw new ForbiddenException('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const userRoleCount = await this.prisma.userRole.count({
      where: { role_id: roleId },
    });

    if (userRoleCount > 0) {
      throw new BadRequestException('Cannot delete role that is assigned to users');
    }

    await this.prisma.role.delete({ where: { id: roleId } });
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
      include: {
        role: true,
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

  async revokePermission(userId: string, targetUserId: string, permissionId: string) {
    await this.checkAdminAccess(userId);
    
    const permission = await this.prisma.userPermission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    if (permission.user_id !== targetUserId) {
      throw new BadRequestException('Permission does not belong to the specified user');
    }

    await this.prisma.userPermission.delete({
      where: { id: permissionId },
    });
  }

  async getUserRoles(userId: string, targetUserId: string, paginationDto: PaginationDto) {
    if (userId !== targetUserId) await this.checkAdminAccess(userId);
    
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;
    
    // Validate sortBy field for UserRole
    const allowedSortFields = ['created_at', 'updated_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const [userRoles, totalRecords] = await Promise.all([
      this.prisma.userRole.findMany({
        where: { user_id: targetUserId },
        skip,
        take: limit,
        orderBy: { [validSortBy]: validSortOrder },
        include: { role: true },
      }),
      this.prisma.userRole.count({
        where: { user_id: targetUserId },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: userRoles,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        recordsPerPage: limit,
      },
    };
  }

  async getUserPermissions(userId: string, targetUserId: string, paginationDto: PaginationDto) {
    if (userId !== targetUserId) await this.checkAdminAccess(userId);
    
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;
    
    // Validate sortBy field for UserPermission
    const allowedSortFields = ['permission_key', 'resource_type', 'created_at', 'updated_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const [permissions, totalRecords] = await Promise.all([
      this.prisma.userPermission.findMany({
        where: { user_id: targetUserId },
        skip,
        take: limit,
        orderBy: { [validSortBy]: validSortOrder },
      }),
      this.prisma.userPermission.count({
        where: { user_id: targetUserId },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: permissions,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        recordsPerPage: limit,
      },
    };
  }

  private async checkAdminAccess(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!['super_admin', 'system_admin'].includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private async checkSuperAdminAccess(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Super admin access required');
    }
  }
}