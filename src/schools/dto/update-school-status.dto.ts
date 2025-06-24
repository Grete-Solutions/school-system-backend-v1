import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class UpdateSchoolStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive', 'suspended'])
  status: 'active' | 'inactive' | 'suspended';
}