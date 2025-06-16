import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';

export class CreateReportDto { @IsString() @IsIn(['user_activity', 'document_uploads', 'notification_stats']) type: string;

@IsString() @IsOptional() school_id?: string;

@IsDateString() @IsOptional() dateFrom?: string;

@IsDateString() @IsOptional() dateTo?: string; }