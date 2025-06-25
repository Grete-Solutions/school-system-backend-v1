import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTermDto, UpdateTermDto, GetTermsQueryDto, TermResponseDto } from './dto/terms.dto';
import { PaginationUtil } from '../common/utils/pagination.util';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class TermsService {
  constructor(private prisma: PrismaService) {}

  private transformToResponseDto(term: any): TermResponseDto {
    return {
      id: term.id,
      academic_year_id: term.academic_year_id,
      name: term.name,
      start_date: term.start_date.toISOString(),
      end_date: term.end_date.toISOString(),
      is_current: term.is_current,
      status: term.status,
      description: term.description,
      created_at: term.created_at.toISOString(),
      updated_at: term.updated_at.toISOString(),
      academicYear: term.academicYear ? {
        id: term.academicYear.id,
        name: term.academicYear.name,
        school_id: term.academicYear.school_id,
      } : undefined,
    };
  }

  async create(academicYearId: string, dto: CreateTermDto): Promise<TermResponseDto> {
    // Verify academic year exists
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    // Validate that end_date is after start_date
    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);
    
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate that term dates are within academic year dates
    if (startDate < academicYear.start_date || endDate > academicYear.end_date) {
      throw new BadRequestException('Term dates must be within the academic year period');
    }

    // If this is being set as current, unset other current terms for this academic year
    if (dto.is_current) {
      await this.prisma.term.updateMany({
        where: { academic_year_id: academicYearId, is_current: true },
        data: { is_current: false },
      });
    }

    // Check if term name already exists for this academic year
    const existingTerm = await this.prisma.term.findFirst({
      where: { academic_year_id: academicYearId, name: dto.name },
    });

    if (existingTerm) {
      throw new BadRequestException('Term with this name already exists for this academic year');
    }

    try {
      const term = await this.prisma.term.create({
        data: {
          ...dto,
          academic_year_id: academicYearId,
          start_date: startDate,
          end_date: endDate,
        },
        include: {
          academicYear: {
            select: {
              id: true,
              name: true,
              school_id: true,
            },
          },
        },
      });

      return this.transformToResponseDto(term);
    } catch (error) {
      throw new BadRequestException('Failed to create term');
    }
  }

  async findAll(academicYearId: string, query: GetTermsQueryDto): Promise<PaginatedResponse<TermResponseDto>> {
    // Verify academic year exists
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const { page, limit } = PaginationUtil.validatePaginationParams(query.page, query.limit);
    const { skip, take } = PaginationUtil.getPaginationParams(page, limit);

    // Build where clause
    const where: any = { academic_year_id: academicYearId };
    
    if (query.status) {
      where.status = query.status;
    }
    
    if (query.is_current !== undefined) {
      where.is_current = query.is_current;
    }

    // Build order by clause
    const orderBy = PaginationUtil.getSortParams(query.sortBy, query.sortOrder);

    const [terms, totalRecords] = await Promise.all([
      this.prisma.term.findMany({
        where,
        skip,
        take,
        orderBy: Object.keys(orderBy).length > 0 ? orderBy : { created_at: 'desc' },
        include: {
          academicYear: {
            select: {
              id: true,
              name: true,
              school_id: true,
            },
          },
        },
      }),
      this.prisma.term.count({ where }),
    ]);

    const pagination = {
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
      recordsPerPage: limit,
      hasNextPage: page * limit < totalRecords,
      hasPreviousPage: page > 1,
    };

    return {
      data: terms.map(term => this.transformToResponseDto(term)),
      pagination,
    };
  }

  async findOne(id: string): Promise<TermResponseDto> {
    const term = await this.prisma.term.findUnique({
      where: { id },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            school_id: true,
          },
        },
      },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    return this.transformToResponseDto(term);
  }

  async update(id: string, dto: UpdateTermDto): Promise<TermResponseDto> {
    const existingTerm = await this.prisma.term.findUnique({
      where: { id },
      include: {
        academicYear: true,
      },
    });

    if (!existingTerm) {
      throw new NotFoundException('Term not found');
    }

    // Validate dates if provided
    if (dto.start_date || dto.end_date) {
      const startDate = dto.start_date ? new Date(dto.start_date) : existingTerm.start_date;
      const endDate = dto.end_date ? new Date(dto.end_date) : existingTerm.end_date;
      
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }

      // Validate that term dates are within academic year dates
      if (startDate < existingTerm.academicYear.start_date || endDate > existingTerm.academicYear.end_date) {
        throw new BadRequestException('Term dates must be within the academic year period');
      }
    }

    // If this is being set as current, unset other current terms for this academic year
    if (dto.is_current) {
      await this.prisma.term.updateMany({
        where: { 
          academic_year_id: existingTerm.academic_year_id, 
          is_current: true,
          id: { not: id }
        },
        data: { is_current: false },
      });
    }

    // Check if term name already exists for this academic year (excluding current record)
    if (dto.name) {
      const existingName = await this.prisma.term.findFirst({
        where: { 
          academic_year_id: existingTerm.academic_year_id, 
          name: dto.name,
          id: { not: id }
        },
      });

      if (existingName) {
        throw new BadRequestException('Term with this name already exists for this academic year');
      }
    }

    try {
      const updateData: any = { ...dto };
      
      if (dto.start_date) {
        updateData.start_date = new Date(dto.start_date);
      }
      
      if (dto.end_date) {
        updateData.end_date = new Date(dto.end_date);
      }

      const term = await this.prisma.term.update({
        where: { id },
        data: updateData,
        include: {
          academicYear: {
            select: {
              id: true,
              name: true,
              school_id: true,
            },
          },
        },
      });

      return this.transformToResponseDto(term);
    } catch (error) {
      throw new BadRequestException('Failed to update term');
    }
  }

  async remove(id: string) {
    const term = await this.prisma.term.findUnique({
      where: { id },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    try {
      await this.prisma.term.delete({
        where: { id },
      });

      return { message: 'Term deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete term');
    }
  }

  async setCurrent(id: string): Promise<TermResponseDto> {
    const term = await this.prisma.term.findUnique({
      where: { id },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Unset current status for other terms in the same academic year
    await this.prisma.term.updateMany({
      where: { 
        academic_year_id: term.academic_year_id, 
        is_current: true,
        id: { not: id }
      },
      data: { is_current: false },
    });

    // Set current status for this term
    const updatedTerm = await this.prisma.term.update({
      where: { id },
      data: { is_current: true },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            school_id: true,
          },
        },
      },
    });

    return this.transformToResponseDto(updatedTerm);
  }
}