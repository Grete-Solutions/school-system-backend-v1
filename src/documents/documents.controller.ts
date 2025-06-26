import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Put, 
  Delete,
  Query, 
  UseGuards, 
  Request, 
  UseInterceptors, 
  BadRequestException, 
  HttpStatus 
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusboyInterceptor } from './busboy.interceptor';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
  file?: { buffer: Buffer; originalname: string; mimetype: string; size: number };
  body: CreateDocumentDto | any;
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(BusboyInterceptor)
  async create(@Request() req: RequestWithUser) {
    console.log('Received create document request:', {
      user: req.user.sub,
      dto: JSON.stringify(req.body),
      file: req.file?.originalname,
      fileSize: req.file?.size,
    });
    if (!req.file) {
      throw new BadRequestException('File is required');
    }
    const document = await this.documentsService.createDocument(req.user.sub, req.body, req.file);
    console.log('Returning created document:', JSON.stringify(document));
    return {
      statusCode: HttpStatus.CREATED,
      data: document,
    };
  }

  @Get('students/:studentId/documents')
  @UseGuards(JwtAuthGuard)
  async getStudentDocuments(
    @Request() req: RequestWithUser,
    @Param('studentId') studentId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const result = await this.documentsService.getStudentDocuments(
      req.user.sub,
      studentId,
      paginationQuery,
    );
    return {
      statusCode: HttpStatus.OK,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('schools/:schoolId/documents')
  @UseGuards(JwtAuthGuard)
  async getSchoolDocuments(
    @Request() req: RequestWithUser,
    @Param('schoolId') schoolId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const result = await this.documentsService.getSchoolDocuments(
      req.user.sub,
      schoolId,
      paginationQuery,
    );
    return {
      statusCode: HttpStatus.OK,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Request() req: RequestWithUser, @Param('id') id: string) {
    const document = await this.documentsService.getDocumentById(id, req.user.sub);
    return {
      statusCode: HttpStatus.OK,
      data: document,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    const document = await this.documentsService.updateDocument(id, req.user.sub, dto);
    return {
      statusCode: HttpStatus.OK,
      data: document,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Request() req: RequestWithUser, @Param('id') id: string) {
    const result = await this.documentsService.deleteDocument(id, req.user.sub);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  async publish(@Request() req: RequestWithUser, @Param('id') id: string) {
    const document = await this.documentsService.publishDocument(id, req.user.sub);
    return {
      statusCode: HttpStatus.OK,
      data: document,
      message: 'Document published successfully',
    };
  }

  // Legacy endpoint for backward compatibility
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Request() req: RequestWithUser,
    @Query('schoolId') schoolId: string,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    if (!schoolId) {
      throw new BadRequestException('schoolId query parameter is required');
    }
    
    const paginationQuery: PaginationQueryDto = {
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      limit: parseInt(limit),
    };

    const result = await this.documentsService.getSchoolDocuments(
      req.user.sub,
      schoolId,
      paginationQuery,
    );

    return {
      statusCode: HttpStatus.OK,
      data: result.data,
      pagination: result.pagination,
    };
  }
}