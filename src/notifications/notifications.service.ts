import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(userId: string, dto: CreateNotificationDto) {
    await this.checkAdminAccess(userId);
    console.log('Creating notification:', dto);

    // Validate recipient
    if (dto.user_id) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.user_id } });
      if (!user) throw new NotFoundException('User not found');
    }
    if (dto.school_id) {
      const school = await this.prisma.school.findUnique({ where: { id: dto.school_id } });
      if (!school) throw new NotFoundException('School not found');
    }
    if (dto.role_id) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.role_id } });
      if (!role) throw new NotFoundException('Role not found');
    }
    if (!dto.user_id && !dto.role_id) {
      throw new BadRequestException('Must specify user_id or role_id');
    }

    // If role_id is provided, create notifications for all users with that role
    if (dto.role_id) {
      const userRoles = await this.prisma.userRole.findMany({
        where: { role_id: dto.role_id },
        include: { user: true },
      });
      const notifications = await Promise.all(
        userRoles.map(async (userRole) => {
          return this.prisma.notification.create({
            data: {
              title: dto.title,
              message: dto.message,
              user_id: userRole.user_id,
              school_id: dto.school_id,
              role_id: dto.role_id,
              type: dto.type || 'info',
              resource_type: dto.resource_type,
              resource_id: dto.resource_id,
              created_by: userId,
            },
          });
        }),
      );
      return notifications;
    }

    // Create single notification for specific user
    return this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        user_id: dto.user_id,
        school_id: dto.school_id,
        role_id: dto.role_id,
        type: dto.type || 'info',
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        created_by: userId,
      },
    });
  }

  async getNotifications(userId: string, limit: number = 10, offset: number = 0) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
      include: { creator: { select: { first_name: true, last_name: true } } },
    });
  }

  async getNotificationById(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { creator: { select: { first_name: true, last_name: true } } },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.user_id !== userId) throw new ForbiddenException('Access denied');
    return notification;
  }

  async updateNotification(userId: string, notificationId: string, dto: UpdateNotificationDto) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.user_id !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: dto.status },
    });
  }

  private async checkAdminAccess(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!['super_admin', 'system_admin', 'school_admin'].includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }
  }
}