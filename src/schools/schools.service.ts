import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
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

    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        address: dto.address,
        phone_number: dto.phone_number,
        email: dto.email,
        logo_url: dto.logo_url,
      },
    });

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

  async getSchoolById(schoolId: string, userId: string) {
    await this.checkSchoolAccess(userId, schoolId);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async updateSchool(schoolId: string, userId: string, dto: UpdateSchoolDto) {
    await this.checkSchoolAccess(userId, schoolId, ['school_admin', 'super_admin', 'system_admin']);
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

  async getAllSchools(userId: string, limit: number = 10, offset: number = 0) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (['super_admin', 'system_admin'].includes(user.role)) {
      return this.prisma.school.findMany({
        skip: offset,
        take: limit,
        orderBy: { created_at: 'desc' },
      });
    }

    return this.prisma.school.findMany({
      where: {
        schoolUsers: {
          some: { user_id: userId, status: 'active' },
        },
      },
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