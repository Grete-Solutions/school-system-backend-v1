export class UpdateSchoolBrandingDto {
  @IsString()
  @IsOptional()
  primary_color?: string;

  @IsString()
  @IsOptional()
  secondary_color?: string;

  @IsString()
  @IsOptional()
  accent_color?: string;

  @IsString()
  @IsOptional()
  font_family?: string;

  @IsString()
  @IsOptional()
  logo_url?: string;

  @IsString()
  @IsOptional()
  banner_url?: string;

  @IsString()
  @IsOptional()
  favicon_url?: string;

  @IsObject()
  @IsOptional()
  custom_css?: Record<string, string>;
}