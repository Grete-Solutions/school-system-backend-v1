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
        role: 'pending',
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

    return { user, token: this.generateToken(user.id, user.role) };
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
    });

    if (!user || user.status !== 'active') throw new UnauthorizedException('User not active');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    return { user, token: this.generateToken(user.id, user.role) };
  }

  async logout(userId: string) {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Logged out successfully' };
  }

  async refreshToken(userId: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active') throw new UnauthorizedException('Invalid user');
    return { token: this.generateToken(user.id, user.role) };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(dto.email, {
      redirectTo: 'http://localhost:3000/reset-password',
    });
    if (error) throw new BadRequestException(error.message);
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
    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        profile_image_url: true,
        role: true,
        status: true,
        last_login: true,
        created_at: true,
      },
    });
    if (!user) throw new BadRequestException('User not found');
    return user;
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
    return user;
  }

  private generateToken(userId: string, role: string) {
    return this.jwtService.sign({ sub: userId, role });
  }
}