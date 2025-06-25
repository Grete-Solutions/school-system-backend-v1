import { IsString, IsOptional, IsDateString, IsBoolean, MinLength, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTermDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_current?: boolean = false;

  @IsOptional()
  @IsString()
  status?: string = 'active';
}

export class UpdateTermDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_current?: boolean;

  @IsOptional()
  @IsString()
  status?: string;
}

export class TermResponseDto {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: string;
  description?: string;
  created_at: string;
  updated_at: string;
  academicYear?: {
    id: string;
    name: string;
    school_id: string;
  };
}

export class GetTermsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_current?: boolean;
}