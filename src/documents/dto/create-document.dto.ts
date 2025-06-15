import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateDocumentDto {
  @IsUUID()
  school_id: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}