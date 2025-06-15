import { Injectable, ForbiddenException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async createStudent(userId: string, dto: CreateStudentDto) {
    try {
      console.log('Creating student with DTO:', dto);
      await this.checkSchoolAccess(userId, dto.school_id, ['school_admin', 'super_admin', 'system_admin']);
      console.log('School access check passed for user:', userId);

      // Create user in Supabase Auth
      const { data, error } = await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });

      console.log('Supabase createUser response:', { data, error });
      if (error) throw new BadRequestException(`Supabase error: ${error.message}`);
      if (!data.user) throw new BadRequestException('Supabase user creation failed');

      // Create user and student in Prisma
      const user = await this.prisma.user.create({
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
      console.log('Prisma user created:', user.id);

      const student = await this.prisma.student.create({
        data: {
          user_id: user.id,
          school_id: dto.school_id,
          student_id: dto.student_id,
          grade_level: dto.grade_level,
          enrollment_date: dto.enrollment_date,
          status: 'active',
        },
      });
      console.log('Prisma student created:', student.id);

      // Associate user with school
      const schoolUser = await this.prisma.schoolUser.create({
        data: {
          user_id: user.id,
          school_id: dto.school_id,
          role: 'student',
          status: 'active',
        },
      });
      console.log('Prisma schoolUser created:', schoolUser.id);

      return student;
    } catch (error) {
      console.error('Error in createStudent:', error);
      throw new InternalServerErrorException('Failed to create student');
    }
  }

  async getStudentById(studentId: string, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true, school: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.checkSchoolAccess(userId, student.school_id);
    return student;
  }

  async updateStudent(studentId: string, userId: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.checkSchoolAccess(userId, student.school_id, ['school_admin', 'super_admin', 'system_admin']);

    const updatedStudent = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        student_id: dto.student_id,
        grade_level: dto.grade_level,
        enrollment_date: dto.enrollment_date,
        status: dto.status,
      },
    });

    if (dto.email || dto.first_name || dto.last_name || dto.phone_number) {
      await this.prisma.user.update({
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
  }

  async getAllStudents(userId: string, schoolId: string, limit: number = 10, offset: number = 0) {
    await this.checkSchoolAccess(userId, schoolId);

    return this.prisma.student.findMany({
      where: { school_id: schoolId, status: 'active' },
      include: { user: true },
      skip: offset,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
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
}