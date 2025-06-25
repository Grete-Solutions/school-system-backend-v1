import { 
  Injectable, 
  ForbiddenException, 
  NotFoundException, 
  BadRequestException, 
  InternalServerErrorException,
  ConflictException
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { BulkImportStudentsDto } from './dto/bulk-import-students.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedResponse, PaginationMeta } from '../common/interfaces/paginated-response.interface';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async getStudentsBySchool(
    userId: string, 
    schoolId: string, 
    query: PaginationQueryDto
  ): Promise<PaginatedResponse<any>> {
    await this.checkSchoolAccess(userId, schoolId);

    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'created_at', 
      sortOrder = 'desc', 
      search, 
      grade_level, 
      status = 'active' 
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.StudentWhereInput = {
      school_id: schoolId,
      status: status,
    };

    // Add grade level filter
    if (grade_level) {
      where.grade_level = grade_level;
    }

    // Add search functionality
    if (search) {
      where.OR = [
        { user: { first_name: { contains: search, mode: 'insensitive' } } },
        { user: { last_name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { student_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build order by clause
    let orderBy: Prisma.StudentOrderByWithRelationInput = {};
    if (sortBy === 'first_name' || sortBy === 'last_name') {
      orderBy = { user: { [sortBy]: sortOrder } };
    } else {
      orderBy = { [sortBy as keyof Prisma.StudentOrderByWithRelationInput]: sortOrder };
    }

    // Execute queries
    const [students, totalRecords] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: { 
          user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              profile_image_url: true,
              status: true,
              last_login: true,
            }
          },
          school: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.student.count({ where }),
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

    return { data: students, pagination };
  }

  async createStudent(userId: string, schoolId: string, dto: CreateStudentDto) {
    try {
      console.log('Creating student with DTO:', dto);
      await this.checkSchoolAccess(userId, schoolId, ['school_admin', 'super_admin', 'system_admin']);

      // Check if student_id already exists in the school
      const existingStudent = await this.prisma.student.findFirst({
        where: {
          student_id: dto.student_id,
          school_id: schoolId,
        },
      });

      if (existingStudent) {
        throw new ConflictException('Student ID already exists in this school');
      }

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
      });

      if (error) throw new BadRequestException(`Supabase error: ${error.message}`);
      if (!data.user) throw new BadRequestException('Supabase user creation failed');

      // Create user and student in Prisma transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: data.user.id,
            email: dto.email,
            password_hash: 'supabase-managed',
            role: 'student',
            status: 'active',
            first_name: dto.first_name,
            last_name: dto.last_name,
            phone_number: dto.phone_number,
          },
        });

        const student = await tx.student.create({
          data: {
            user_id: user.id,
            school_id: schoolId,
            student_id: dto.student_id,
            grade_level: dto.grade_level,
            enrollment_date: dto.enrollment_date ? new Date(dto.enrollment_date) : new Date(),
            status: 'active',
          },
        });

        await tx.schoolUser.create({
          data: {
            user_id: user.id,
            school_id: schoolId,
            role: 'student',
            status: 'active',
          },
        });

        return student;
      });

      return this.getStudentById(result.id, userId);
    } catch (error) {
      console.error('Error in createStudent:', error);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create student');
    }
  }

  async getStudentById(studentId: string, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { 
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            profile_image_url: true,
            status: true,
            last_login: true,
            created_at: true,
          }
        },
        school: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        }
      },
    });

    if (!student) throw new NotFoundException('Student not found');
    await this.checkSchoolAccess(userId, student.school_id);
    return student;
  }

  async updateStudent(studentId: string, userId: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) throw new NotFoundException('Student not found');
    await this.checkSchoolAccess(userId, student.school_id, ['school_admin', 'super_admin', 'system_admin']);

    // Check if student_id already exists (if being updated)
    if (dto.student_id && dto.student_id !== student.student_id) {
      const existingStudent = await this.prisma.student.findFirst({
        where: {
          student_id: dto.student_id,
          school_id: student.school_id,
          id: { not: studentId },
        },
      });

      if (existingStudent) {
        throw new ConflictException('Student ID already exists in this school');
      }
    }

    // Check if email already exists (if being updated)
    if (dto.email && dto.email !== student.user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          student_id: dto.student_id,
          grade_level: dto.grade_level,
          enrollment_date: dto.enrollment_date ? new Date(dto.enrollment_date) : undefined,
          status: dto.status,
        },
      });

      if (dto.email || dto.first_name || dto.last_name || dto.phone_number) {
        await tx.user.update({
          where: { id: student.user_id },
          data: {
            email: dto.email,
            first_name: dto.first_name,
            last_name: dto.last_name,
            phone_number: dto.phone_number,
          },
        });
      }

      return updatedStudent;
    });

    return this.getStudentById(result.id, userId);
  }

  async deleteStudent(studentId: string, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) throw new NotFoundException('Student not found');
    await this.checkSchoolAccess(userId, student.school_id, ['school_admin', 'super_admin', 'system_admin']);

    await this.prisma.$transaction(async (tx) => {
      // Delete student record
      await tx.student.delete({
        where: { id: studentId },
      });

      // Update user status to inactive instead of deleting
      await tx.user.update({
        where: { id: student.user_id },
        data: { status: 'inactive' },
      });

      // Remove school association
      await tx.schoolUser.deleteMany({
        where: {
          user_id: student.user_id,
          school_id: student.school_id,
        },
      });
    });
  }

  async updateStudentStatus(studentId: string, userId: string, dto: UpdateStudentStatusDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) throw new NotFoundException('Student not found');
    await this.checkSchoolAccess(userId, student.school_id, ['school_admin', 'super_admin', 'system_admin']);

    const updatedStudent = await this.prisma.student.update({
      where: { id: studentId },
      data: { status: dto.status },
    });

    return this.getStudentById(updatedStudent.id, userId);
  }

  async getStudentProfile(studentId: string, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
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
            created_at: true,
          }
        },
        school: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    if (!student) throw new NotFoundException('Student not found');
    
    // Students can view their own profile, or authorized users can view any student profile
    const requestingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const isOwnProfile = student.user_id === userId;
    const isAuthorizedUser = ['super_admin', 'system_admin'].includes(requestingUser?.role || '');
    
    if (!isOwnProfile && !isAuthorizedUser) {
      await this.checkSchoolAccess(userId, student.school_id);
    }

    return {
      id: student.id,
      student_id: student.student_id,
      grade_level: student.grade_level,
      enrollment_date: student.enrollment_date,
      status: student.status,
      user: student.user,
      school: student.school,
      created_at: student.created_at,
      updated_at: student.updated_at,
    };
  }

  async updateStudentProfile(studentId: string, userId: string, dto: UpdateStudentProfileDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) throw new NotFoundException('Student not found');
    
    // Students can update their own profile, or authorized users can update any student profile
    const requestingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const isOwnProfile = student.user_id === userId;
    const isAuthorizedUser = ['super_admin', 'system_admin'].includes(requestingUser?.role || '');
    
    if (!isOwnProfile && !isAuthorizedUser) {
      await this.checkSchoolAccess(userId, student.school_id, ['school_admin', 'super_admin', 'system_admin']);
    }

    // Check if email already exists (if being updated)
    if (dto.email && dto.email !== student.user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    await this.prisma.user.update({
      where: { id: student.user_id },
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone_number: dto.phone_number,
        profile_image_url: dto.profile_image_url,
        email: dto.email,
      },
    });

    return this.getStudentProfile(studentId, userId);
  }

  async bulkImportStudents(userId: string, schoolId: string, dto: BulkImportStudentsDto) {
    await this.checkSchoolAccess(userId, schoolId, ['school_admin', 'super_admin', 'system_admin']);

    const results: {
      successful: Array<{ student_id: string; email: string; id: string }>;
      failed: Array<{ student_id: string; email: string; error: string }>;
      totalProcessed: number;
    } = {
      successful: [],
      failed: [],
      totalProcessed: dto.students.length,
    };

    for (const studentData of dto.students) {
      try {
        const student = await this.createStudent(userId, schoolId, {
          ...studentData,
          password: this.generateRandomPassword(),
        });
        results.successful.push({
          student_id: studentData.student_id,
          email: studentData.email,
          id: student.id,
        });
      } catch (error) {
        results.failed.push({
          student_id: studentData.student_id,
          email: studentData.email,
          error: error.message,
        });
      }
    }

    return results;
  }

  private async checkSchoolAccess(userId: string, schoolId: string, allowedRoles: string[] = []) {
    const schoolUser = await this.prisma.schoolUser.findUnique({
      where: { user_id_school_id: { user_id: userId, school_id: schoolId } },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (['super_admin', 'system_admin'].includes(user.role)) return;

    if (!schoolUser || schoolUser.status !== 'active') {
      throw new ForbiddenException('No access to this school');
    }

    if (allowedRoles.length && !allowedRoles.includes(schoolUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private generateRandomPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}