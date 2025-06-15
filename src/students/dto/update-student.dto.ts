import { IsEmail, IsString, IsOptional, MinLength, IsIn, IsDateString } from 'class-validator';

export class UpdateStudentDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsString()
  @IsOptional()
  student_id?: string;

  @IsString()
  @IsOptional()
  grade_level?: string;

  @IsDateString()
  @IsOptional()
  enrollment_date?: string;

  @IsString()
  @IsIn(['active', 'inactive', 'graduated', 'transferred'])
  @IsOptional()
  status?: string;
}