import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { DocumentPricingService } from './document-pricing.service';
import { CreateDocumentPricingDto } from './dto/create-document-pricing.dto';
import { UpdateDocumentPricingDto } from './dto/update-document-pricing.dto';
import { DocumentPricingQueryDto } from './dto/document-pricing-query.dto';
import { DocumentPricingResponseDto } from './dto/document-pricing-response.dto';
import { ApiResponseDto } from './../common/dto/api-response.dto';
import { ApiPaginatedResponse } from './../common/decorators/api-response.decorator';
import { PaginatedResponse } from './../common/interfaces/paginated-response.interface';

@ApiTags('Document Pricing')
@ApiBearerAuth()
@Controller()
export class DocumentPricingController {
  constructor(private readonly documentPricingService: DocumentPricingService) {}

  @Post('document-pricing')
  @ApiOperation({ 
    summary: 'Create a new document pricing rule',
    description: 'Creates a new pricing rule for documents. Can be global (no school_id) or school-specific.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document pricing rule created successfully',
    type: DocumentPricingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Active pricing already exists for this document type'
  })
  async create(
    @Body() createDocumentPricingDto: CreateDocumentPricingDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<DocumentPricingResponseDto>> {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.documentPricingService.create(createDocumentPricingDto, userId);
    
    return new ApiResponseDto(
      true,
      'Document pricing rule created successfully',
      result
    );
  }

  @Get('document-pricing')
  @ApiOperation({ 
    summary: 'Get global document pricing rules',
    description: 'Retrieves paginated list of global document pricing rules (not school-specific)'
  })
  @ApiPaginatedResponse(DocumentPricingResponseDto, 'Global document pricing retrieved successfully')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'document_type', required: false, type: String, description: 'Filter by document type' })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Filter by currency' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in document type or description' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  async findGlobalPricing(
    @Query() query: DocumentPricingQueryDto,
  ): Promise<ApiResponseDto<PaginatedResponse<DocumentPricingResponseDto>>> {
    const result = await this.documentPricingService.findGlobalPricing(query);
    
    return new ApiResponseDto(
      true,
      'Global document pricing retrieved successfully',
      result
    );
  }

  @Get('schools/:schoolId/document-pricing')
  @ApiOperation({ 
    summary: 'Get school-specific document pricing rules',
    description: 'Retrieves paginated list of document pricing rules for a specific school'
  })
  @ApiParam({ name: 'schoolId', description: 'School ID', type: 'string' })
  @ApiPaginatedResponse(DocumentPricingResponseDto, 'School document pricing retrieved successfully')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'document_type', required: false, type: String, description: 'Filter by document type' })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Filter by currency' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in document type or description' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  async findSchoolPricing(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() query: DocumentPricingQueryDto,
  ): Promise<ApiResponseDto<PaginatedResponse<DocumentPricingResponseDto>>> {
    const result = await this.documentPricingService.findSchoolPricing(schoolId, query);
    
    return new ApiResponseDto(
      true,
      'School document pricing retrieved successfully',
      result
    );
  }

  @Get('document-pricing/all')
  @ApiOperation({ 
    summary: 'Get all document pricing rules',
    description: 'Retrieves paginated list of all document pricing rules (both global and school-specific)'
  })
  @ApiPaginatedResponse(DocumentPricingResponseDto, 'All document pricing retrieved successfully')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'document_type', required: false, type: String, description: 'Filter by document type' })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Filter by currency' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'school_id', required: false, type: String, description: 'Filter by school ID' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in document type or description' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  async findAll(
    @Query() query: DocumentPricingQueryDto,
  ): Promise<ApiResponseDto<PaginatedResponse<DocumentPricingResponseDto>>> {
    const result = await this.documentPricingService.findAll(query);
    
    return new ApiResponseDto(
      true,
      'All document pricing retrieved successfully',
      result
    );
  }

  @Get('document-pricing/:id')
  @ApiOperation({ 
    summary: 'Get a specific document pricing rule',
    description: 'Retrieves a specific document pricing rule by ID'
  })
  @ApiParam({ name: 'id', description: 'Document pricing ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document pricing retrieved successfully',
    type: DocumentPricingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document pricing not found'
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<DocumentPricingResponseDto>> {
    const result = await this.documentPricingService.findOne(id);
    
    return new ApiResponseDto(
      true,
      'Document pricing retrieved successfully',
      result
    );
  }

  @Put('document-pricing/:id')
  @ApiOperation({ 
    summary: 'Update a document pricing rule',
    description: 'Updates an existing document pricing rule'
  })
  @ApiParam({ name: 'id', description: 'Document pricing ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document pricing updated successfully',
    type: DocumentPricingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document pricing not found'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Active pricing already exists for this document type'
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentPricingDto: UpdateDocumentPricingDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<DocumentPricingResponseDto>> {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.documentPricingService.update(id, updateDocumentPricingDto, userId);
    
    return new ApiResponseDto(
      true,
      'Document pricing updated successfully',
      result
    );
  }

  @Delete('document-pricing/:id')
  @ApiOperation({ 
    summary: 'Delete a document pricing rule',
    description: 'Permanently deletes a document pricing rule'
  })
  @ApiParam({ name: 'id', description: 'Document pricing ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Document pricing deleted successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document pricing not found'
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.documentPricingService.remove(id);
    
    return new ApiResponseDto(
      true,
      'Document pricing deleted successfully',
      null
    );
  }

  // Additional utility endpoints

  @Get('document-pricing/types/list')
  @ApiOperation({ 
    summary: 'Get available document types',
    description: 'Retrieves a list of all document types that have pricing configured'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document types retrieved successfully'
  })
  async getDocumentTypes(): Promise<ApiResponseDto<string[]>> {
    const result = await this.documentPricingService.getDocumentTypes();
    
    return new ApiResponseDto(
      true,
      'Document types retrieved successfully',
      result
    );
  }

  @Get('document-pricing/pricing/:documentType')
  @ApiOperation({ 
    summary: 'Get active pricing for a document type',
    description: 'Retrieves active pricing for a specific document type, with optional school context'
  })
  @ApiParam({ name: 'documentType', description: 'Document type', type: 'string' })
  @ApiQuery({ name: 'school_id', required: false, type: String, description: 'School ID for school-specific pricing' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active pricing retrieved successfully',
    type: DocumentPricingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active pricing found for this document type'
  })
  async getActivePricing(
    @Param('documentType') documentType: string,
    @Query('school_id') schoolId?: string,
  ): Promise<ApiResponseDto<DocumentPricingResponseDto>> {
    const result = await this.documentPricingService.getActivePricing(documentType, schoolId);
    
    return new ApiResponseDto(
      true,
      'Active pricing retrieved successfully',
      result
    );
  }

  @Post('document-pricing/:id/deactivate')
  @ApiOperation({ 
    summary: 'Deactivate a document pricing rule',
    description: 'Deactivates a document pricing rule without deleting it'
  })
  @ApiParam({ name: 'id', description: 'Document pricing ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document pricing deactivated successfully',
    type: DocumentPricingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document pricing not found'
  })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<DocumentPricingResponseDto>> {
    const result = await this.documentPricingService.deactivate(id);
    
    return new ApiResponseDto(
      true,
      'Document pricing deactivated successfully',
      result
    );
  }

  @Post('document-pricing/:id/activate')
  @ApiOperation({ 
    summary: 'Activate a document pricing rule',
    description: 'Activates a previously deactivated document pricing rule'
  })
  @ApiParam({ name: 'id', description: 'Document pricing ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document pricing activated successfully',
    type: DocumentPricingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document pricing not found'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Cannot activate - another active pricing exists for this document type'
  })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<DocumentPricingResponseDto>> {
    const result = await this.documentPricingService.activate(id);
    
    return new ApiResponseDto(
      true,
      'Document pricing activated successfully',
      result
    );
  }
}