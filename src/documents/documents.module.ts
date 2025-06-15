import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { supabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, PrismaService, JwtService, supabaseProvider],
})
export class DocumentsModule {}