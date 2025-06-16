import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../common/prisma.service';
import { supabaseProvider } from '../config/supabase.config';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) throw new Error('JWT_SECRET is not defined');
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '1h' },
        };
      },
      inject: [ConfigService],
    }),
    AuditLogsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService, supabaseProvider],
})
export class AuthModule {}