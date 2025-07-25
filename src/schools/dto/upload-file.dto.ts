import { IsString, IsOptional } from 'class-validator';

export class UploadFileDto {
  @IsString()
  @IsOptional()
  alt_text?: string;

  @IsString()
  @IsOptional()
  description?: string;
}