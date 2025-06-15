import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class RegisterDto {
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
  @IsIn(['student', 'teacher', 'school_admin', 'super_admin', 'system_admin'])
  role: string;
}