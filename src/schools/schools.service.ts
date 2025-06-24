import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSchoolStatusDto } from './dto/update-school-status.dto';
import { UpdateSchoolSettingsDto } from './dto/school-settings.dto';
import { UpdateSchoolBrandingDto } from './dto/school-branding.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  SchoolDashboardStats, 
  SchoolRevenueAnalytics, 
  EnrollmentStatistics 
} from './interfaces/school-stats.interface';

@Injectable()
export class SchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  // Existing methods (keeping original implementation)
  async createSchool(userId: string, dto: CreateSchoolDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['super_admin', 'system_admin'].includes(user.role)) {
      throw new ForbiddenException('Only super admins or system admins can create schools');
    }

    // Check if email is already in use
    if (dto.email) {
      const existingSchool = await this.prisma.school.findUnique({
        where: { email: dto.email },
      });
      if (existingSchool) {
        throw new BadRequestException('Email is already in use by another school');
      }
    }

    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        address: dto.address,
        phone_number: dto.phone_number,
        email: dto.email,
        logo_url: dto.logo_url,
      },
    });

    // Assign the creator as school admin
    await this.prisma.schoolUser.create({
      data: {
        user_id: userId,
        school_id: school.id,
        role: 'school_admin',
        status: 'active',
      },
    });

    return school;
  }

  async getAllSchools(userId: string, paginationDto: PaginationDto, filterDto: SchoolFilterDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = paginationDto;
    const { status, search } = filterDto;
    const skip = (page - 1) * limit;

    // Validate sortBy field
    const allowedSortFields = ['name', 'address', 'email', 'status', 'created_at', 'updated_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    // Build where clause based on user role and filters
    let whereClause: any = {};

    // Apply role-based filtering
    if (!['super_admin', 'system_admin'].includes(user.role)) {
      whereClause.schoolUsers = {
        some: { user_id: userId, status: 'active' },
      };
    }

    // Apply status filter
    if (status) {
      whereClause.status = status;
    }

    // Apply search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [schools, totalRecords] = await Promise.all([
      this.prisma.school.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [validSortBy]: validSortOrder },
        include: {
          _count: {
            select: {
              students: true,
              teachers: true,
              schoolUsers: true,
            },
          },
        },
      }),
      this.prisma.school.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: schools,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        recordsPerPage: limit,
      },
    };
  }

  async getSchoolById(schoolId: string, userId: string) {
    await this.checkSchoolAccess(userId, schoolId);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            schoolUsers: true,
            documents: true,
          },
        },
        schoolUsers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
              },
            },
          },
        },
      },
    });
    
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async updateSchool(schoolId: string, userId: string, dto: UpdateSchoolDto) {
    await this.checkSchoolAccess(userId, schoolId, ['school_admin', 'super_admin', 'system_admin']);
    
    // Check if school exists
    const existingSchool = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!existingSchool) throw new NotFoundException('School not found');

    // Check if email is already in use by another school
    if (dto.email && dto.email !== existingSchool.email) {
      const schoolWithEmail = await this.prisma.school.findUnique({
        where: { email: dto.email },
      });
      if (schoolWithEmail && schoolWithEmail.id !== schoolId) {
        throw new BadRequestException('Email is already in use by another school');
      }
    }

    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        name: dto.name,
        address: dto.address,
        phone_number: dto.phone_number,
        email: dto.email,
        logo_url: dto.logo_url,
        status: dto.status,
      },
    });
    
    return school;
  }

  async deleteSchool(schoolId: string, userId: string) {
    // Only super admins can delete schools
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can delete schools');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            documents: true,
          },
        },
      },
    });

    if (!school) throw new NotFoundException('School not found');

    // Check if school has active students, teachers, or documents
    if (school._count.students > 0 || school._count.teachers > 0 || school._count.documents > 0) {
      throw new BadRequestException(
        'Cannot delete school with active students, teachers, or documents. Please transfer or remove them first.'
      );
    }

    // Use transaction to ensure data consistency
    await this.prisma.$transaction(async (tx) => {
      // Delete school users first
      await tx.schoolUser.deleteMany({
        where: { school_id: schoolId },
      });

      // Delete the school
      await tx.school.delete({
        where: { id: schoolId },
      });
    });
  }

  async updateSchoolStatus(schoolId: string, userId: string, dto: UpdateSchoolStatusDto) {
    // Only super admins and system admins can update school status
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['super_admin', 'system_admin'].includes(user.role)) {
      throw new ForbiddenException('Only super admins or system admins can update school status');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException('School not found');

    const updatedSchool = await this.prisma.school.update({
      where: { id: schoolId },
      data: { status: dto.status },
    });

    // If suspending the school, you might want to also update related users' status
    if (dto.status === 'inactive') {
      await this.prisma.schoolUser.updateMany({
        where: { school_id: schoolId },
        data: { status: 'inactive' },
      });
    } else if (dto.status === 'active') {
      await this.prisma.schoolUser.updateMany({
        where: { school_id: schoolId },
        data: { status: 'active' },
      });
    }

    return updatedSchool;
  }

  // NEW METHODS - School Configuration
  async getSchoolSettings(schoolId: string, userId: string) {
    await this.checkSchoolAccess(userId, schoolId);
    
    // For now, we'll store settings in a JSON field on the school table
    // In a production app, you might want a separate settings table
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { 
        id: true, 
        name: true,
        // Add a settings JSON field to your school table in production
      },
    });
    
    if (!school) throw new NotFoundException('School not found');
    
    // Return default settings structure for now
    return {
      academic: {
        academic_year_start: '2024-09-01',
        academic_year_end: '2025-06-30',
        terms_per_year: 3,
        school_days_per_week: 5,
        time_zone: 'UTC',
      },
      notifications: {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        parent_notifications: true,
      },
      security: {
        two_factor_auth_required: false,
        password_expiry_days: 90,
        max_login_attempts: 5,
        ip_restriction_enabled: false,
        allowed_ip_addresses: [],
      },
      custom_fields: {},
    };
  }

  async updateSchoolSettings(schoolId: string, userId: string, dto: UpdateSchoolSettingsDto) {
    await this.checkSchoolAccess(userId, schoolId, ['school_admin', 'super_admin', 'system_admin']);
    
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    
    if (!school) throw new NotFoundException('School not found');
    
    // In production, you would update the settings JSON field
    // For now, we'll just return the updated settings
    return {
      id: schoolId,
      settings: dto,
      updated_at: new Date(),
    };
  }

  async getSchoolBranding(schoolId: string, userId: string) {
    await this.checkSchoolAccess(userId, schoolId);
    
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { 
        id: true, 
        name: true, 
        logo_url: true,
        // Add branding fields to your school table in production
      },
    });
    
    if (!school) throw new NotFoundException('School not found');
    
    // Return default branding structure
    return {
      primary_color: '#007bff',
      secondary_color: '#6c757d',
      accent_color: '#28a745',
      font_family: 'Arial, sans-serif',
      logo_url: school.logo_url,
      banner_url: null,
      favicon_url: null,
      custom_css: {},
    };
  }

  async updateSchoolBranding(schoolId: string, userId: string, dto: UpdateSchoolBrandingDto) {
    await this.checkSchoolAccess(userId, schoolId, ['school_admin', 'super_admin', 'system_admin']);
    
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    
    if (!school) throw new NotFoundException('School not found');
    
    // Update logo_url if provided
    if (dto.logo_url) {
      await this.prisma.school.update({
        where: { id: schoolId },
        data: { logo_url: dto.logo_url },
      });
    }
    
    return {
      id: schoolId,
      branding: dto,
      updated_at: new Date(),
    };
  }

  async uploadSchoolLogo(
    schoolId: string, 
    userId: string, 
    file: Express.Multer.File, 
    dto: UploadFileDto
  ) {
    await this.checkSchoolAccess(userId, schoolId, ['school_admin', 'super_admin', 'system_admin']);
    
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    
    if (!school) throw new NotFoundException('School not found');
    
    // Upload to Supabase storage
    const fileName = `schools/${schoolId}/logo-${Date