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
import { AcademicYearsService } from './academic-years.service';
import { 
  CreateAcademicYearDto, 
  UpdateAcademicYearDto, 
  GetAcademicYearsQueryDto,
  AcademicYearResponseDto 
} from './dto/academic-years.dto';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-response.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Post('schools/:schoolId/academic-years')
  async create(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body(ValidationPipe) createAcademicYearDto: CreateAcademicYearDto,
  ): Promise<ApiResponseDto<AcademicYearResponseDto>> {
    const academicYear = await this.academicYearsService.create(schoolId, createAcademicYearDto);
    return new ApiResponseDto(true, 'Academic year created successfully', academicYear);
  }

  @Get('schools/:schoolId/academic-years')
  @ApiPaginatedResponse(AcademicYearResponseDto, 'List of academic years')
  async findAll(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query(ValidationPipe) query: GetAcademicYearsQueryDto,
  ) {
    const result = await this.academicYearsService.findAll(schoolId, query);
    return new ApiResponseDto(true, 'Academic years retrieved successfully', result);
  }

  @Get('academic-years/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<AcademicYearResponseDto>> {
    const academicYear = await this.academicYearsService.findOne(id);
    return new ApiResponseDto(true, 'Academic year retrieved successfully', academicYear);
  }

  @Put('academic-years/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateAcademicYearDto: UpdateAcademicYearDto,
  ): Promise<ApiResponseDto<AcademicYearResponseDto>> {
    const academicYear = await this.academicYearsService.update(id, updateAcademicYearDto);
    return new ApiResponseDto(true, 'Academic year updated successfully', academicYear);
  }

  @Delete('academic-years/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    const result = await this.academicYearsService.remove(id);
    return new ApiResponseDto(true, 'Academic year deleted successfully', result);
  }

  @Put('academic-years/:id/set-current')
  async setCurrent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<AcademicYearResponseDto>> {
    const academicYear = await this.academicYearsService.setCurrent(id);
    return new ApiResponseDto(true, 'Academic year set as current successfully', academicYear);
  }

  @Get('schools/:schoolId/academic-years/current')
  async getCurrentAcademicYear(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
  ): Promise<ApiResponseDto<AcademicYearResponseDto>> {
    const academicYear = await this.academicYearsService.getCurrentAcademicYear(schoolId);
    return new ApiResponseDto(true, 'Current academic year retrieved successfully', academicYear);
  }
}