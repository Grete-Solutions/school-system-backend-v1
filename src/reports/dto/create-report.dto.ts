import { IsString, IsIn, IsOptional, IsDateString } from 'class-validator';

export class CreateReportDto { @IsString() @IsIn(['document_summary', 'user_activity', 'school_stats']) type: string;

@IsString() @IsOptional() school_id?: string;

@IsDateString() @IsOptional() start_date?: string;

@IsDateString() @IsOptional() end_date?: string;

@IsString() @IsOptional() role_id?: string; }