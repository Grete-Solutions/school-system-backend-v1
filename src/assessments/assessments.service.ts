import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentQueryDto } from './dto/assessment-query.dto';
import { BulkCreateAssessmentDto } from './dto/bulk-create-assessment.dto';
import { Prisma } from '@prisma/client';
import { PaginationUtil } from '../common/utils/pagination.util';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentAssessments(studentId: string, query: AssessmentQueryDto, user: any) {
    // Verify student exists and user has access
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await this.verifySchoolAccess(student.school_id, user);

    // If user is a student, they can only see their own assessments
    if (user.role === 'student' && user.id !== student.user_id) {
      throw new ForbiddenException('Access denied');
    }

    const {
      page = 1,
      limit = 10,
      type,
      status = 'published',
      class_id,
      course_id,
      term_id,
      due_date_from,
      due_date_to,
      search,
      sortBy = 'due_date',
      sortOrder = 'asc',
    } = query;

    const { skip, take } = PaginationUtil.getPaginationParams(page, limit);

    // Get student's classes to filter assessments
    const studentClasses = await this.prisma.classStudent.findMany({
      where: { student_id: studentId },
      select: { class_id: true },
    });

    const classIds = studentClasses.map(sc => sc.class_id);

    const where: Prisma.AssessmentWhereInput = {
      school_id: student.school_id,
      status,
      ...(type && { type }),
      ...(class_id ? { class_id } : { 
        OR: [
          { class_id: { in: classIds } },
          { class_id: null }, // Include school-wide assessments
        ]
      }),
      ...(course_id && { course_id }),
      ...(term_id && { term_id }),
      ...(due_date_from && { due_date: { gte: new Date(due_date_from) } }),
      ...(due_date_to && { due_date: { lte: new Date(due_date_to) } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const [assessments, totalRecords] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          term: {
            select: {
              id: true,
              name: true,
            },
          },
          grades: {
            where: { student_id: studentId },
            select: {
              id: true,
              points_earned: true,
              points_possible: true,
              percentage: true,
              letter_grade: true,
              status: true,
              graded_at: true,
            },
          },
          submissions: {
            where: { student_id: studentId },
            select: {
              id: true,
              submitted_at: true,
              status: true,
              attempt_number: true,
            },
          },
        },
      }),
      this.prisma.assessment.count({ where }),
    ]);

    const pagination = PaginationUtil.calculatePagination(totalRecords, page, limit);

    return {
      data: assessments.map(assessment => ({
        ...assessment,
        student_grade: assessment.grades[0] || null,
        student_submission: assessment.submissions[0] || null,
        grades: undefined, // Remove grades array from response
        submissions: undefined, // Remove submissions array from response
      })),
      pagination: {
        ...pagination,
        hasNextPage: page < pagination.totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getClassAssessments(classId: string, query: AssessmentQueryDto, user: any) {
    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { school: true },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    await this.verifySchoolAccess(classEntity.school_id, user);

    const {
      page = 1,
      limit = 10,
      type,
      status = 'published',
      course_id,
      term_id,
      teacher_id,
      due_date_from,
      due_date_to,
      search,
      sortBy = 'due_date',
      sortOrder = 'asc',
    } = query;

    const { skip, take } = PaginationUtil.getPaginationParams(page, limit);

    const where: Prisma.AssessmentWhereInput = {
      class_id: classId,
      status,
      ...(type && { type }),
      ...(course_id && { course_id }),
      ...(term_id && { term_id }),
      ...(teacher_id && { teacher_id }),
      ...(due_date_from && { due_date: { gte: new Date(due_date_from) } }),
      ...(due_date_to && { due_date: { lte: new Date(due_date_to) } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const [assessments, totalRecords] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          term: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              grades: true,
              submissions: true,
            },
          },
        },
      }),
      this.prisma.assessment.count({ where }),
    ]);

    const pagination = PaginationUtil.calculatePagination(totalRecords, page, limit);

    return {
      data: assessments,
      pagination: {
        ...pagination,
        hasNextPage: page < pagination.totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async createAssessment(createAssessmentDto: CreateAssessmentDto, user: any) {
    const { class_id, course_id, term_id } = createAssessmentDto;

    // Validate class if provided
    let schoolId: string;
    if (class_id) {
      const classEntity = await this.prisma.class.findUnique({
        where: { id: class_id },
        include: { school: true },
      });

      if (!classEntity) {
        throw new NotFoundException('Class not found');
      }

      schoolId = classEntity.school_id;
    } else if (course_id) {
      // If no class but course is provided, get school from course
      const course = await this.prisma.course.findUnique({
        where: { id: course_id },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      schoolId = course.school_id;
    } else {
      throw new BadRequestException('Either class_id or course_id must be provided');
    }

    await this.verifySchoolAccess(schoolId, user);

    // Validate course if provided
    if (course_id) {
      const course = await this.prisma.course.findUnique({
        where: { id: course_id },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }
    }

    // Validate term if provided
    if (term_id) {
      const term = await this.prisma.term.findUnique({
        where: { id: term_id },
      });

      if (!term) {
        throw new NotFoundException('Term not found');
      }
    }

    // Get teacher record
    const teacher = await this.prisma.teacher.findUnique({
      where: { user_id: user.id },
    });

    if (!teacher && !['admin', 'school_admin'].includes(user.role)) {
      throw new ForbiddenException('Only teachers can create assessments');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        ...createAssessmentDto,
        school_id: schoolId,
        teacher_id: teacher?.id || null,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        term: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return assessment;
  }

  async getAssessment(id: string, user: any) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        term: {
          select: {
            id: true,
            name: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            grades: true,
            submissions: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    await this.verifySchoolAccess(assessment.school_id, user);

    // If user is a student, check if they have access to this assessment
    if (user.role === 'student') {
      const student = await this.prisma.student.findUnique({
        where: { user_id: user.id },
      });

      if (student && assessment.class_id) {
        const classStudent = await this.prisma.classStudent.findUnique({
          where: {
            class_id_student_id: {
              class_id: assessment.class_id,
              student_id: student.id,
            },
          },
        });

        if (!classStudent) {
          throw new ForbiddenException('Access denied to this assessment');
        }
      }
    }

    return assessment;
  }

  async updateAssessment(id: string, updateAssessmentDto: UpdateAssessmentDto, user: any) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: { school: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    await this.verifySchoolAccess(assessment.school_id, user);

    // Validate new class if provided
    if (updateAssessmentDto.class_id) {
      const classEntity = await this.prisma.class.findUnique