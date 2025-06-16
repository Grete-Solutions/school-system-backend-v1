import { IsString, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class CreateNotificationDto { @IsString() @IsNotEmpty() title: string;

@IsString() @IsNotEmpty() message: string;

@IsString() @IsOptional() user_id?: string;

@IsString() @IsOptional() school_id?: string;

@IsString() @IsOptional() role_id?: string;

@IsString() @IsIn(['info', 'warning', 'error']) @IsOptional() type?: string;

@IsString() @IsOptional() resource_type?: string;

@IsString() @IsOptional() resource_id?: string; }