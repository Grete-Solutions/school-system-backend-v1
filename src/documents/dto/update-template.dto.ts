export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  template_content?: any;

  @IsObject()
  @IsOptional()
  template_variables?: any;

  @IsString()
  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string;
}