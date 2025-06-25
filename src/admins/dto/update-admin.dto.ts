import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateAdminDto {
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
  @IsIn(['system_admin', 'super_admin'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsIn(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  profile_image_url?: string;
}