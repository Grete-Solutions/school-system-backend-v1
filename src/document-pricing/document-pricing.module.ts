import { Module } from '@nestjs/common';
import { DocumentPricingController } from './document-pricing.controller';
import { DocumentPricingService } from './document-pricing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentPricingController],
  providers: [DocumentPricingService],
  exports: [DocumentPricingService],
})
export class DocumentPricingModule {}