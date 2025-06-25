import { 
  Injectable, 
  ForbiddenException, 
  NotFoundException, 
  BadRequestException, 
  InternalServerErrorException,
  ConflictException
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminPaginationQueryDto } from './dto/admin-pagination-query.dto';
import { PaginatedResponse, PaginationMeta } from '../common/interfaces/paginated-response.interface';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async getAllAdmins(
    userId: string, 
    query: AdminPaginationQueryDto
  ): Promise<PaginatedResponse<any>> {
    // Only super admins can access this endpoint
    await this.checkSuperAdminAccess(userId);

    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'created_at', 
      sortOrder = 'desc', 
      search, 
      role, 
      status 
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      role: { in: ['system_admin', 'super_admin'] },
    };

    // Add role filter
    if (role) {
      where.role = role;
    }

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add search functionality
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build order by clause
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy as keyof Prisma.UserOrderByWithRelationInput]: sortOrder,
    };

    // Execute queries
    const [admins, totalRecords] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          profile_image_url: true,
          role: true,
          status: true,
          last_login: true,
          created_at: true,
          updated_at: true,
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalRecords / limit);
    const pagination: PaginationMeta = {
      totalRecords,
      totalPages,
      currentPage: page,
      recordsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return { data: admins, pagination };
  }

  async createAdmin(userId: string, dto: CreateAdminDto) {
    try {
      // Only super admins can create other admins
      await this.checkSuperAdminAccess(userId);

      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Create user in Supabase Auth
      const { data, error } = await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          role: dto.role,
          first_name: dto.first_name,
          last_name: dto.last_name,
        },
      });

      if (error) throw new BadRequestException(`Supabase error: ${error.message}`);
      if (!data.user) throw new BadRequestException('Supabase user creation failed');

      // Create user in Prisma
      const admin = await this.prisma.user.create({
        data: {
          id: data.user.id,
          email: dto.email,
          password_hash: 'supabase-managed',
          role: dto.role,
          status: 'active',
          first_name: dto.first_name,
          last_name: dto.last_name,
          phone_number: dto.phone_number,
          profile_image_url: dto.profile_image_url,
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          profile_image_url: true,
          role: true,
          status: true,
          last_login: true,
          created_at: true,
          updated_at: true,
        },
      });

      // Log the admin creation
      await this.prisma.auditLog.create({
        data: {
          user_id: userId,
          action: 'ADMIN_CREATED',
          resource_type: 'User',
          resource_id: admin.id,
          details: {
            created_admin_email: admin.email,
            created_admin_role: admin.role,
          },
        },
      });

      return admin;
    } catch (error) {
      console.error('Error in createAdmin:', error);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create admin');
    }
  }

  async getAdminById(adminId: string, userId: string) {
    // Only super admins can access this endpoint
    await this.checkSuperAdminAccess(userId);

    const admin = await this.prisma.user.findUnique({
      where: { 
        id: adminId,
        role: { in: ['system_admin', 'super_admin'] },
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        profile_image_url: true,
        role: true,
        status: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return admin;
  }

  async updateAdmin(adminId: string, userId: string, dto: UpdateAdminDto) {
    // Only super admins can update other admins
    await this.checkSuperAdminAccess(userId);

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findUnique({
      where: { 
        id: adminId,
        role: { in: ['system_admin', 'super_admin'] },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Prevent self-demotion from super_admin
    if (userId === adminId && existingAdmin.role === 'super_admin' && dto.role === 'system_admin') {
      throw new BadRequestException('Cannot demote yourself from super admin');
    }

    // Prevent self-deactivation
    if (userId === adminId && dto.status && dto.status !== 'active') {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    // Check if email already exists (if being updated)
    if (dto.email && dto.email !== existingAdmin.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already exists');
      }

      // Update email in Supabase if changed
      const { error } = await this.supabase.auth.admin.updateUserById(adminId, {
        email: dto.email,
      });

      if (error) {
        throw new BadRequestException(`Failed to update email in Supabase: ${error.message}`);
      }
    }

    // Update admin in Prisma
    const updatedAdmin = await this.prisma.user.update({
      where: { id: adminId },
      data: {
        email: dto.email,
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone_number: dto.phone_number,
        role: dto.role,
        status: dto.status,
        profile_image_url: dto.profile_image_url,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        profile_image_url: true,
        role: true,
        status: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Log the admin update
    await this.prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'ADMIN_UPDATED',
        resource_type: 'User',
        resource_id: adminId,
        details: {
          updated_fields: Object.keys(dto),
          previous_role: existingAdmin.role,
          new_role: dto.role,
        },
      },
    });

    return updatedAdmin;
  }

  async deleteAdmin(adminId: string, userId: string) {
    // Only super admins can delete other admins
    await this.checkSuperAdminAccess(userId);

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findUnique({
      where: { 
        id: adminId,
        role: { in: ['system_admin', 'super_admin'] },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Prevent self-deletion
    if (userId === adminId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Check if this is the last super admin
    if (existingAdmin.role === 'super_admin') {
      const superAdminCount = await this.prisma.user.count({
        where: { 
          role: 'super_admin',
          status: 'active',
        },
      });

      if (superAdminCount <= 1) {
        throw new BadRequestException('Cannot delete the last super admin');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Instead of hard delete, we'll soft delete by setting status to inactive
      await tx.user.update({
        where: { id: adminId },
        data: { 
          status: 'inactive',
          // Optionally append timestamp to email to prevent conflicts
          email: `${existingAdmin.email}_deleted_${Date.now()}`,
        },
      });

      // Delete from Supabase Auth
      const { error } = await this.supabase.auth.admin.deleteUser(adminId);
      if (error && !error.message.includes('User not found')) {
        console.warn(`Failed to delete user from Supabase: ${error.message}`);
      }

      // Log the admin deletion
      await tx.auditLog.create({
        data: {
          user_id: userId,
          action: 'ADMIN_DELETED',
          resource_type: 'User',
          resource_id: adminId,
          details: {
            deleted_admin_email: existingAdmin.email,
            deleted_admin_role: existingAdmin.role,
          },
        },
      });
    });
  }

  async getAdminStats(userId: string) {
    // Only super admins can access admin statistics
    await this.checkSuperAdminAccess(userId);

    const [totalAdmins, activeAdmins, superAdmins, systemAdmins, recentAdmins] = await Promise.all([
      this.prisma.user.count({
        where: { role: { in: ['system_admin', 'super_admin'] } },
      }),
      this.prisma.user.count({
        where: { 
          role: { in: ['system_admin', 'super_admin'] },
          status: 'active',
        },
      }),
      this.prisma.user.count({
        where: { role: 'super_admin' },
      }),
      this.prisma.user.count({
        where: { role: 'system_admin' },
      }),
      this.prisma.user.count({
        where: { 
          role: { in: ['system_admin', 'super_admin'] },
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      totalAdmins,
      activeAdmins,
      superAdmins,
      systemAdmins,
      recentAdmins,
      inactiveAdmins: totalAdmins - activeAdmins,
    };
  }

  private async checkSuperAdminAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can access this resource');
    }

    if (user.status !== 'active') {
      throw new ForbiddenException('Account is not active');
    }
  }
}