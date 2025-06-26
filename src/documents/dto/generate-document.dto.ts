import { IsString, IsOptional, IsUUID, IsObject, IsIn, IsBoolean, IsNumber } from 'class-validator';

export class GenerateReportCardDto {
  @IsUUID()
  student_id: string;

  @IsUUID()
  school_id: string;

  @IsString()
  @IsOptional()
  term_id?: string;

  @IsString()
  @IsOptional()
  academic_year_id?: string;

  @IsObject()
  @IsOptional()
  template_data?: any;
}

export class GenerateCertificateDto {
  @IsUUID()
  student_id: string;

  @IsUUID()
  school_id: string;

  @IsString()
  certificate_type: string; // graduation, completion, achievement, etc.

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  template_data?: any;
}

export class GenerateTranscriptDto {
  @IsUUID()
  student_id: string;

  @IsUUID()
  school_id: string;

  @IsString()
  @IsOptional()
  academic_year_id?: string;

  @IsString()
  @IsIn(['official', 'unofficial'])
  @IsOptional()
  type?: string = 'unofficial';

  @IsObject()
  @IsOptional()
  template_data?: any;
}

export class GenerateReceiptDto {
  @IsUUID()
  school_id: string;

  @IsString()
  receipt_type: string; // payment, fee, tuition, etc.

  @IsString()
  recipient_name: string;

  @IsString()
  amount: string;

  @IsString()
  description: string;

  @IsObject()
  @IsOptional()
  template_data?: any;
}

// Missing DTOs that need to be added
export class CreateTemplateDto {
  @IsUUID()
  school_id: string;

  @IsString()
  name: string;

  @IsString()
  @IsIn(['report_card', 'certificate', 'transcript', 'receipt'])
  type: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  template_content: any; // HTML template or JSON structure

  @IsObject()
  @IsOptional()
  template_variables?: any; // Available variables for the template

  @IsString()
  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string = 'active';

  @IsBoolean()
  @IsOptional()
  is_default?: boolean = false;

  @IsNumber()
  @IsOptional()
  version?: number = 1;
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsIn(['report_card', 'certificate', 'transcript', 'receipt'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  template_content?: any; // HTML template or JSON structure

  @IsObject()
  @IsOptional()
  template_variables?: any; // Available variables for the template

  @IsString()
  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @IsNumber()
  @IsOptional()
  version?: number;
}

export class VerifyDocumentDto {
  @IsString()
  @IsOptional()
  verification_code?: string;

  @IsString()
  @IsOptional()
  document_hash?: string;
}