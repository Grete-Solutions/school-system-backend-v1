import { IsString, IsOptional, IsIn } from 'class-validator';

export class VerifyDocumentDto {
  @IsString()
  verification_code: string;

  @IsString()
  @IsOptional()
  document_hash?: string;
}