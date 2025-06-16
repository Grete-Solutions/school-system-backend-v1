import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(userId: string, dto: CreateReportDto) {
    await this.validateRequest(userId, dto);

    let data: any;
    switch (dto.type) {
      case 'user_activity':
        data = await this.generateUserActivityReport(dto);
        break;
      case 'document_uploads':
        data = await this.generateDocumentUploadsReport(dto);
        break;
      case 'notification_stats':
        data = await this.generateNotificationStatsReport(dto);
        break;
      default:
        throw new BadRequestException('Invalid report type');
    }

    return this.prisma.report.create({
      data: {
        user_id: userId,
        school_id: dto.school_id,
        type: dto.type,
        parameters: {
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
        },
        data,
        status: 'completed',
      },
    });
  }

  async getReports(userId: string, schoolId?: string, limit: number = 10, offset: number = 0) {
    await this.validateRequest(userId, { school_id: schoolId });

    const where: any = { user_id: userId };
    if (schoolId) where.school_id = schoolId;

    return this.prisma.report.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
      include: { user: { select: { first_name: true, last_name: true } } },
    });
  }

  async getReportById(userId: string, reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { user: { select: { first_name: true, last_name: true } } },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.user_id !== userId) throw new ForbiddenException('Access denied');
    return report;
  }

  private async generateUserActivityReport(dto: CreateReportDto) {
    const where: any = {};
    if (dto.school_id) {
      where.schoolUsers = { some: { school_id: dto.school_id } };
    }
    if (dto.dateFrom || dto.dateTo) {
      where.created_at = {
        ...(dto.dateFrom && { gte: new Date(dto.dateFrom) }),
        ...(dto.dateTo && { lte: new Date(dto.dateTo) }),
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, role: true, status: true, created_at: true },
    });

    return {
      totalUsers: users.length,
      roleCounts: users.reduce((acc: Record<string, number>, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}),
      statusCounts: users.reduce((acc: Record<string, number>, user) => {
        acc[user.status] = (acc[user.status] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  private async generateDocumentUploadsReport(dto: CreateReportDto) {
    const where: any = { school_id: dto.school_id };
    if (dto.dateFrom || dto.dateTo) {
      where.created_at = {
        ...(dto.dateFrom && { gte: new Date(dto.dateFrom) }),
        ...(dto.dateTo && { lte: new Date(dto.dateTo) }),
      };
    }

    const documents = await this.prisma.document.findMany({
      where,
      select: { id: true, file_type: true, user_id: true, created_at: true },
    });

    return {
      totalDocuments: documents.length,
      fileTypeCounts: documents.reduce((acc: Record<string, number>, doc) => {
        acc[doc.file_type] = (acc[doc.file_type] || 0) + 1;
        return acc;
      }, {}),
      userUploadCounts: documents.reduce((acc: Record<string, number>, doc) => {
        acc[doc.user_id] = (acc[doc.user_id] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  private async generateNotificationStatsReport(dto: CreateReportDto) {
    const where: any = { school_id: dto.school_id };
    if (dto.dateFrom || dto.dateTo) {
      where.created_at = {
        ...(dto.dateFrom && { gte: new Date(dto.dateFrom) }),
        ...(dto.dateTo && { lte: new Date(dto.dateTo) }),
      };
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      select: { id: true, type: true, status: true, created_at: true },
    });

    return {
      totalNotifications: notifications.length,
      typeCounts: notifications.reduce((acc: Record<string, number>, notif) => {
        acc[notif.type] = (acc[notif.type] || 0) + 1;
        return acc;
      }, {}),
      statusCounts: notifications.reduce((acc: Record<string, number>, notif) => {
        acc[notif.status] = (acc[notif.status] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  private async validateRequest(userId: string, dto: { school_id?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { schoolUsers: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const isAdmin = ['super_admin', 'system_admin'].includes(user.role);
    const isSchoolAdmin = user.schoolUsers.some(
      (su) => su.role === 'school_admin' && (!dto.school_id || su.school_id === dto.school_id),
    );
    if (!isAdmin && !isSchoolAdmin) throw new ForbiddenException('Admin access required');

    if (dto.school_id) {
      const school = await this.prisma.school.findUnique({ where: { id: dto.school_id } });
      if (!school) throw new NotFoundException('School not found');
      if (!isAdmin && !user.schoolUsers.some((su) => su.school_id === dto.school_id)) {
        throw new ForbiddenException('No access to this school');
      }
    }
  }
}