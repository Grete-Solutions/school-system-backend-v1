export class CreateTemplateDto {
  @IsUUID()
  school_id: string;

  @IsString()
  name: string;

  @IsString()
  type: string; // report_card, certificate, transcript, receipt

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
}