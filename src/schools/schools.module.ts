import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { PrismaService } from '../common/prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    SupabaseModule, // Import the Supabase module
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '60m' },
    }),
  ],
  controllers: [SchoolsController],
  providers: [
    SchoolsService,
    PrismaService,
  ],
  exports: [SchoolsService],
})
export class SchoolsModule {}