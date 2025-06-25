import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateStudentProfileDto {
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
  profile_image_url?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}