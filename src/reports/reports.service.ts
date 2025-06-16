import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'; import { PrismaService } from '../common/prisma.service'; import { CreateReportDto } from './dto/create-report.dto';

@Injectable() export class ReportsService { constructor(private readonly prisma: PrismaService) {}

async createReport(userId: string, dto: CreateReportDto) { await this.checkAdminAccess(userId); console.log('Creating report:', dto);

const user = await this.prisma.user.findUnique({ where: { id: userId } });
if (!user) throw new NotFoundException('User not found');

// Validate filters
if (dto.school_id) {
  const school = await this.prisma.school.findUnique({ where: { id: dto.school_id } });
  if (!school) throw new NotFoundException('School not found');
  if (user.role === 'school_admin') {
    const schoolUser = await this.prisma.schoolUser.findUnique({
      where: { user_id_school_id: { user_id: userId, school_id: dto.school_id } },
    });
    if (!schoolUser) throw new ForbiddenException('Access denied to this school');
  }
}
if (dto.role_id) {
  const role = await this.prisma.role.findUnique({ where: { id: dto.role_id } });
  if (!role) throw new NotFoundException('Role not found');
}

// Create report record
const report = await this.prisma.report.create({
  data: {
    user_id: userId,
    type: dto.type,
    filters: {
      school_id: dto.school_id,
      start_date: dto.start_date,
      end_date: dto.end_date,
      role_id: dto.role_id,
    },
    status: 'pending',
  },
});

// Generate report data asynchronously
this.generateReportData(report.id, dto, userId).catch((error) => {
  console.error('Report generation failed:', error);
  this.prisma.report.update({
    where: { id: report.id },
    data: { status: 'failed' },
  });
});

return report;
}

async generateReportData(reportId: string, dto: CreateReportDto, userId: string) { let data: any;
const where: any = {};
if (dto.school_id) where.school_id = dto.school_id;
if (dto.start_date || dto.end_date) {
  where.created_at = {};
  if (dto.start_date) where.created_at.gte = new Date(dto.start_date);
  if (dto.end_date) where.created_at.lte = new Date(dto.end_date);
}

switch (dto.type) {
  case 'document_summary':
    const documents = await this.prisma.document.groupBy({
      by: ['school_id'],
      where,
      _count: { id: true },
      _sum: { file_size: true },
    });
    data = {
      documents: documents.map((d) => ({
        school_id: d.school_id,
        document_count: d._count.id,
        total_size: d._sum.file_size,
      })),
    };
    break;

  case 'user_activity':
    const users = await this.prisma.user.findMany({
      where: {
        ...(dto.role_id ? { roles: { some: { role_id: dto.role_id } } } : {}),
        documents: { some: where },
      },
      select: {
        id: true,
        email: true,
        last_login: true,
        documents: { where, select: { id: true, created_at: true } },
      },
    });
    data = {
      users: users.map((u) => ({
        user_id: u.id,
        email: u.email,
        last_login: u.last_login,
        document_uploads: u.documents.length,
      })),
    };
    break;

  case 'school_stats':
    const schools = await this.prisma.school.findMany({
      where: { ...(dto.school_id ? { id: dto.school_id } : {}) },
      select: {
        id: true,
        name: true,
        _count: {
          select: { students: true, teachers: true, documents: true },
        },
      },
    });
    data = {
      schools: schools.map((s) => ({
        school_id: s.id,
        name: s.name,
        student_count: s._count.students,
        teacher_count: s._count.teachers,
        document_count: s._count.documents,
      })),
    };
    break;

  default:
    throw new BadRequestException('Invalid report type');
}

await this.prisma.report.update({
  where: { id: reportId },
  data: { status: 'completed', data },
});
}
async getReports(userId: string, limit: number = 10, offset: number = 0) { await this.checkAdminAccess(userId); return this.prisma.report.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, skip: offset, take: limit, }); }

async getReportById(userId: string, reportId: string) { const report = await this.prisma.report.findUnique({ where: { id: reportId } }); if (!report) throw new NotFoundException('Report not found'); if (report.user_id !== userId) throw new ForbiddenException('Access denied'); return report; }

private async checkAdminAccess(userId: string) { const user = await this.prisma.user.findUnique({ where: { id: userId } }); if (!user) throw new NotFoundException('User not found'); if (!['super_admin', 'system_admin', 'school_admin'].includes(user.role)) { throw new ForbiddenException('Admin access required'); } } }