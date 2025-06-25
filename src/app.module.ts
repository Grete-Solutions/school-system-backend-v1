import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { DocumentsModule } from './documents/documents.module';
import { RolesModule } from './roles/roles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AdminsModule } from './admins/admins.module';
import { AcademicYearsModule } from './academic/academic-years.module';
import { TermsModule } from './academic/terms.module';
import { ProgramsModule } from './programs/programs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
      ],
    }),
    AuthModule,
    SchoolsModule,
    StudentsModule,
    TeachersModule,
    DocumentsModule,
    RolesModule,
    NotificationsModule,
    ReportsModule,
    AuditLogsModule,
    AdminsModule,
    AcademicYearsModule,
    TermsModule,
    ProgramsModule,
  ],
})
export class AppModule {}