import { Injectable, ForbiddenException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async createDocument(
    userId: string,
    dto: CreateDocumentDto,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    try {
      console.log('Creating document with DTO:', JSON.stringify(dto), 'File:', file.originalname, 'File size:', file.size);
      if (!dto.school_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.school_id)) {
        throw new BadRequestException('Invalid school_id: Must be a valid UUID');
      }
      if (!file || file.size === 0) {
        throw new BadRequestException('Invalid or empty file provided');
      }

      // Verify school and user exist
      const school = await this.prisma.school.findUnique({ where: { id: dto.school_id } });
      if (!school) throw new NotFoundException(`School with ID ${dto.school_id} not found`);
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

      await this.checkSchoolAccess(userId, dto.school_id);
      console.log('School access check passed for user:', userId);

      // Upload file to Supabase Storage
      const fileExtension = file.originalname.split('.').pop() || 'bin';
      const fileName = `${uuidv4()}.${fileExtension}`;
      console.log('Uploading file to Supabase:', fileName, 'Bucket: documents', 'Path: school_' + fileExtension);
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(`school_${dto.school_id}/${fileName}`, file.buffer, {
          contentType: file.mimetype || 'application/octet-stream',
        });

      console.log('Supabase storage upload response:', { uploadData: JSON.stringify(uploadData), uploadError: uploadError?.message });
      if (uploadError) throw new InternalServerErrorException(`Storage upload failed: ${uploadError.message}`);
      if (!uploadData) throw new InternalServerErrorException('Storage upload returned no data');

      // Verify file exists in storage
      const { data: listData, error: listError } = await this.supabase.storage
        .from('documents')
        .list(`school_${dto.school_id}`);
      console.log('Supabase storage list response:', { listData: JSON.stringify(listData), listError: listError?.message });
      if (listError) console.warn('Failed to list storage files:', listError.message);
      if (!listData?.find((item) => item.name === fileName)) {
        throw new InternalServerErrorException(`File ${fileName} not found in storage after upload`);
      }

      // Create document record in Prisma
      const fileUrl = `https://${process.env.SUPABASE_URL}/storage/v1/object/public/documents/school_${dto.school_id}/${fileName}`;
      console.log('Creating document in Prisma with:', {
        school_id: dto.school_id,
        user_id: userId,
        title: dto.title,
        file_url: fileUrl,
      });
      const document = await this.prisma.document.create({
        data: {
          school_id: dto.school_id,
          user_id: userId,
          title: dto.title,
          description: dto.description,
          file_url: fileUrl,
          file_type: file.mimetype || 'application/octet-stream',
          file_size: file.size,
          status: 'active',
        },
      });
      console.log('Document created in database:', document.id);

      return document;
    } catch (error) {
      console.error('Upload failed:', error.message, error.stack);
      throw new InternalServerErrorException(`Failed to create document: ${error.message}`);
    }
  }

  async getDocumentById(id: string, userId: string) {
    if (!id) throw new BadRequestException('Invalid document ID');
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { user: true, school: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.checkSchoolAccess(userId, document.school_id);
    return document;
  }

  async updateDocument(id: string, userId: string, dto: UpdateDocumentDto) {
    if (!id) throw new BadRequestException('Invalid document ID');
    const document = await this.prisma.document.findUnique({
      where: { id },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.checkSchoolAccess(userId, document.school_id, ['school_admin', 'super_admin', 'system_admin']);

    const updatedDocument = await this.prisma.document.update({
      where: { id },
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
      throw new BadRequestException('Invalid school_id: Must be a UUID');
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

  private async checkSchoolAccess(userId: string, schoolId: string, allowedRoles: string[] = []): Promise<void> {
    if (!schoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new BadRequestException('Invalid school_id: Must be a UUID');
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