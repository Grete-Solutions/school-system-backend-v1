import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateProgramDto, UpdateProgramDto, GetProgramsQueryDto, ProgramResponseDto } from './dto/programs.dto';
import { PaginationUtil } from '../common/utils/pagination.util';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  private transformToResponseDto(program: any): ProgramResponseDto {
    return {
      id: program.id,
      school_id: program.school_id,
      name: program.name,
      description: program.description,
      code: program.code,
      duration: program.duration,
      status: program.status,
      created_at: program.created_at.toISOString(),
      updated_at: program.updated_at.toISOString(),
      school: program.school ? {
        id: program.school.id,
        name: program.school.name,
      } : undefined,
    };
  }

  async create(schoolId: string, dto: CreateProgramDto): Promise<ProgramResponseDto> {
    // Verify school exists
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Check if program name already exists for this school
    const existingName = await this.prisma.program.findFirst({
      where: { 
        school_id: schoolId, 
        name: dto.name 
      },
    });

    if (existingName) {
      throw new BadRequestException('Program with this name already exists for this school');
    }

    // Check if program code already exists for this school (if code is provided)
    if (dto.code) {
      const existingCode = await this.prisma.program.findFirst({
        where: { 
          school_id: schoolId, 
          code: dto.code 
        },
      });

      if (existingCode) {
        throw new BadRequestException('Program with this code already exists for this school');
      }
    }

    try {
      const program = await this.prisma.program.create({
        data: {
          ...dto,
          school_id: schoolId,
        },
        include: {
          school: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return this.transformToResponseDto(program);
    } catch (error) {
      throw new BadRequestException('Failed to create program');
    }
  }

  async findAll(schoolId: string, query: GetProgramsQueryDto): Promise<PaginatedResponse<ProgramResponseDto>> {
    // Verify school exists
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const { page, limit } = PaginationUtil.validatePaginationParams(query.page, query.limit);
    const { skip, take } = PaginationUtil.getPaginationParams(page, limit);

    // Build where clause
    const where: any = { school_id: schoolId };
    
    if (query.status) {
      where.status = query.status;
    }
    
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Build order by clause
    const orderBy = PaginationUtil.getSortParams(query.sortBy, query.sortOrder);

    const [programs, totalRecords] = await Promise.all([
      this.prisma.program.findMany({
        where,
        skip,
        take,
        orderBy: Object.keys(orderBy).length > 0 ? orderBy : { created_at: 'desc' },
        include: {
          school: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.program.count({ where }),
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
      data: programs.map(program => this.transformToResponseDto(program)),
      pagination,
    };
  }

  async findOne(id: string): Promise<ProgramResponseDto> {
    const program = await this.prisma.program.findUnique({
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

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return this.transformToResponseDto(program);
  }

  async update(id: string, dto: UpdateProgramDto): Promise<ProgramResponseDto> {
    const existingProgram = await this.prisma.program.findUnique({
      where: { id },
    });

    if (!existingProgram) {
      throw new NotFoundException('Program not found');
    }

    // Check if program name already exists for this school (excluding current record)
    if (dto.name) {
      const existingName = await this.prisma.program.findFirst({
        where: { 
          school_id: existingProgram.school_id, 
          name: dto.name,
          id: { not: id }
        },
      });

      if (existingName) {
        throw new BadRequestException('Program with this name already exists for this school');
      }
    }

    // Check if program code already exists for this school (excluding current record)
    if (dto.code) {
      const existingCode = await this.prisma.program.findFirst({
        where: { 
          school_id: existingProgram.school_id, 
          code: dto.code,
          id: { not: id }
        },
      });

      if (existingCode) {
        throw new BadRequestException('Program with this code already exists for this school');
      }
    }

    try {
      const program = await this.prisma.program.update({
        where: { id },
        data: dto,
        include: {
          school: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return this.transformToResponseDto(program);
    } catch (error) {
      throw new BadRequestException('Failed to update program');
    }
  }

  async remove(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    try {
      await this.prisma.program.delete({
        where: { id },
      });

      return { message: 'Program deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete program');
    }
  }
}