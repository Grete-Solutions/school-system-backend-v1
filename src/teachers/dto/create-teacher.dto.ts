import { IsEmail, IsString, IsOptional, MinLength, IsUUID, IsDateString } from 'class-validator';

export class CreateTeacherDto {
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

  @IsUUID()
  school_id: string;

  @IsString()
  teacher_id: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsDateString()
  @IsOptional()
  hire_date?: string;
}