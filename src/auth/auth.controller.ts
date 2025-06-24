import { Controller, Post, Body, Get, Put, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiResponseDto } from '../common/dto/api-response.dto';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<ApiResponseDto<any>> {
    try {
      const result = await this.authService.register(dto);
      return new ApiResponseDto(true, 'User registered successfully', result);
    } catch (error) {
      return new ApiResponseDto(false, 'Registration failed', null, error.message);
    }
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<ApiResponseDto<any>> {
    try {
      const result = await this.authService.login(dto);
      return new ApiResponseDto(true, 'Login successful', result);
    } catch (error) {
      return new ApiResponseDto(false, 'Login failed', null, error.message);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: RequestWithUser): Promise<ApiResponseDto<any>> {
    try {
      const result = await this.authService.logout(req.user.sub);
      return new ApiResponseDto(true, 'Logout successful', result);
    } catch (error) {
      return new ApiResponseDto(false, 'Logout failed', null, error.message);
    }
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@Request() req: RequestWithUser): Promise<ApiResponseDto<any>> {
    try {
      const result = await this.authService.refreshToken(req.user.sub, req.user.role);
      return new ApiResponseDto(true, 'Token refreshed successfully', result);
    } catch (error) {
      return new ApiResponseDto(false, 'Token refresh failed', null, error.message);
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ApiResponseDto<any>> {
    try {
      const result = await this.authService.forgotPassword(dto);
      return new ApiResponseDto(true, 'Password reset email sent successfully', result);
    } catch (error) {
      return new ApiResponseDto(false, 'Password reset request failed', null, error.message);
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ApiResponseDto<any>> {
    try {
      const result = await this.authService.resetPassword(dto);
      return new ApiResponseDto(true, 'Password reset successfully', result);
    } catch (error) {
      return new ApiResponseDto(false, 'Password reset failed', null, error.message);
    }
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: RequestWithUser, @Body() dto: ChangePasswordDto): Promise<ApiResponseDto<any>> {
    try {
      const result = await this.authService.changePassword(req.user.sub, dto);
      return new ApiResponseDto(true, 'Password changed successfully', result);
    } catch (error) {
      return new ApiResponseDto(false, 'Password change failed', null, error.message);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: RequestWithUser): Promise<ApiResponseDto<any>> {
    try {
      const result = await this.authService.getProfile(req.user.sub);
      return new ApiResponseDto(true, 'Profile retrieved successfully', result);
    } catch (error) {
      return new ApiResponseDto(false, 'Profile retrieval failed', null, error.message);
    }
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: RequestWithUser, @Body() dto: UpdateProfileDto): Promise<ApiResponseDto<any>> {
    try {
      const result = await this.authService.updateProfile(req.user.sub, dto);
      return new ApiResponseDto(true, 'Profile updated successfully', result);
    } catch (error) {
      return new ApiResponseDto(false, 'Profile update failed', null, error.message);
    }
  }
}