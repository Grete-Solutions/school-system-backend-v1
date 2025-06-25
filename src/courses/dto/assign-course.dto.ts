import { IsString, IsNotEmpty } from 'class-validator';

export class AssignCourseDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;
}