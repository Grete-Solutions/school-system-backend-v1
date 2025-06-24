import { IsString, IsOptional, IsBoolean, IsObject, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class AcademicSettings {
  @IsString()
  @IsOptional()
  academic_year_start?: string; // Format: YYYY-MM-DD

  @IsString()
  @IsOptional()
  academic_year_end?: string; // Format: YYYY-MM-DD

  @IsNumber()
  @Min(1)
  @Max(4)
  @IsOptional()
  terms_per_year?: number;

  @IsNumber()
  @Min(1)
  @Max(7)
  @IsOptional()
  school_days_per_week?: number;

  @IsString()
  @IsOptional()
  time_zone?: string;
}

class NotificationSettings {
  @IsBoolean()
  @IsOptional()
  email_notifications?: boolean;

  @IsBoolean()
  @IsOptional()
  sms_notifications?: boolean;

  @IsBoolean()
  @IsOptional()
  push_notifications?: boolean;

  @IsBoolean()
  @IsOptional()
  parent_notifications?: boolean;
}

class SecuritySettings {
  @IsBoolean()
  @IsOptional()
  two_factor_auth_required?: boolean;

  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  password_expiry_days?: number;

  @IsNumber()
  @Min(3)
  @Max(10)
  @IsOptional()
  max_login_attempts?: number;

  @IsBoolean()
  @IsOptional()
  ip_restriction_enabled?: boolean;

  @IsString({ each: true })
  @IsOptional()
  allowed_ip_addresses?: string[];
}

export class UpdateSchoolSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AcademicSettings)
  academic?: AcademicSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettings)
  notifications?: NotificationSettings;

  @IsOptional()
  @ValidateNested()
  @Type(() => SecuritySettings)
  security?: SecuritySettings;

  @IsObject()
  @IsOptional()
  custom_fields?: Record<string, any>;
}