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
import { TermsService } from './terms.service';
import { 
  CreateTermDto, 
  UpdateTermDto, 
  GetTermsQueryDto,
  TermResponseDto 
} from './dto/terms.dto';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-response.decorator';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Controller()
@UseInterceptors(ResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Post('academic-years/:yearId/terms')
  async create(
    @Param('yearId', ParseUUIDPipe) yearId: string,
    @Body(ValidationPipe) createTermDto: CreateTermDto,
  ): Promise<ApiResponseDto<TermResponseDto>> {
    const term = await this.termsService.create(yearId, createTermDto);
    return new ApiResponseDto(true, 'Terms retrieved successfully', term);
  }

  @Get('academic-years/:yearId/terms')
  @ApiPaginatedResponse(TermResponseDto, 'List of terms for academic year')
  async findAll(
    @Param('yearId', ParseUUIDPipe) yearId: string,
    @Query(ValidationPipe) query: GetTermsQueryDto,
  ): Promise<ApiResponseDto<PaginatedResponse<TermResponseDto>>> {
    const result = await this.termsService.findAll(yearId, query);
    return new ApiResponseDto(true, 'Terms retrieved successfully', result);
  }

  @Get('terms/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<TermResponseDto>> {
    const term = await this.termsService.findOne(id);
    return new ApiResponseDto(true, 'Term retrieved successfully', term);
  }

  @Put('terms/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateTermDto: UpdateTermDto,
  ): Promise<ApiResponseDto<TermResponseDto>> {
    const term = await this.termsService.update(id, updateTermDto);
    return new ApiResponseDto(true, 'Term updated successfully', term);
  }

  @Delete('terms/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    const result = await this.termsService.remove(id);
    return new ApiResponseDto(true, 'Term deleted successfully', result);
  }

  @Put('terms/:id/set-current')
  async setCurrent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<TermResponseDto>> {
    const term = await this.termsService.setCurrent(id);
    return new ApiResponseDto(true, 'Term set as current successfully', term);
  }
}