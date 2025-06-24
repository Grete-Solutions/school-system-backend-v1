import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async register(dto: RegisterDto) {
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error) throw new BadRequestException(error.message);
    if (!data.user) throw new BadRequestException('User creation failed');

    const user = await this.prisma.user.create({
      data: {
        id: data.user.id,
        email: dto.email,
        password_hash: 'supabase-managed',
        role: dto.role,
        status: 'pending',
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone_number: dto.phone_number,
      },
    });

    await this.auditLogsService.createLog(
      user.id,
      'USER_CREATED',
      'User',
      user.id,
      { email: user.email, role: user.role },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
      },
      token: this.generateToken(user.id, user.role),
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) throw new UnauthorizedException('Invalid credentials');
    if (!data.user) throw new UnauthorizedException('User not found');

    const user = await this.prisma.user.findUnique({
      where: { id: data.user.id },
      include: {
        schoolUsers: {
          include: {
            school: true,
          },
        },
        student: true,
        teacher: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    await this.auditLogsService.createLog(
      user.id,
      'USER_LOGIN',
      'User',
      user.id,
      { email: user.email },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
        schools: user.schoolUsers.map(su => ({
          id: su.school.id,
          name: su.school.name,
          role: su.role,
        })),
        profile: user.student || user.teacher,
      },
      token: this.generateToken(user.id, user.role),
    };
  }

  async logout(userId: string) {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw new BadRequestException(error.message);

    await this.auditLogsService.createLog(
      userId,
      'USER_LOGOUT',
      'User',
      userId,
      {},
    );

    return { message: 'Logged out successfully' };
  }

  async refreshToken(userId: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid user');
    }
    return { token: this.generateToken(user.id, user.role) };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(dto.email, {
      redirectTo: 'http://localhost:3000/reset-password',
    });
    if (error) throw new BadRequestException(error.message);

    // Log the password reset request
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    
    if (user) {
      await this.auditLogsService.createLog(
        user.id,
        'PASSWORD_RESET_REQUESTED',
        'User',
        user.id,
        { email: dto.email },
      );
    }

    return { message: 'Password reset email sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { error } = await this.supabase.auth.updateUser({ password: dto.password });
    if (error) throw new BadRequestException(error.message);
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const { error } = await this.supabase.auth.updateUser({ password: dto.new_password });
    if (error) throw new BadRequestException(error.message);

    await this.auditLogsService.createLog(
      userId,
      'PASSWORD_CHANGED',
      'User',
      userId,
      {},
    );

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        schoolUsers: {
          include: {
            school: true,
          },
        },
        student: true,
        teacher: true,
        permissions: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) throw new BadRequestException('User not found');

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      profile_image_url: user.profile_image_url,
      role: user.role,
      status: user.status,
      last_login: user.last_login,
      created_at: user.created_at,
      schools: user.schoolUsers.map(su => ({
        id: su.school.id,
        name: su.school.name,
        role: su.role,
        status: su.status,
      })),
      profile: user.student || user.teacher,
      permissions: user.permissions,
      roles: user.roles.map(ur => ur.role),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone_number: dto.phone_number,
        profile_image_url: dto.profile_image_url,
      },
    });

    await this.auditLogsService.createLog(
      userId,
      'PROFILE_UPDATED',
      'User',
      userId,
      { changes: dto },
    );

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      profile_image_url: user.profile_image_url,
      role: user.role,
      status: user.status,
    };
  }

  private generateToken(userId: string, role: string) {
    return this.jwtService.sign({ sub: userId, role });
  }
}