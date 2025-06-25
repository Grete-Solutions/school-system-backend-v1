import { IsString, IsOptional, IsNotEmpty, IsInt, Min, MaxLength } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  credits?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  department?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  grade_level?: string;

  @IsString()
  @IsOptional()
  teacher_id?: string;

  @IsString()
  @IsOptional()
  prerequisites?: string; // JSON string of prerequisite course IDs
}