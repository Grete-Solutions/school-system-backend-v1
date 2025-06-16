import { IsString, IsOptional, IsDateString } from 'class-validator';

export class GetAuditLogsDto {
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  resource_type?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}