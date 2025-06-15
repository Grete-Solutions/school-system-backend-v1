import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, PrismaService, JwtService, supabaseProvider],
})
export class StudentsModule {}