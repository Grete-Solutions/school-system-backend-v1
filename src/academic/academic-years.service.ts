import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateAcademicYearDto, UpdateAcademicYearDto, GetAcademicYearsQueryDto } from './dto/academic-years.dto';
import { PaginationUtil } from '../common/utils/pagination.util';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, dto: CreateAcademicYearDto) {
    // Validate that end_date is after start_date
    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);
    
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // If this is being set as current, unset other current academic years for this school
    if (dto.is_current) {
      await this.prisma.academicYear.updateMany({
        where: { school_id: schoolId, is_current: true },
        data: { is_current: false },
      });
    }

    // Check if academic year name already exists for this school
    const existingAcademicYear = await this.prisma.academicYear.findFirst({
      where: { school_id: schoolId, name: dto.name },
    });

    if (existingAcademicYear) {
      throw new BadRequestException('Academic year with this name already exists for this school');
    }

    try {
      const academicYear = await this.prisma.academicYear.create({
        data: {
          ...dto,
          school_id: schoolId,
          start_date: startDate,
          end_date: endDate,
        },
      });

      return academicYear;
    } catch (error) {
      throw new BadRequestException('Failed to create academic year');
    }
  }

  async findAll(schoolId: string, query: GetAcademicYearsQueryDto): Promise<PaginatedResponse<any>> {
    const { page, limit } = PaginationUtil.validatePaginationParams(query.page, query.limit);
    const { skip, take } = PaginationUtil.getPaginationParams(page, limit);

    // Build where clause
    const where: any = { school_id: schoolId };
    
    if (query.status) {
      where.status = query.status;
    }
    
    if (query.is_current !== undefined) {
      where.is_current = query.is_current;
    }

    // Build order by clause
    const orderBy = PaginationUtil.getSortParams(query.sortBy, query.sortOrder);

    const [academicYears, totalRecords] = await Promise.all([
      this.prisma.academicYear.findMany({
        where,
        skip,
        take,
        orderBy: Object.keys(orderBy).length > 0 ? orderBy : { created_at: 'desc' },
      }),
      this.prisma.academicYear.count({ where }),
    ]);

    const pagination = {
      ...PaginationUtil.calculatePagination(totalRecords, page, limit),
      hasNextPage: page * limit < totalRecords,
      hasPreviousPage: page > 1,
    };

    return {
      data: academicYears,
      pagination,
    };
  }

  async findOne(id: string) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    return academicYear;
  }

  async update(id: string, dto: UpdateAcademicYearDto) {
    const existingAcademicYear = await this.findOne(id);

    // Validate dates if provided
    if (dto.start_date || dto.end_date) {
      const startDate = dto.start_date ? new Date(dto.start_date) : new Date(existingAcademicYear.start_date);
      const endDate = dto.end_date ? new Date(dto.end_date) : new Date(existingAcademicYear.end_date);
      
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // If this is being set as current, unset other current academic years for this school
    if (dto.is_current) {
      await this.prisma.academicYear.updateMany({
        where: { 
          school_id: existingAcademicYear.school_id, 
          is_current: true,
          id: { not: id }
        },
        data: { is_current: false },
      });
    }

    // Check if academic year name already exists for this school (excluding current record)
    if (dto.name) {
      const existingName = await this.prisma.academicYear.findFirst({
        where: { 
          school_id: existingAcademicYear.school_id, 
          name: dto.name,
          id: { not: id }
        },
      });

      if (existingName) {
        throw new BadRequestException('Academic year with this name already exists for this school');
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

      const academicYear = await this.prisma.academicYear.update({
        where: { id },
        data: updateData,
      });

      return academicYear;
    } catch (error) {
      throw new BadRequestException('Failed to update academic year');
    }
  }

  async remove(id: string) {
    const academicYear = await this.findOne(id);

    try {
      await this.prisma.academicYear.delete({
        where: { id },
      });

      return { message: 'Academic year deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete academic year');
    }
  }

  async setCurrent(id: string) {
    const academicYear = await this.findOne(id);

    // Unset current status for other academic years in the same school
    await this.prisma.academicYear.updateMany({
      where: { 
        school_id: academicYear.school_id, 
        is_current: true,
        id: { not: id }
      },
      data: { is_current: false },
    });

    // Set current status for this academic year
    const updatedAcademicYear = await this.prisma.academicYear.update({
      where: { id },
      data: { is_current: true },
    });

    return updatedAcademicYear;
  }

  async getCurrentAcademicYear(schoolId: string) {
    const currentAcademicYear = await this.prisma.academicYear.findFirst({
      where: { 
        school_id: schoolId, 
        is_current: true 
      },
    });

    if (!currentAcademicYear) {
      throw new NotFoundException('No current academic year found for this school');
    }

    return currentAcademicYear;
  }
}