import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UseFilters,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import {
  CreateClassDto,
  UpdateClassDto,
  GetClassesQueryDto,
  GetClassStudentsQueryDto,
  AddStudentToClassDto,
  ClassResponseDto,
  StudentResponseDto,
} from './dto/classes.dto';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-response.decorator';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Controller()
@UseInterceptors(ResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post('schools/:schoolId/classes')
  async create(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body(ValidationPipe) createClassDto: CreateClassDto,
  ): Promise<ApiResponseDto<ClassResponseDto>> {
    const classEntity = await this.classesService.create(schoolId, createClassDto);
    return new ApiResponseDto(true, 'Class created successfully', classEntity);
  }

  @Get('schools/:schoolId/classes')
  @ApiPaginatedResponse(ClassResponseDto, 'List of classes for school')
  async findAll(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query(ValidationPipe) query: GetClassesQueryDto,
  ): Promise<ApiResponseDto<PaginatedResponse<ClassResponseDto>>> {
    const result = await this.classesService.findAll(schoolId, query);
    return new ApiResponseDto(true, 'Classes retrieved successfully', result);
  }

  @Get('classes/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<ClassResponseDto>> {
    const classEntity = await this.classesService.findOne(id);
    return new ApiResponseDto(true, 'Class retrieved successfully', classEntity);
  }

  @Put('classes/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateClassDto: UpdateClassDto,
  ): Promise<ApiResponseDto<ClassResponseDto>> {
    const classEntity = await this.classesService.update(id, updateClassDto);
    return new ApiResponseDto(true, 'Class updated successfully', classEntity);
  }

  @Delete('classes/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    const result = await this.classesService.remove(id);
    return new ApiResponseDto(true, 'Class deleted successfully', result);
  }

  @Get('classes/:id/students')
  @ApiPaginatedResponse(StudentResponseDto, 'List of students in class')
  async getStudents(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(ValidationPipe) query: GetClassStudentsQueryDto,
  ): Promise<ApiResponseDto<PaginatedResponse<StudentResponseDto>>> {
    const result = await this.classesService.getStudents(id, query);
    return new ApiResponseDto(true, 'Students retrieved successfully', result);
  }

  @Post('classes/:id/students')
  async addStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) addStudentDto: AddStudentToClassDto,
  ): Promise<ApiResponseDto<{ message: string }>> {
    const result = await this.classesService.addStudent(id, addStudentDto.student_id);
    return new ApiResponseDto(true, 'Student added to class successfully', result);
  }

  @Delete('classes/:id/students/:studentId')
  async removeStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    const result = await this.classesService.removeStudent(id, studentId);
    return new ApiResponseDto(true, 'Student removed from class successfully', result);
  }
}