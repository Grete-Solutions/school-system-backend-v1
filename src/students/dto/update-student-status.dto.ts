import { IsString, IsIn } from 'class-validator';

export class UpdateStudentStatusDto {
  @IsString()
  @IsIn(['active', 'inactive', 'graduated', 'transferred'])
  status: string;
}