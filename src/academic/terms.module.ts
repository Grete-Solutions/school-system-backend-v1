import { Module } from '@nestjs/common';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [TermsController],
  providers: [TermsService, PrismaService],
  exports: [TermsService],
})
export class TermsModule {}