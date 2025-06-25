import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsIn,
  MaxLength,
  Min
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGradeDto {
  @IsString()
  student_id: string;

  @IsString()
  assessment_id: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  points_earned: number;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  points_possible: number;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  letter_grade?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'final', 'incomplete', 'excused'])
  status?: string = 'final';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;

  @IsOptional()
  @IsBoolean()
  is_late?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  late_penalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  extra_credit?: number = 0;

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