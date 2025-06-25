import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class AssessmentQueryDto {
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
  @IsIn(['exam', 'quiz', 'assignment', 'project', 'presentation', 'homework', 'lab', 'discussion'])
  type?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'published', 'completed', 'archived'])
  status?: string;

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
  teacher_id?: string;

  @IsOptional()
  @IsDateString()
  due_date_from?: string;

  @IsOptional()
  @IsDateString()
  due_date_to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['title', 'type', 'due_date', 'total_points', 'created_at', 'updated_at'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';
}