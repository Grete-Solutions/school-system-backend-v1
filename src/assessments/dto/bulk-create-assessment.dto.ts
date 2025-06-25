import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAssessmentDto } from './create-assessment.dto';

export class BulkCreateAssessmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAssessmentDto)
  assessments: CreateAssessmentDto[];
}