import { Controller, Post, Get, Put, Param, Body, UseGuards, Request, Query, HttpStatus } from '@nestjs/common'; import { NotificationsService } from './notifications.service'; import { CreateNotificationDto } from './dto/create-notification.dto'; import { UpdateNotificationDto } from './dto/update-notification.dto'; import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request { user: { sub: string; role: string }; }

@Controller('notifications') export class NotificationsController { constructor(private readonly notificationsService: NotificationsService) {}

@Post() @UseGuards(JwtAuthGuard) async create(@Request() req: RequestWithUser, @Body() dto: CreateNotificationDto) { const notification = await this.notificationsService.createNotification(req.user.sub, dto); return { statusCode: HttpStatus.OK, data: notification }; }

@Get() @UseGuards(JwtAuthGuard) async getAll( @Request() req: RequestWithUser, @Query('limit') limit = '10', @Query('offset') offset = '0', ) { const notifications = await this.notificationsService.getNotifications( req.user.sub, parseInt(limit), parseInt(offset), ); return { statusCode: HttpStatus.OK, data: notifications }; }

@Get(':id') @UseGuards(JwtAuthGuard) async getById(@Request() req: RequestWithUser, @Param('id') id: string) { const notification = await this.notificationsService.getNotificationById(req.user.sub, id); return { statusCode: HttpStatus.OK, data: notification }; }

@Put(':id') @UseGuards(JwtAuthGuard) async update( @Request() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateNotificationDto, ) { const notification = await this.notificationsService.updateNotification(req.user.sub, id, dto); return { statusCode: HttpStatus.OK, data: notification }; } }