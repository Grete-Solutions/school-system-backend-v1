import { IsArray, ValidateNested, ArrayMinSize, IsEmail, IsString, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class BulkStudentDto {
  @IsEmail()
  email: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsString()
  student_id: string;

  @IsString()
  @IsOptional()
  grade_level?: string;

  @IsDateString()
  @IsOptional()
  enrollment_date?: string;
}

export class BulkImportStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkStudentDto)
  students: BulkStudentDto[];
}