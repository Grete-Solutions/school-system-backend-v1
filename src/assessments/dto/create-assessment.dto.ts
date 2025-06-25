import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsDateString, 
  IsIn, 
  IsObject,
  MaxLength,
  Min,
  Max
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAssessmentDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsIn(['exam', 'quiz', 'assignment', 'project', 'presentation', 'homework', 'lab', 'discussion'])
  type: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  total_points: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  passing_score?: number;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsObject()
  grading_criteria?: any;

  @IsOptional()
  @IsBoolean()
  allow_late?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  late_penalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  @Transform(({ value }) => parseFloat(value))
  weight?: number = 1.0;

  @IsOptional()
  @IsString()
  class_id?: string;

  @IsOptional()
  @IsString()
  course_id?: string;

  @IsOptional()
  @IsString()
  term_id?: string;
}