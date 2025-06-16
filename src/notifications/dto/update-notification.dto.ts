import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateNotificationDto {
  @IsString()
  @IsIn(['unread', 'read'])
  @IsOptional()
  status?: string;
}