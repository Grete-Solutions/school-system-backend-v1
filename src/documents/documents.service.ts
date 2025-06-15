import { Injectable, ForbiddenException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async createDocument(userId: string, dto: CreateDocumentDto, file: UploadedFile) {
    try {
      console.log('Creating document with DTO:', dto, 'File:', file.name);
      if (!dto.school_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.school_id)) {
        throw new BadRequestException('Invalid school_id: Must be a valid UUID');
      }
      await this.checkSchoolAccess(userId, dto.school_id);

      if (!file) throw new BadRequestException('File is required');

      // Upload file to Supabase Storage
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const { data, error } = await this.supabase.storage
        .from('documents')
        .upload(`school_${dto.school_id}/${fileName}`, file.data, {
          contentType: file.mimetype,
        });

      console.log('Supabase storage upload response:', { data, error });
      if (error) throw new BadRequestException(`Storage upload failed: ${error.message}`);

      // Create document record in Prisma
      const document = await this.prisma.document.create({
        data: {
          school_id: dto.school_id,
          user_id: userId,
          title: dto.title,
          description: dto.description,
          file_url: `${process.env.SUPABASE_URL}/storage/v1/object/public/documents/school_${dto.school_id}/${fileName}`,
          file_type: file.mimetype,
          file_size: file.size,
          status: 'active',
        },
      });
      console.log('Prisma document created:', document.id);

      return document;
    } catch (error) {
      console.error('Error in createDocument:', error);
      throw new InternalServerErrorException(`Failed to create document: ${error.message}`);
    }
  }

  async getDocumentById(documentId: string, userId: string) {
    if (!documentId) throw new BadRequestException('Invalid document_id');
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { user: true, school: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.checkSchoolAccess(userId, document.school_id);
    return document;
  }

  async updateDocument(documentId: string, userId: string, dto: UpdateDocumentDto) {
    if (!documentId) throw new BadRequestException('Invalid document_id');
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.checkSchoolAccess(userId, document.school_id, ['school_admin', 'super_admin', 'system_admin']);

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
      },
    });

    return updatedDocument;
  }

  async getAllDocuments(userId: string, schoolId: string, limit: number = 10, offset: number = 0) {
    if (!schoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new BadRequestException('Invalid school_id: Must be a valid UUID');
    }
    await this.checkSchoolAccess(userId, schoolId);

    return this.prisma.document.findMany({
      where: { school_id: schoolId, status: 'active' },
      include: { user: true },
      skip: offset,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
  }

  private async checkSchoolAccess(userId: string, schoolId: string, allowedRoles: string[] = []) {
    if (!schoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new BadRequestException('Invalid school_id: Must be a valid UUID');
    }
    console.log('Checking school access for user:', userId, 'school:', schoolId);
    const schoolUser = await this.prisma.schoolUser.findUnique({
      where: { user_id_school_id: { user_id: userId, school_id: schoolId } },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (['super_admin', 'system_admin'].includes(user.role)) return;

    if (!schoolUser || schoolUser.status !== 'active') {
      throw new ForbiddenException('No access to this school');
    }

    if (allowedRoles.length && !allowedRoles.includes(schoolUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}