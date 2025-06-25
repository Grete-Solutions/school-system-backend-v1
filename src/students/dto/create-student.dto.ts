import { IsEmail, IsString, IsOptional, MinLength, IsUUID, IsDateString } from 'class-validator';

export class CreateStudentDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsString()
  student_id: string;

  @IsString()
  @IsOptional()
  grade_level?: string;

  @IsDateString()
  @IsOptional()
  enrollment_date?: string;
}