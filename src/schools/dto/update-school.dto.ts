import { IsString, IsEmail, IsOptional, MinLength, IsIn } from 'class-validator';

export class UpdateSchoolDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  logo_url?: string;

  @IsString()
  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string;
}