import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ConflictException,
  Logger 
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateDocumentPricingDto } from './dto/create-document-pricing.dto';
import { UpdateDocumentPricingDto } from './dto/update-document-pricing.dto';
import { DocumentPricingQueryDto } from './dto/document-pricing-query.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { DocumentPricingResponseDto } from './dto/document-pricing-response.dto';

@Injectable()
export class DocumentPricingService {
  private readonly logger = new Logger(DocumentPricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateDocumentPricingDto, 
    userId: string
  ): Promise<DocumentPricingResponseDto> {
    try {
      // Validate school exists if school_id is provided
      if (createDto.school_id) {
        const school = await this.prisma.school.findUnique({
          where: { id: createDto.school_id }
        });
        if (!school) {
          throw new NotFoundException('School not found');
        }
      }

      // Check for existing active pricing for the same document type and school
      const existingPricing = await this.prisma.documentPricing.findFirst({
        where: {
          school_id: createDto.school_id || null,
          document_type: createDto.document_type,
          is_active: true,
          OR: [
            { expiry_date: null },
            { expiry_date: { gte: new Date() } }
          ]
        }
      });

      if (existingPricing) {
        throw new ConflictException(
          `Active pricing already exists for document type '${createDto.document_type}' ${
            createDto.school_id ? 'for this school' : 'globally'
          }`
        );
      }

      // Validate dates
      const effectiveDate = createDto.effective_date ? new Date(createDto.effective_date) : new Date();
      const expiryDate = createDto.expiry_date ? new Date(createDto.expiry_date) : null;

      if (expiryDate && expiryDate <= effectiveDate) {
        throw new BadRequestException('Expiry date must be after effective date');
      }

      const documentPricing = await this.prisma.documentPricing.create({
        data: {
          ...createDto,
          effective_date: effectiveDate,
          expiry_date: expiryDate,
          created_by: userId,
        },
        include: {
          school: {
            select: {
              id: true,
              name: true,
            }
          },
          creator: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            }
          }
        }
      });

