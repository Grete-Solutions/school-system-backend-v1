import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, PrismaService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}