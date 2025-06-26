import { IsString, IsOptional, IsUUID, IsObject, IsIn } from 'class-validator';

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