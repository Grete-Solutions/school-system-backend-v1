import { IsOptional, IsString, IsIn } from 'class-validator';

export class SchoolFilterDto {
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsString()
  search?: string;
}