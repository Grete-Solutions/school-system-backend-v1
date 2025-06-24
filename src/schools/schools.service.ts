import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSchoolStatusDto } from './dto/update-school-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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

  private async checkSchoolAccess(userId: string, schoolId: string, allowedRoles: string[] = []) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Super admins and system admins have access to all schools
    if (['super_admin', 'system_admin'].includes(user.role)) return;

    const schoolUser = await this.prisma.schoolUser.findUnique({
      where: { 
        user_id_school_id: { user_id: userId, school_id: schoolId } 
      },
    });

    if (!schoolUser || schoolUser.status !== 'active') {
      throw new ForbiddenException('No access to this school');
    }

    if (allowedRoles.length && !allowedRoles.includes(schoolUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}