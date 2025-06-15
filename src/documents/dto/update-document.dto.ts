import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['active', 'archived'])
  @IsOptional()
  status?: string;
}