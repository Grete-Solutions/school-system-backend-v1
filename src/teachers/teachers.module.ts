import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { supabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [TeachersController],
  providers: [TeachersService, PrismaService, JwtService, supabaseProvider],
})
export class TeachersModule {}