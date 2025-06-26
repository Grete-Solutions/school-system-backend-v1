import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';

export class CreateDocumentDto {
  @IsUUID()
  school_id: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['active', 'draft', 'published', 'archived'])
  @IsOptional()
  status?: string = 'active';
}