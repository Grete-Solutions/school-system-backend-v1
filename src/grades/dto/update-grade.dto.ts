import { PartialType } from '@nestjs/mapped-types';
import { CreateGradeDto } from './create-grade.dto';

export class UpdateGradeDto extends PartialType(CreateGradeDto) {}

// src/grades/dto/grade-query.dto.ts
import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GradeQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsString()
  student_id?: string;

  @IsOptional()
  @IsString()
  assessment_id?: string;

  @IsOptional()
  @IsString()
  class_id?: string;

  @IsOptional()
  @IsString()
  course_id?: string;

  @IsOptional()
  @IsString()
  term_id?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'final', 'incomplete', 'excused'])
  status?: string;

  @IsOptional()
  @IsString()
  letter_grade?: string;

  @IsOptional()
  @IsDateString()
  graded_from?: string;

  @IsOptional()
  @IsDateString()
  graded_to?: string;

  @IsOptional()
  @IsString()
  @IsIn(['points_earned', 'percentage', 'letter_grade', 'graded_at', 'created_at'])
  sortBy?: string = 'graded_at';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';
}