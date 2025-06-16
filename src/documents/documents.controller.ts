import { Controller, Post, Body, Get, Param, Put, Query, UseGuards, Request, UseInterceptors, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileUploadInterceptor } from './file-upload.interceptor';
import { UploadedFile } from 'express-fileupload';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
  files?: { file: UploadedFile };
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileUploadInterceptor)
  async create(
    @Request() req: RequestWithUser,
    @Body() dto: CreateDocumentDto,
  ) {
    console.log('Received create document request:', {
      user: req.user.sub,
      dto: JSON.stringify(dto),
      file: req.files?.file?.name,
    });
    if (!req.files || !req.files.file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.createDocument(req.user.sub, dto, req.files.file);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.documentsService.getDocumentById(id, req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(id, req.user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Request() req: RequestWithUser,
    @Query('schoolId') schoolId: string,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    return this.documentsService.getAllDocuments(req.user.sub, schoolId, parseInt(limit), parseInt(offset));
  }
}