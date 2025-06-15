import { Injectable, ForbiddenException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
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

      // Create user in Supabase Auth
      const { data, error } = await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });

      console.log('Supabase createUser response:', { data, error });
      if (error) throw new BadRequestException(`Supabase error: ${error.message}`);
      if (!data.user) throw new BadRequestException('Supabase user creation failed');

      // Create user and teacher in Prisma
      const user = await this.prisma.user.create({
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
      console.log('Prisma user created:', user.id);

      const teacher = await this.prisma.teacher.create({
        data: {
          user_id: user.id,
          school_id: dto.school_id,
          teacher_id: dto.teacher_id,
          department: dto.department,
          hire_date: dto.hire_date,
          status: 'active',
        },
      });
      console.log('Prisma teacher created:', teacher.id);

      // Associate user with school
      const schoolUser = await this.prisma.schoolUser.create({
        data: {
          user_id: user.id,
          school_id: dto.school_id,
          role: 'teacher',
          status: 'active',
        },
      });
      console.log('Prisma schoolUser created:', schoolUser.id);

      return teacher;
    } catch (error) {
      console.error('Error in createTeacher:', error);
      throw new InternalServerErrorException(`Failed to create teacher: ${error.message}`);
    }
  }

  async getTeacherById(teacherId: string, userId: string) {
    if (!teacherId) throw new BadRequestException('Invalid teacher_id');
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true, school: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    await this.checkSchoolAccess(userId, teacher.school_id);
    return teacher;
  }

  async updateTeacher(teacherId: string, userId: string, dto: UpdateTeacherDto) {
    if (!teacherId) throw new BadRequestException('Invalid teacher_id');
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    await this.checkSchoolAccess(userId, teacher.school_id, ['school_admin', 'super_admin', 'system_admin']);

    const updatedTeacher = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: {
        teacher_id: dto.teacher_id,
        department: dto.department,
        hire_date: dto.hire_date,
        status: dto.status,
      },
    });

    if (dto.email || dto.first_name || dto.last_name || dto.phone_number) {
      await this.prisma.user.update({
        where: { id: teacher.user_id },
        data: {
          email: dto.email,
          first_name: dto.first_name,
          last_name: dto.last_name,
          phone_number: dto.phone_number,
        },
      });
    }

    return updatedTeacher;
  }

  async getAllTeachers(userId: string, schoolId: string, limit: number = 10, offset: number = 0) {
    if (!schoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new BadRequestException('Invalid school_id: Must be a valid UUID');
    }
    await this.checkSchoolAccess(userId, schoolId);

    return this.prisma.teacher.findMany({
      where: { school_id: schoolId, status: 'active' },
      include: { user: true },
      skip: offset,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
  }

  private async checkSchoolAccess(userId: string, schoolId: string, allowedRoles: string[] = []) {
    if (!schoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new BadRequestException('Invalid school_id: Must be a valid UUID');
    }
    console.log('Checking school access for user:', userId, 'school:', schoolId);
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