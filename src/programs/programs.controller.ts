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
import { ProgramsService } from './programs.service';
import { 
  CreateProgramDto, 
  UpdateProgramDto, 
  GetProgramsQueryDto,
  ProgramResponseDto 
} from './dto/programs.dto';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-response.decorator';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Controller()
@UseInterceptors(ResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post('schools/:schoolId/programs')
  async create(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body(ValidationPipe) createProgramDto: CreateProgramDto,
  ): Promise<ApiResponseDto<ProgramResponseDto>> {
    const program = await this.programsService.create(schoolId, createProgramDto);
    return new ApiResponseDto(true, 'Program created successfully', program);
  }

  @Get('schools/:schoolId/programs')
  @ApiPaginatedResponse(ProgramResponseDto, 'List of programs for school')
  async findAll(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query(ValidationPipe) query: GetProgramsQueryDto,
  ): Promise<ApiResponseDto<PaginatedResponse<ProgramResponseDto>>> {
    const result = await this.programsService.findAll(schoolId, query);
    return new ApiResponseDto(true, 'Programs retrieved successfully', result);
  }

  @Get('programs/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<ProgramResponseDto>> {
    const program = await this.programsService.findOne(id);
    return new ApiResponseDto(true, 'Program retrieved successfully', program);
  }

  @Put('programs/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateProgramDto: UpdateProgramDto,
  ): Promise<ApiResponseDto<ProgramResponseDto>> {
    const program = await this.programsService.update(id, updateProgramDto);
    return new ApiResponseDto(true, 'Program updated successfully', program);
  }

  @Delete('programs/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    const result = await this.programsService.remove(id);
    return new ApiResponseDto(true, 'Program deleted successfully', result);
  }
}