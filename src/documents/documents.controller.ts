import { Controller, Post, Body, Get, Param, Put, Query, UseGuards, Request, UseInterceptors, BadRequestException, HttpStatus } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusboyInterceptor } from './busboy.interceptor';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
  file?: { buffer: Buffer; originalname: string; mimetype: string; size: number };
  body: CreateDocumentDto | any; // Allow flexibility for body parsing
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
      statusCode: HttpStatus.OK,
      data: document,
    };
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