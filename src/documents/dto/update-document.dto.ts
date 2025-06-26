import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['active', 'draft', 'published', 'archived'])
  @IsOptional()
  status?: string;
}