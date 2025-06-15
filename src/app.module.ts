import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { DocumentsModule } from './documents/documents.module';

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
  ],
})
export class AppModule {}