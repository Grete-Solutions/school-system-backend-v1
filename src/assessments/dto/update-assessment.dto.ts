import { PartialType } from '@nestjs/mapped-types';
import { CreateAssessmentDto } from './create-assessment.dto';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'published', 'completed', 'archived'])
  status?: string;
}