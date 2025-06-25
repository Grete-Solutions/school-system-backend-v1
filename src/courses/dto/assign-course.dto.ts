import { IsString, IsUUID } from 'class-validator';

export class AssignCourseDto {
  @IsString()
  @IsUUID()
  courseId: string;
}