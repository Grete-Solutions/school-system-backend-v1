import { Controller, Post, Body, Get, Put, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: RequestWithUser) {
    return this.authService.logout(req.user.sub);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@Request() req: RequestWithUser) {
    return this.authService.refreshToken(req.user.sub, req.user.role);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: RequestWithUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: RequestWithUser) {
    return this.authService.getProfile(req.user.sub);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: RequestWithUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, dto);
  }
}