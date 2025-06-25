import { IsEmail, IsString, IsOptional, MinLength, IsIn } from 'class-validator';

export class CreateAdminDto {
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
  @IsIn(['system_admin', 'super_admin'])
  role: string;

  @IsString()
  @IsOptional()
  profile_image_url?: string;
}