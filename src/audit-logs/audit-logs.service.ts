import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(userId: string, dto: GetAuditLogsDto, limit: number = 10, offset: number = 0) {
    await this.validateAdminAccess(userId);

    const where: any = {};
    if (dto.user_id) where.user_id = dto.user_id;
    if (dto.action) where.action = dto.action;
    if (dto.resource_type) where.resource_type = dto.resource_type;
    if (dto.dateFrom || dto.dateTo) {
      where.created_at = {
        ...(dto.dateFrom && { gte: new Date(dto.dateFrom) }),
        ...(dto.dateTo && { lte: new Date(dto.dateTo) }),
      };
    }

    try {
      return await this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
        include: { user: { select: { first_name: true, last_name: true, email: true } } },
      });
    } catch (error) {
      throw new Error(`Failed to retrieve audit logs: ${error.message}`);
    }
  }

  async getLogById(userId: string, logId: string) {
    await this.validateAdminAccess(userId);

    const log = await this.prisma.auditLog.findUnique({
      where: { id: logId },
      include: { user: { select: { first_name: true, last_name: true, email: true } } },
    });
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }

  async createLog(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>,
  ) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
        },
      });
    } catch (error) {
      console.error(`Failed to create audit log: ${error.message}`);
    }
  }

  private async validateAdminAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!['super_admin', 'system_admin'].includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }
  }
}