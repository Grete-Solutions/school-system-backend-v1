// src/students/students.module.ts
import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { supabaseProvider } from '../config/supabase.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [StudentsController],
  providers: [
    StudentsService, 
    PrismaService, 
    JwtService, 
    supabaseProvider
  ],
  exports: [StudentsService],
})
export class StudentsModule {}