      this.logger.log(`Document pricing created: ${documentPricing.id}`);
      return this.mapToResponseDto(documentPricing);
    } catch (error) {
      this.logger.error('Error creating document pricing:', error);
      throw error;
    }
  }

  async findAll(query: DocumentPricingQueryDto): Promise<PaginatedResponse<DocumentPricingResponseDto>> {
    try {
      const { page, limit } = PaginationUtil.validatePaginationParams(query.page, query.limit);
      const { skip, take } = PaginationUtil.getPaginationParams(page, limit);

      // Build where clause
      const where: any = {};

      if (query.document_type) {
        where.document_type = {
          contains: query.document_type,
          mode: 'insensitive'
        };
      }

      if (query.currency) {
        where.currency = query.currency;
      }

      if (query.is_active !== undefined) {
        where.is_active = query.is_active;
      }

      if (query.school_id) {
        where.school_id = query.school_id;
      }

      if (query.search) {
        where.OR = [
          {
            document_type: {
              contains: query.search,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query.search,
              mode: 'insensitive'
            }
          }
        ];
      }

      // Build order by clause
      const orderBy: any = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'desc';
      } else {
        orderBy.created_at = 'desc';
      }

      const [documentPricings, totalRecords] = await Promise.all([
        this.prisma.documentPricing.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            school: {
              select: {
                id: true,
                name: true,
              }
            },
            creator: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              }
            }
          }
        }),
        this.prisma.documentPricing.count({ where })
      ]);

      const pagination = {
        ...PaginationUtil.calculatePagination(totalRecords, page, limit),
        hasNextPage: page * limit < totalRecords,
        hasPreviousPage: page > 1,
      };

      return {
        data: documentPricings.map(pricing => this.mapToResponseDto(pricing)),
        pagination
      };
    } catch (error) {
      this.logger.error('Error fetching document pricings:', error);
      throw error;
    }
  }

  async findGlobalPricing(query: DocumentPricingQueryDto): Promise<PaginatedResponse<DocumentPricingResponseDto>> {
    // Add school_id: null to query to get only global pricing
    const globalQuery = { ...query, school_id: undefined };
    const where = { school_id: null };

    return this.findWithCustomWhere(globalQuery, where);
  }

  async findSchoolPricing(
    schoolId: string, 
    query: DocumentPricingQueryDto
  ): Promise<PaginatedResponse<DocumentPricingResponseDto>> {
    // Verify school exists
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const schoolQuery = { ...query, school_id: schoolId };
    const where = { school_id: schoolId };

    return this.findWithCustomWhere(schoolQuery, where);
  }

  private async findWithCustomWhere(
    query: DocumentPricingQueryDto, 
    baseWhere: any
  ): Promise<PaginatedResponse<DocumentPricingResponseDto>> {
    try {
      const { page, limit } = PaginationUtil.validatePaginationParams(query.page, query.limit);
      const { skip, take } = PaginationUtil.getPaginationParams(page, limit);

      const where = { ...baseWhere };

      if (query.document_type) {
        where.document_type = {
          contains: query.document_type,
          mode: 'insensitive'
        };
      }

      if (query.currency) {
        where.currency = query.currency;
      }

      if (query.is_active !== undefined) {
        where.is_active = query.is_active;
      }

      if (query.search) {
        where.OR = [
          {
            document_type: {
              contains: query.search,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query.search,
              mode: 'insensitive'
            }
          }
        ];
      }

      const orderBy: any = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'desc';
      } else {
        orderBy.created_at = 'desc';
      }

      const [documentPricings, totalRecords] = await Promise.all([
        this.prisma.documentPricing.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            school: {
              select: {
                id: true,
                name: true,
              }
            },
            creator: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              }
            }
          }
        }),
        this.prisma.documentPricing.count({ where })
      ]);

      const pagination = {
        ...PaginationUtil.calculatePagination(totalRecords, page, limit),
        hasNextPage: page * limit < totalRecords,
        hasPreviousPage: page > 1,
      };

      return {
        data: documentPricings.map(pricing => this.mapToResponseDto(pricing)),
        pagination
      };
    } catch (error) {
      this.logger.error('Error fetching document pricings with custom where:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<DocumentPricingResponseDto> {
    try {
      const documentPricing = await this.prisma.documentPricing.findUnique({
        where: { id },
        include: {
          school: {
            select: {
              id: true,
              name: true,
            }
          },
          creator: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            }
          }
        }
      });

      if (!documentPricing) {
        throw new NotFoundException('Document pricing not found');
      }

      return this.mapToResponseDto(documentPricing);
    } catch (error) {
      this.logger.error(`Error fetching document pricing ${id}:`, error);
      throw error;
    }
  }

  async update(
    id: string, 
    updateDto: UpdateDocumentPricingDto, 
    userId: string
  ): Promise<DocumentPricingResponseDto> {
    try {
      const existingPricing = await this.prisma.documentPricing.findUnique({
        where: { id }
      });

      if (!existingPricing) {
        throw new NotFoundException('Document pricing not found');
      }

      // Validate school exists if school_id is being updated
      if (updateDto.school_id) {
        const school = await this.prisma.school.findUnique({
          where: { id: updateDto.school_id }
        });
        if (!school) {
          throw new NotFoundException('School not found');
        }
      }

      // Validate dates if being updated
      let effectiveDate: Date | undefined;
      let expiryDate: Date | null | undefined;

      if (updateDto.effective_date) {
        effectiveDate = new Date(updateDto.effective_date);
      }

      if (updateDto.expiry_date !== undefined) {
        expiryDate = updateDto.expiry_date ? new Date(updateDto.expiry_date) : null;
      }

      if (effectiveDate && expiryDate && expiryDate <= effectiveDate) {
        throw new BadRequestException('Expiry date must be after effective date');
      }

      // Check for conflicts if document_type or school_id is being changed
      if (updateDto.document_type || updateDto.school_id !== undefined) {
        const conflictWhere: any = {
          id: { not: id },
          document_type: updateDto.document_type || existingPricing.document_type,
          school_id: updateDto.school_id !== undefined ? updateDto.school_id : existingPricing.school_id,
          is_active: true,
          OR: [
            { expiry_date: null },
            { expiry_date: { gte: new Date() } }
          ]
        };

        const conflictingPricing = await this.prisma.documentPricing.findFirst({
          where: conflictWhere
        });

        if (conflictingPricing) {
          throw new ConflictException(
            `Active pricing already exists for document type '${updateDto.document_type || existingPricing.document_type}' ${
              (updateDto.school_id !== undefined ? updateDto.school_id : existingPricing.school_id) 
                ? 'for this school' : 'globally'
            }`
          );
        }
      }

      const updateData: any = { ...updateDto };
      if (effectiveDate) updateData.effective_date = effectiveDate;
      if (expiryDate !== undefined) updateData.expiry_date = expiryDate;

      const updatedPricing = await this.prisma.documentPricing.update({
        where: { id },
        data: updateData,
        include: {
          school: {
            select: {
              id: true,
              name: true,
            }
          },
          creator: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            }
          }
        }
      });

      this.logger.log(`Document pricing updated: ${id}`);
      return this.mapToResponseDto(updatedPricing);
    } catch (error) {
      this.logger.error(`Error updating document pricing ${id}:`, error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const existingPricing = await this.prisma.documentPricing.findUnique({
        where: { id }
      });

      if (!existingPricing) {
        throw new NotFoundException('Document pricing not found');
      }

      await this.prisma.documentPricing.delete({
        where: { id }
      });

      this.logger.log(`Document pricing deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting document pricing ${id}:`, error);
      throw error;
    }
  }

  private mapToResponseDto(pricing: any): DocumentPricingResponseDto {
    return {
      id: pricing.id,
      school_id: pricing.school_id,
      document_type: pricing.document_type,
      price_amount: pricing.price_amount,
      currency: pricing.currency,
      is_active: pricing.is_active,
      effective_date: pricing.effective_date.toISOString(),
      expiry_date: pricing.expiry_date?.toISOString(),
      description: pricing.description,
      created_by: pricing.created_by,
      created_at: pricing.created_at.toISOString(),
      updated_at: pricing.updated_at.toISOString(),
      school: pricing.school ? {
        id: pricing.school.id,
        name: pricing.school.name,
      } : undefined,
      creator: pricing.creator ? {
        id: pricing.creator.id,
        first_name: pricing.creator.first_name,
        last_name: pricing.creator.last_name,
        email: pricing.creator.email,
      } : undefined,
    };
  }
}