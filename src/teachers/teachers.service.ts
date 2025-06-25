import { Injectable, ForbiddenException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { PaginationUtil } from '../common/utils/pagination.util';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async createTeacher(userId: string, dto: CreateTeacherDto) {
    try {
      console.log('Creating teacher with DTO:', dto);
      if (!dto.school_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.school_id)) {
        throw new BadRequestException('Invalid school_id: Must be a valid UUID');
      }
      await this.checkSchoolAccess(userId, dto.school_id, ['school_admin', 'super_admin', 'system_admin']);
      console.log('School access check passed for user:', userId);

      // Check if teacher_id already exists in the school
      const existingTeacher = await this.prisma.teacher.findFirst({
        where: {
          teacher_id: dto.teacher_id,
          school_id: dto.school_id,
        },
      });

      if (existingTeacher) {
        throw new BadRequestException('Teacher ID already exists in this school');
      }

      // Create user in Supabase Auth
      const { data, error } = await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });

      console.log('Supabase createUser response:', { data, error });
      if (error) throw new BadRequestException(`Supabase error: ${error.message}`);
      if (!data.user) throw new BadRequestException('Supabase user creation failed');

      // Create user and teacher in Prisma transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: data.user.id,
            email: dto.email,
            password_hash: 'supabase-managed',
            role: 'teacher',
            status: 'active',
            first_name: dto.first_name,
            last_name: dto.last_name,
            phone_number: dto.phone_number,
          },
        });

        const teacher = await tx.teacher.create({
          data: {
            user_id: user.id,
            school_id: dto.school_id!, // Use non-null assertion since we validated above
            teacher_id: dto.teacher_id,
            department: dto.department,
            hire_date: dto.hire_date ? new Date(dto.hire_date) : null,
            status: 'active',
          },
        });

        const schoolUser = await tx.schoolUser.create({
          data: {
            user_id: user.id,
            school_id: dto.school_id!, // Use non-null assertion since we validated above
            role: 'teacher',
            status: 'active',
          },
        });

        return { user, teacher, schoolUser };
      });

      console.log('Teacher created successfully:', result.teacher.id);
      return result.teacher;
    } catch (error) {
      console.error('Error in createTeacher:', error);
      
      // Clean up Supabase user if Prisma operations failed
      if (error.name !== 'BadRequestException') {
        // Additional cleanup logic can be added here
      }
      
      throw new InternalServerErrorException(`Failed to create teacher: ${error.message}`);
    }
  }

  async getTeachersBySchool(
    userId: string,
    schoolId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    if (!schoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new BadRequestException('Invalid school_id: Must be a valid UUID');
    }

    await this.checkSchoolAccess(userId, schoolId);

    // Validate and set pagination parameters
    const { page, limit } = PaginationUtil.validatePaginationParams(
      paginationDto.page,
      paginationDto.limit,
    );
    const { skip, take } = PaginationUtil.getPaginationParams(page, limit);
    const orderBy = PaginationUtil.getSortParams(paginationDto.sortBy || 'created_at', paginationDto.sortOrder);

    // Get total count
    const totalRecords = await this.prisma.teacher.count({
      where: {
        school_id: schoolId,
        status: { not: 'deleted' }, // Include active and inactive, but not deleted
      },
    });

    // Get paginated data
    const teachers = await this.prisma.teacher.findMany({
      where: {
        school_id: schoolId,
        status: { not: 'deleted' },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            profile_image_url: true,
            last_login: true,
            status: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take,
      orderBy,
    });

    const paginationMeta = PaginationUtil.calculatePagination(totalRecords, page, limit);
    const pagination = {
      ...paginationMeta,
      hasNextPage: page < paginationMeta.totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      data: teachers,
      pagination,
    };
  }

  async getTeacherById(teacherId: string, userId: string) {
    if (!teacherId) throw new BadRequestException('Invalid teacher_id');
    
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            profile_image_url: true,
            last_login: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
            address: true,
            phone_number: true,
            email: true,
          },
        },
      },
    });

    if (!teacher) throw new NotFoundException('Teacher not found');
    if (teacher.status === 'deleted') throw new NotFoundException('Teacher not found');

    await this.checkSchoolAccess(userId, teacher.school_id);
    return teacher;
  }

  async updateTeacher(teacherId: string, userId: string, dto: UpdateTeacherDto) {
    if (!teacherId) throw new BadRequestException('Invalid teacher_id');
    
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) throw new NotFoundException('Teacher not found');
    if (teacher.status === 'deleted') throw new NotFoundException('Teacher not found');

    await this.checkSchoolAccess(userId, teacher.school_id, ['school_admin', 'super_admin', 'system_admin']);

    // Check if teacher_id is being updated and if it already exists
    if (dto.teacher_id && dto.teacher_id !== teacher.teacher_id) {
      const existingTeacher = await this.prisma.teacher.findFirst({
        where: {
          teacher_id: dto.teacher_id,
          school_id: teacher.school_id,
          id: { not: teacherId },
        },
      });

      if (existingTeacher) {
        throw new BadRequestException('Teacher ID already exists in this school');
      }
    }

    const updatedTeacher = await this.prisma.$transaction(async (tx) => {
      // Update teacher record
      const teacher = await tx.teacher.update({
        where: { id: teacherId },
        data: {
          teacher_id: dto.teacher_id,
          department: dto.department,
          hire_date: dto.hire_date ? new Date(dto.hire_date) : undefined,
          status: dto.status,
        },
        include: {
          user: true,
        },
      });

      // Update user record if needed
      if (dto.email || dto.first_name || dto.last_name || dto.phone_number) {
        await tx.user.update({
          where: { id: teacher.user_id },
          data: {
            email: dto.email,
            first_name: dto.first_name,
            last_name: dto.last_name,
            phone_number: dto.phone_number,
          },
        });
      }

      return teacher;
    });

    return updatedTeacher;
  }

  async deleteTeacher(teacherId: string, userId: string) {
    if (!teacherId) throw new BadRequestException('Invalid teacher_id');
    
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) throw new NotFoundException('Teacher not found');
    if (teacher.status === 'deleted') throw new NotFoundException('Teacher not found');

    await this.checkSchoolAccess(userId, teacher.school_id, ['school_admin', 'super_admin', 'system_admin']);

    // Soft delete - mark as deleted instead of removing from database
    const deletedTeacher = await this.prisma.$transaction(async (tx) => {
      // Update teacher status to deleted
      const teacher = await tx.teacher.update({
        where: { id: teacherId },
        data: { status: 'deleted' },
      });

      // Update user status to inactive
      await tx.user.update({
        where: { id: teacher.user_id },
        data: { status: 'inactive' },
      });

      // Update school user status to inactive
      await tx.schoolUser.updateMany({
        where: { user_id: teacher.user_id },
        data: { status: 'inactive' },
      });

      return teacher;
    });

    return { message: 'Teacher deleted successfully', teacherId: deletedTeacher.id };
  }

  async getTeacherClasses(
    teacherId: string,
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    if (!teacherId) throw new BadRequestException('Invalid teacher_id');
    
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) throw new NotFoundException('Teacher not found');
    if (teacher.status === 'deleted') throw new NotFoundException('Teacher not found');

    await this.checkSchoolAccess(userId, teacher.school_id);

    // Validate pagination parameters
    const { page, limit } = PaginationUtil.validatePaginationParams(
      paginationDto.page,
      paginationDto.limit,
    );

    // TODO: Implement when Class model is available
    // For now, return empty paginated response
    const paginationMeta = PaginationUtil.calculatePagination(0, page, limit);
    const pagination = {
      ...paginationMeta,
      hasNextPage: page < paginationMeta.totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      data: [],
      pagination,
    };
  }

  async getTeacherStudents(
    teacherId: string,
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    if (!teacherId) throw new BadRequestException('Invalid teacher_id');
    
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) throw new NotFoundException('Teacher not found');
    if (teacher.status === 'deleted') throw new NotFoundException('Teacher not found');

    await this.checkSchoolAccess(userId, teacher.school_id);

    // Validate pagination parameters
    const { page, limit } = PaginationUtil.validatePaginationParams(
      paginationDto.page,
      paginationDto.limit,
    );
    const { skip, take } = PaginationUtil.getPaginationParams(page, limit);
    const orderBy = PaginationUtil.getSortParams(paginationDto.sortBy || 'created_at', paginationDto.sortOrder);

    // Get students from the same school (since we don't have class assignments yet)
    const totalRecords = await this.prisma.student.count({
      where: {
        school_id: teacher.school_id,
        status: 'active',
      },
    });

    const students = await this.prisma.student.findMany({
      where: {
        school_id: teacher.school_id,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            profile_image_url: true,
          },
        },
      },
      skip,
      take,
      orderBy,
    });

    const paginationMeta = PaginationUtil.calculatePagination(totalRecords, page, limit);
    const pagination = {
      ...paginationMeta,
      hasNextPage: page < paginationMeta.totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      data: students,
      pagination,
    };
  }

  // Legacy method - keeping for backward compatibility
  async getAllTeachers(userId: string, schoolId: string, limit: number = 10, offset: number = 0) {
    const paginationDto = new PaginationDto();
    paginationDto.limit = limit;
    paginationDto.page = Math.floor(offset / limit) + 1;

    const result = await this.getTeachersBySchool(userId, schoolId, paginationDto);
    return result.data; // Return only data for backward compatibility
  }

  private async checkSchoolAccess(userId: string, schoolId: string, allowedRoles: string[] = []) {
    if (!schoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new BadRequestException('Invalid school_id: Must be a valid UUID');
    }
    
    console.log('Checking school access for user:', userId, 'school:', schoolId);
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Super admins and system admins have access to all schools
    if (['super_admin', 'system_admin'].includes(user.role)) return;

    const schoolUser = await this.prisma.schoolUser.findUnique({
      where: { user_id_school_id: { user_id: userId, school_id: schoolId } },
    });

    if (!schoolUser || schoolUser.status !== 'active') {
      throw new ForbiddenException('No access to this school');
    }

    if (allowedRoles.length && !allowedRoles.includes(schoolUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}