import { IsEmail, IsString, IsOptional, MinLength, IsUUID, IsDateString } from 'class-validator';

export class CreateTeacherDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString({ message: 'First name is required' })
  first_name: string;

  @IsString({ message: 'Last name is required' })
  last_name: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsUUID(4, { message: 'School ID must be a valid UUID' })
  @IsOptional() // Made optional since it can come from route parameter
  school_id?: string;

  @IsString({ message: 'Teacher ID is required' })
  teacher_id: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsDateString({}, { message: 'Hire date must be a valid date string (ISO 8601)' })
  @IsOptional()
  hire_date?: string;
}