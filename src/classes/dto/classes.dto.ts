import { IsString, IsOptional, IsEnum, IsUUID, MinLength, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ClassStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateClassDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  teacher_id?: string;

  @IsOptional()
  @IsUUID()
  term_id?: string;

  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  teacher_id?: string;

  @IsOptional()
  @IsUUID()
  term_id?: string;

  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;
}

export class GetClassesQueryDto {
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class GetClassStudentsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class AddStudentToClassDto {
  @IsUUID()
  student_id: string;
}

export class ClassResponseDto {
  id: string;
  school_id: string;
  academic_year_id: string;
  teacher_id?: string;
  term_id?: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  academicYear?: {
    id: string;
    name: string;
    school_id: string;
  };
  teacher?: {
    id: string;
    user_id: string;
    teacher_id: string;
    department?: string;
  };
  term?: {
    id: string;
    name: string;
    academic_year_id: string;
  };
}

export class StudentResponseDto {
  id: string;
  user_id: string;
  school_id: string;
  student_id: string;
  grade_level?: string;
  enrollment_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}