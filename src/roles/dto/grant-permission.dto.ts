import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GrantPermissionDto {
  @IsString()
  @IsNotEmpty()
  permissionKey: string;

  @IsString()
  @IsOptional()
  resourceType?: string;

  @IsString()
  @IsOptional()
  resourceId?: string;
}