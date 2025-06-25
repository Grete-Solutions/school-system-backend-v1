import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CreateClassDto,
  UpdateClassDto,
  GetClassesQueryDto,
  GetClassStudentsQueryDto,
  AddStudentToClassDto,
  ClassResponseDto,
  StudentResponseDto,
} from './dto/classes.dto';
import { PaginationUtil } from '../common/utils/pagination.util';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  private transformToClassResponseDto(classEntity: any): ClassResponseDto {
    return {
      id: classEntity.id,
      school_id: classEntity.school_id,
      academic_year_id: classEntity.academic_year_id,
      teacher_id: classEntity.teacher_id,
      name: classEntity.name,
      description: classEntity.description,
      status: classEntity.status,
      created_at: classEntity.created_at.toISOString(),
      updated_at: classEntity.updated_at.toISOString(),
      academicYear: classEntity.academicYear
        ? {
            id: classEntity.academicYear.id,
            name: classEntity.academicYear.name,
            school_id: classEntity.academicYear.school_id,
          }
        : undefined,
      teacher: classEntity.teacher
        ? {
            id: classEntity.teacher.id,
            user_id: classEntity.teacher.user_id,
            teacher_id: classEntity.teacher.teacher_id,
            department: classEntity.teacher.department,
          }
        : undefined,
    };
  }

  private transformToStudentResponseDto(student: any): StudentResponseDto {
    return {
      id: student.id,
      user_id: student.user_id,
      school_id: student.school_id,
      student_id: student.student_id,
      grade_level: student.grade_level,
      enrollment_date: student.enrollment_date?.toISOString(),
      status: student.status,
      created_at: student.created_at.toISOString(),
      updated_at: student.updated_at.toISOString(),
      user: {
        id: student.user.id,
        first_name: student.user.first_name,
        last_name: student.user.last_name,
        email: student.user.email,
      },
    };
  }

  async create(schoolId: string, dto: CreateClassDto): Promise<ClassResponseDto> {
    // Verify school exists
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Verify academic year (use current academic year)
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { school_id: schoolId, is_current: true },
    });
    if (!academicYear) {
      throw new NotFoundException('No current academic year found for this school');
    }

    // Verify teacher if provided
    if (dto.teacher_id) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: dto.teacher_id },
      });
      if (!teacher || teacher.school_id !== schoolId) {
        throw new NotFoundException('Teacher not found or does not belong to this school');
      }
    }

    // Check if class name already exists for this school and academic year
    const existingClass = await this.prisma.class.findFirst({
      where: { school_id: schoolId, academic_year_id: academicYear.id, name: dto.name },
    });
    if (existingClass) {
      throw new BadRequestException('Class with this name already exists for this academic year');
    }

    try {
      const classEntity = await this.prisma.class.create({
        data: {
          ...dto,
          school_id: schoolId,
          academic_year_id: academicYear.id,
        },
        include: {
          academicYear: {
            select: { id: true, name: true, school_id: true },
          },
          teacher: {
            select: { id: true, user_id: true, teacher_id: true, department: true },
          },
        },
      });
      return this.transformToClassResponseDto(classEntity);
    } catch (error) {
      throw new BadRequestException('Failed to create class');
    }
  }

  async findAll(schoolId: string, query: GetClassesQueryDto): Promise<PaginatedResponse<ClassResponseDto>> {
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

    // Build order by clause
    const orderBy = PaginationUtil.getSortParams(query.sortBy, query.sortOrder);

    const [classes, totalRecords] = await Promise.all([
      this.prisma.class.findMany({
        where,
        skip,
        take,
        orderBy: Object.keys(orderBy).length > 0 ? orderBy : { created_at: 'desc' },
        include: {
          academicYear: {
            select: { id: true, name: true, school_id: true },
          },
          teacher: {
            select: { id: true, user_id: true, teacher_id: true, department: true },
          },
        },
      }),
      this.prisma.class.count({ where }),
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
      data: classes.map(classEntity => this.transformToClassResponseDto(classEntity)),
      pagination,
    };
  }

  async findOne(id: string): Promise<ClassResponseDto> {
    const classEntity = await this.prisma.class.findUnique({
      where: { id },
      include: {
        academicYear: {
          select: { id: true, name: true, school_id: true },
        },
        teacher: {
          select: { id: true, user_id: true, teacher_id: true, department: true },
        },
      },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return this.transformToClassResponseDto(classEntity);
  }

  async update(id: string, dto: UpdateClassDto): Promise<ClassResponseDto> {
    const existingClass = await this.prisma.class.findUnique({
      where: { id },
      include: { academicYear: true },
    });
    if (!existingClass) {
      throw new NotFoundException('Class not found');
    }

    // Verify teacher if provided
    if (dto.teacher_id) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: dto.teacher_id },
      });
      if (!teacher || teacher.school_id !== existingClass.school_id) {
        throw new NotFoundException('Teacher not found or does not belong to this school');
      }
    }

    // Check if class name already exists for this school and academic year
    if (dto.name) {
      const existingName = await this.prisma.class.findFirst({
        where: {
          school_id: existingClass.school_id,
          academic_year_id: existingClass.academic_year_id,
          name: dto.name,
          id: { not: id },
        },
      });
      if (existingName) {
        throw new BadRequestException('Class with this name already exists for this academic year');
      }
    }

    try {
      const classEntity = await this.prisma.class.update({
        where: { id },
        data: { ...dto },
        include: {
          academicYear: {
            select: { id: true, name: true, school_id: true },
          },
          teacher: {
            select: { id: true, user_id: true, teacher_id: true, department: true },
          },
        },
      });
      return this.transformToClassResponseDto(classEntity);
    } catch (error) {
      throw new BadRequestException('Failed to update class');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const classEntity = await this.prisma.class.findUnique({
      where: { id },
    });
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    try {
      await this.prisma.class.delete({
        where: { id },
      });
      return { message: 'Class deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete class');
    }
  }

  async getStudents(id: string, query: GetClassStudentsQueryDto): Promise<PaginatedResponse<StudentResponseDto>> {
    // Verify class exists
    const classEntity = await this.prisma.class.findUnique({
      where: { id },
    });
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const { page, limit } = PaginationUtil.validatePaginationParams(query.page, query.limit);
    const { skip, take } = PaginationUtil.getPaginationParams(page, limit);

    // Build order by clause
    const orderBy = PaginationUtil.getSortParams(query.sortBy, query.sortOrder);

    const [students, totalRecords] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          classStudents: {
            some: { class_id: id },
          },
        },
        skip,
        take,
        orderBy: Object.keys(orderBy).length > 0
          ? orderBy
          : { created_at: 'desc' },
        include: {
          user: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      }),
      this.prisma.student.count({
        where: {
          classStudents: {
            some: { class_id: id },
          },
        },
      }),
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
      data: students.map(student => this.transformToStudentResponseDto(student)),
      pagination,
    };
  }

  async addStudent(classId: string, studentId: string): Promise<{ message: string }> {
    // Verify class exists
    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Verify student exists and belongs to the same school
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student || student.school_id !== classEntity.school_id) {
      throw new NotFoundException('Student not found or does not belong to this school');
    }

    // Check if student is already in the class
    const existingEnrollment = await this.prisma.classStudent.findUnique({
      where: { class_id_student_id: { class_id: classId, student_id: studentId } },
    });
    if (existingEnrollment) {
      throw new BadRequestException('Student is already enrolled in this class');
    }

    try {
      await this.prisma.classStudent.create({
        data: {
          class_id: classId,
          student_id: studentId,
        },
      });
      return { message: 'Student added to class successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to add student to class');
    }
  }

  async removeStudent(classId: string, studentId: string): Promise<{ message: string }> {
    // Verify class exists
    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if student is enrolled in the class
    const enrollment = await this.prisma.classStudent.findUnique({
      where: { class_id_student_id: { class_id: classId, student_id: studentId } },
    });
    if (!enrollment) {
      throw new NotFoundException('Student is not enrolled in this class');
    }

    try {
      await this.prisma.classStudent.delete({
        where: { class_id_student_id: { class_id: classId, student_id: studentId } },
      });
      return { message: 'Student removed from class successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to remove student from class');
    }
  }
}