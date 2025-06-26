import { 
  Injectable, 
  ForbiddenException, 
  NotFoundException, 
  BadRequestException, 
  InternalServerErrorException 
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PaginationQueryDto, PaginatedResponse, PaginationMeta } from './dto/pagination-query.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly auditLogsService: AuditLogsService,
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

      await this.auditLogsService.createLog(
        userId,
        'DOCUMENT_UPLOADED',
        'Document',
        document.id,
        { title: dto.title, school_id: dto.school_id, file_type: file.mimetype },
      );

      return document;
    } catch (error) {
      console.error('Upload failed:', error.message, error.stack);
      throw new InternalServerErrorException(`Failed to create document: ${error.message}`);
    }
  }

  async getStudentDocuments(
    userId: string,
    studentId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    // Validate student exists and user has access
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true, school: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if user has access to this student's school
    await this.checkSchoolAccess(userId, student.school_id);

    // Additional access control: only allow access to own documents unless admin
    const requestingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = ['super_admin', 'system_admin', 'school_admin'].includes(requestingUser?.role || '');
    
    if (!isAdmin && student.user_id !== userId) {
      throw new ForbiddenException('You can only access your own documents');
    }

    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', search, status, fileType } = paginationQuery;
    
    // Build where clause
    const whereClause: Prisma.DocumentWhereInput = {
      user_id: student.user_id,
      school_id: student.school_id,
      ...(status && { status }),
      ...(fileType && { file_type: { contains: fileType, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Get total count
    const totalRecords = await this.prisma.document.count({ where: whereClause });

    // Get documents
    const documents = await this.prisma.document.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        school: {
          select: { id: true, name: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const pagination = this.buildPaginationMeta(totalRecords, page, limit);

    await this.auditLogsService.createLog(
      userId,
      'STUDENT_DOCUMENTS_LISTED',
      'Document',
      undefined,
      { student_id: studentId, school_id: student.school_id, ...paginationQuery },
    );

    return { data: documents, pagination };
  }

  async getSchoolDocuments(
    userId: string,
    schoolId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    if (!schoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new BadRequestException('Invalid school_id: Must be a UUID');
    }

    await this.checkSchoolAccess(userId, schoolId);

    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', search, status, fileType } = paginationQuery;
    
    // Build where clause
    const whereClause: Prisma.DocumentWhereInput = {
      school_id: schoolId,
      ...(status && { status }),
      ...(fileType && { file_type: { contains: fileType, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Get total count
    const totalRecords = await this.prisma.document.count({ where: whereClause });

    // Get documents
    const documents = await this.prisma.document.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        school: {
          select: { id: true, name: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const pagination = this.buildPaginationMeta(totalRecords, page, limit);

    await this.auditLogsService.createLog(
      userId,
      'SCHOOL_DOCUMENTS_LISTED',
      'Document',
      undefined,
      { school_id: schoolId, ...paginationQuery },
    );

    return { data: documents, pagination };
  }

  async getDocumentById(id: string, userId: string) {
    if (!id) throw new BadRequestException('Invalid document ID');
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { 
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        school: {
          select: { id: true, name: true },
        },
      },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.checkSchoolAccess(userId, document.school_id);

    await this.auditLogsService.createLog(
      userId,
      'DOCUMENT_VIEWED',
      'Document',
      id,
      { title: document.title, school_id: document.school_id },
    );

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
        updated_at: new Date(),
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        school: {
          select: { id: true, name: true },
        },
      },
    });

    await this.auditLogsService.createLog(
      userId,
      'DOCUMENT_UPDATED',
      'Document',
      id,
      { title: dto.title, school_id: document.school_id, changes: dto },
    );

    return updatedDocument;
  }

  async deleteDocument(id: string, userId: string) {
    if (!id) throw new BadRequestException('Invalid document ID');
    const document = await this.prisma.document.findUnique({
      where: { id },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.checkSchoolAccess(userId, document.school_id, ['school_admin', 'super_admin', 'system_admin']);

    // Delete file from Supabase Storage
    const filePath = document.file_url.split('/documents/')[1];
    const { error: deleteError } = await this.supabase.storage.from('documents').remove([filePath]);
    if (deleteError) console.warn('Failed to delete file from storage:', deleteError.message);

    await this.prisma.document.delete({ where: { id } });

    await this.auditLogsService.createLog(
      userId,
      'DOCUMENT_DELETED',
      'Document',
      id,
      { title: document.title, school_id: document.school_id },
    );

    return { message: 'Document deleted successfully' };
  }

  async publishDocument(id: string, userId: string) {
    if (!id) throw new BadRequestException('Invalid document ID');
    const document = await this.prisma.document.findUnique({
      where: { id },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.checkSchoolAccess(userId, document.school_id, ['school_admin', 'super_admin', 'system_admin']);

    const publishedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        status: 'published',
        updated_at: new Date(),
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        school: {
          select: { id: true, name: true },
        },
      },
    });

    await this.auditLogsService.createLog(
      userId,
      'DOCUMENT_PUBLISHED',
      'Document',
      id,
      { title: document.title, school_id: document.school_id },
    );

    return publishedDocument;
  }

  // Legacy method for backward compatibility
  async getAllDocuments(userId: string, schoolId: string, limit: number = 10, offset: number = 0) {
    const page = Math.floor(offset / limit) + 1;
    const paginationQuery: PaginationQueryDto = { page, limit };
    
    const result = await this.getSchoolDocuments(userId, schoolId, paginationQuery);
    return result.data; // Return only data for backward compatibility
  }

  private buildPaginationMeta(totalRecords: number, page: number, limit: number): PaginationMeta {
    const totalPages = Math.ceil(totalRecords / limit);
    
    return {
      totalRecords,
      totalPages,
      currentPage: page,
      recordsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  private async checkSchoolAccess(userId: string, schoolId: string, allowedRoles: string[] = []): Promise<void> {
    if (!schoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new BadRequestException('Invalid school_id: Must be a UUID');
    }
    console.log('Checking school access for user:', userId, 'school:', schoolId);
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Super admin and system admin have access to all schools
    if (['super_admin', 'system_admin'].includes(user.role)) return;

    const schoolUser = await this.prisma.schoolUser.findUnique({
      where: { user_id_school_id: { user_id: userId, school_id: schoolId } },
    });

    if (!schoolUser || schoolUser.status !== 'active') {
      throw new ForbiddenException('No access to this school');
    }

    if (allowedRoles.length && !allowedRoles.includes(schoolUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}