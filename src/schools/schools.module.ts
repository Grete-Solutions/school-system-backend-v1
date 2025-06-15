import { Module } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService, PrismaService, JwtService],
})
export class SchoolsModule {}