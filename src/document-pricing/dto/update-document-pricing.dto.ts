import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentPricingDto } from './create-document-pricing.dto';

export class UpdateDocumentPricingDto extends PartialType(CreateDocumentPricingDto) {}

// src/modules/document-pricing/dto/document-pricing-query.dto.ts
import { IsOptional, IsString, IsBoolean, IsUUID, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class DocumentPricingQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  document_type?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID()
  school_id?: string;

  @IsOptional()
  @IsString()
  search?: string; // For searching by description or document type
}