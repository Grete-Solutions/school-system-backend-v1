import { IsString, IsOptional, IsNumber, Min, IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GradeUpdateItem {
  @IsString()
  id: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  points_earned?: number;

  @IsOptional()
  @IsString()
  letter_grade?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'final', 'incomplete', 'excused'])
  status?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class BulkUpdateGradeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeUpdateItem)
  grades: GradeUpdateItem[];
}