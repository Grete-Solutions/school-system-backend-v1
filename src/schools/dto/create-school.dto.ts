import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  logo_url?: string;
}