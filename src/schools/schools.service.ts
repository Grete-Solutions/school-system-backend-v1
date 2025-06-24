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

  // Helper method to check school access
  private async checkSchoolAccess(userId: string, schoolId: string, allowedRoles?: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Super admins have access to everything
    if (['super_admin', 'system_admin'].includes(user.role)) {
      return;
    }

    // Check if user has access to the school
    const schoolUser = await this.prisma.schoolUser.findUnique({
      where: {
        user_id_school_id: {
          user_id: userId,
          school_id: schoolId,
        },
      },
    });

    if (!schoolUser || schoolUser.status !== 'active') {
      throw new ForbiddenException('Access denied to this school');
    }

    // Check role-based access if specific roles are required
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(schoolUser.role) && !['super_admin', 'system_admin'].includes(user.role)) {
        throw new ForbiddenException('Insufficient permissions for this action');
      }
    }
  }

  // Existing methods
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
    const fileName = `schools/${schoolId}/logo-${Date.now()}.${file.originalname.split('.').pop()}`;
    
    const { data, error } = await this.supabase.storage
      .from('school-assets')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(`Failed to upload logo: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = this.supabase.storage
      .from('school-assets')
      .getPublicUrl(fileName);

    // Update school with new logo URL
    const updatedSchool = await this.prisma.school.update({
      where: { id: schoolId },
      data: { logo_url: publicUrlData.publicUrl },
    });

    return {
      id: schoolId,
      logo_url: updatedSchool.logo_url,
      alt_text: dto.alt_text,
      description: dto.description,
      uploaded_at: new Date(),
    };
  }

  async uploadSchoolBanner(
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
    const fileName = `schools/${schoolId}/banner-${Date.now()}.${file.originalname.split('.').pop()}`;
    
    const { data, error } = await this.supabase.storage
      .from('school-assets')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(`Failed to upload banner: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = this.supabase.storage
      .from('school-assets')
      .getPublicUrl(fileName);

    // In production, you would store this in a banner_url field
    return {
      id: schoolId,
      banner_url: publicUrlData.publicUrl,
      alt_text: dto.alt_text,
      description: dto.description,
      uploaded_at: new Date(),
    };
  }

  // NEW METHODS - School Statistics
  async getSchoolDashboardStats(schoolId: string, userId: string): Promise<SchoolDashboardStats> {
    await this.checkSchoolAccess(userId, schoolId);
    
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    
    if (!school) throw new NotFoundException('School not found');

    // Get current month and previous month dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get overview stats
    const [totalStudents, totalTeachers, totalDocuments, activeUsers] = await Promise.all([
      this.prisma.student.count({
        where: { school_id: schoolId, status: 'active' },
      }),
      this.prisma.teacher.count({
        where: { school_id: schoolId, status: 'active' },
      }),
      this.prisma.document.count({
        where: { school_id: schoolId, status: 'active' },
      }),
      this.prisma.schoolUser.count({
        where: { school_id: schoolId, status: 'active' },
      }),
    ]);

    // Get enrollment stats
    const [currentMonthEnrollments, previousMonthEnrollments] = await Promise.all([
      this.prisma.student.count({
        where: {
          school_id: schoolId,
          created_at: { gte: currentMonthStart },
        },
      }),
      this.prisma.student.count({
        where: {
          school_id: schoolId,
          created_at: { gte: previousMonthStart, lt: previousMonthEnd },
        },
      }),
    ]);

    const growthRate = previousMonthEnrollments > 0 
      ? ((currentMonthEnrollments - previousMonthEnrollments) / previousMonthEnrollments) * 100 
      : 0;

    // Get document stats
    const documentsThisMonth = await this.prisma.document.count({
      where: {
        school_id: schoolId,
        created_at: { gte: currentMonthStart },
      },
    });

    // Get total storage used (sum of file sizes)
    const storageResult = await this.prisma.document.aggregate({
      where: { school_id: schoolId, status: 'active' },
      _sum: { file_size: true },
    });

    // Get most uploaded file type
    const fileTypeStats = await this.prisma.document.groupBy({
      by: ['file_type'],
      where: { school_id: schoolId, status: 'active' },
      _count: { file_type: true },
      orderBy: { _count: { file_type: 'desc' } },
      take: 1,
    });

    // Get activity stats (simplified - you might want to track this differently)
    const dailyActiveUsers = activeUsers; // Simplified
    const weeklyActiveUsers = activeUsers; // Simplified
    const monthlyActiveUsers = activeUsers; // Simplified

    // Get recent activities from audit logs
    const recentActivities = await this.prisma.auditLog.findMany({
      where: {
        user: {
          schoolUsers: {
            some: { school_id: schoolId },
          },
        },
      },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return {
      overview: {
        total_students: totalStudents,
        total_teachers: totalTeachers,
        total_documents: totalDocuments,
        active_users: activeUsers,
      },
      enrollment: {
        current_month: currentMonthEnrollments,
        previous_month: previousMonthEnrollments,
        growth_rate: Math.round(growthRate * 100) / 100,
      },
      documents: {
        uploaded_this_month: documentsThisMonth,
        total_storage_used: storageResult._sum.file_size || 0,
        most_uploaded_type: fileTypeStats[0]?.file_type || 'N/A',
      },
      activity: {
        daily_active_users: dailyActiveUsers,
        weekly_active_users: weeklyActiveUsers,
        monthly_active_users: monthlyActiveUsers,
      },
      recent_activities: recentActivities.map(activity => ({
        id: activity.id,
        type: activity.action,
        description: `${activity.action} - ${activity.resource_type}`,
        user_name: `${activity.user.first_name} ${activity.user.last_name}`,
        timestamp: activity.created_at,
      })),
    };
  }

  async getSchoolRevenueAnalytics(
    schoolId: string, 
    userId: string, 
    year?: number, 
    months?: number
  ): Promise<SchoolRevenueAnalytics> {
    await this.checkSchoolAccess(userId, schoolId);
    
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    
    if (!school) throw new NotFoundException('School not found');

    // For now, return mock data since we don't have payment/billing tables
    // In production, you would query actual payment records
    const currentYear = year || new Date().getFullYear();
    const monthsToShow = months || 12;

    const monthlyRevenue = [];
    for (let i = 0; i < monthsToShow; i++) {
      const date = new Date(currentYear, i, 1);
      monthlyRevenue.push({
        month: date.toLocaleString('default', { month: 'long' }),
        year: currentYear,
        amount: Math.floor(Math.random() * 50000) + 10000, // Mock data
        student_count: Math.floor(Math.random() * 100) + 50, // Mock data
      });
    }

    const totalRevenue = monthlyRevenue.reduce((sum, month) => sum + month.amount, 0);

    return {
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      revenue_by_grade: [
        { grade: 'Grade 1', amount: 15000, student_count: 30 },
        { grade: 'Grade 2', amount: 18000, student_count: 35 },
        { grade: 'Grade 3', amount: 20000, student_count: 40 },
      ],
      payment_methods: [
        { method: 'Bank Transfer', amount: totalRevenue * 0.6, percentage: 60 },
        { method: 'Credit Card', amount: totalRevenue * 0.3, percentage: 30 },
        { method: 'Cash', amount: totalRevenue * 0.1, percentage: 10 },
      ],
      outstanding_fees: {
        total_amount: 25000,
        student_count: 15,
      },
    };
  }

  async getEnrollmentStatistics(
    schoolId: string, 
    userId: string, 
    year?: number
  ): Promise<EnrollmentStatistics> {
    await this.checkSchoolAccess(userId, schoolId);
    
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    
    if (!school) throw new NotFoundException('School not found');

    const currentYear = year || new Date().getFullYear();

    // Get current enrollment by grade
    const enrollmentByGrade = await this.prisma.student.groupBy({
      by: ['grade_level'],
      where: { 
        school_id: schoolId, 
        status: 'active',
        grade_level: { not: null },
      },
      _count: { grade_level: true },
    });

    const totalEnrollment = await this.prisma.student.count({
      where: { school_id: schoolId, status: 'active' },
    });

    // Get enrollment trends for the past 12 months
    const enrollmentTrends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const newEnrollments = await this.prisma.student.count({
        where: {
          school_id: schoolId,
          created_at: { gte: monthStart, lte: monthEnd },
        },
      });

      // Mock withdrawals data
      const withdrawals = Math.floor(Math.random() * 5);

      enrollmentTrends.push({
        month: date.toLocaleString('default', { month: 'long' }),
        year: date.getFullYear(),
        new_enrollments: newEnrollments,
        withdrawals: withdrawals,
        net_change: newEnrollments - withdrawals,
      });
    }

    // Mock demographics data
    const genderDistribution = {
      male: Math.floor(totalEnrollment * 0.52),
      female: Math.floor(totalEnrollment * 0.46),
      other: Math.floor(totalEnrollment * 0.02),
    };

    return {
      current_enrollment: {
        total: totalEnrollment,
        by_grade: enrollmentByGrade.map(grade => ({
          grade: grade.grade_level || 'Unknown',
          count: grade._count.grade_level,
          capacity: grade._count.grade_level + 10, // Mock capacity
          utilization_rate: (grade._count.grade_level / (grade._count.grade_level + 10)) * 100,
        })),
      },
      enrollment_trends: enrollmentTrends,
      demographics: {
        gender_distribution: genderDistribution,
        age_distribution: [
          { age_range: '5-7', count: Math.floor(totalEnrollment * 0.2) },
          { age_range: '8-10', count: Math.floor(totalEnrollment * 0.3) },
          { age_range: '11-13', count: Math.floor(totalEnrollment * 0.3) },
          { age_range: '14-16', count: Math.floor(totalEnrollment * 0.15) },
          { age_range: '17+', count: Math.floor(totalEnrollment * 0.05) },
        ],
      },
      retention_rate: {
        current_year: 92.5,
        previous_year: 89.2,
        change: 3.3,
      },
    };
  }
}