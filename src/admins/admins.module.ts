import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { supabaseProvider } from '../config/supabase.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [AdminsController],
  providers: [
    AdminsService, 
    PrismaService, 
    JwtService, 
    supabaseProvider
  ],
  exports: [AdminsService],
})
export class AdminsModule {}