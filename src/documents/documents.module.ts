import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { supabaseProvider } from '../config/supabase.config';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PrismaService, JwtService, supabaseProvider],
  exports: [DocumentsService], // Export service for use in other modules
})
export class DocumentsModule {}