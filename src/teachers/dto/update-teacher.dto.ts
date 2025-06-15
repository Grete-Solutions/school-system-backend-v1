import { IsEmail, IsString, IsOptional, MinLength, IsIn, IsDateString } from 'class-validator';

export class UpdateTeacherDto {
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
  teacher_id?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsDateString()
  @IsOptional()
  hire_date?: string;

  @IsString()
  @IsIn(['active', 'inactive', 'retired'])
  @IsOptional()
  status?: string;
}