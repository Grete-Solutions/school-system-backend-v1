import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';
import { AssignCourseDto } from './dto/assign-course.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchoolCourses(schoolId: string, query: CourseQueryDto, user: any) {
    // Verify user has access to the school
    await this.verifySchoolAccess(schoolId, user);

    const {
      page = 1,
      limit = 10,
      department,
      grade_level,
      teacher_id,
      status = 'active',
      search,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * Math.min(limit, 100);
    const take = Math.min(limit, 100);

    // Build where clause
    const where: Prisma.CourseWhereInput = {
      school_id: schoolId,
      status,
      ...(department && { department }),
      ...(grade_level && { grade_level }),
      ...(teacher_id && { teacher_id }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Build orderBy clause with proper type safety
    const orderBy: Prisma.CourseOrderByWithRelationInput = this.buildOrderBy(sortBy, sortOrder);

    const [courses, totalRecords] = await Promise.all([
      this.prisma.course.findMany({
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
          school: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              classCourses: true,
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    const totalPages = Math.ceil(totalRecords / take);

    return {
      data: courses,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        recordsPerPage: take,
      },
    };
  }

  async createCourse(schoolId: string, createCourseDto: CreateCourseDto, user: any) {
    // Verify user has access to the school
    await this.verifySchoolAccess(schoolId, user);

    // Check if course code already exists in the school
    if (createCourseDto.code) {
      const existingCourse = await this.prisma.course.findFirst({
        where: {
          school_id: schoolId,
          code: createCourseDto.code,
        },
      });

      if (existingCourse) {
        throw new ConflictException('Course code already exists in this school');
      }
    }

    // Verify teacher exists and belongs to the school
    if (createCourseDto.teacher_id) {
      const teacher = await this.prisma.teacher.findFirst({
        where: {
          id: createCourseDto.teacher_id,
          school_id: schoolId,
          status: 'active',
        },
      });

      if (!teacher) {
        throw new BadRequestException('Teacher not found or not active in this school');
      }
    }

    const course = await this.prisma.course.create({
      data: {
        ...createCourseDto,
        school_id: schoolId,
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
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      message: 'Course created successfully',
      data: course,
    };
  }

  async getCourse(id: string, user: any) {
    const course = await this.prisma.course.findUnique({
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
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        classCourses: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            classCourses: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify user has access to the course's school
    await this.verifySchoolAccess(course.school_id, user);

    return {
      data: course,
    };
  }

  async updateCourse(id: string, updateCourseDto: UpdateCourseDto, user: any) {
    const existingCourse = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      throw new NotFoundException('Course not found');
    }

    // Verify user has access to the course's school
    await this.verifySchoolAccess(existingCourse.school_id, user);

    // Check if course code already exists in the school (excluding current course)
    if (updateCourseDto.code) {
      const duplicateCourse = await this.prisma.course.findFirst({
        where: {
          school_id: existingCourse.school_id,
          code: updateCourseDto.code,
          NOT: { id },
        },
      });

      if (duplicateCourse) {
        throw new ConflictException('Course code already exists in this school');
      }
    }

    // Verify teacher exists and belongs to the school
    if (updateCourseDto.teacher_id) {
      const teacher = await this.prisma.teacher.findFirst({
        where: {
          id: updateCourseDto.teacher_id,
          school_id: existingCourse.school_id,
          status: 'active',
        },
      });

      if (!teacher) {
        throw new BadRequestException('Teacher not found or not active in this school');
      }
    }

    const course = await this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
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
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      message: 'Course updated successfully',
      data: course,
    };
  }

  async deleteCourse(id: string, user: any) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            classCourses: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify user has access to the course's school
    await this.verifySchoolAccess(course.school_id, user);

    // Check if course is assigned to any classes
    if (course._count.classCourses > 0) {
      throw new BadRequestException(
        'Cannot delete course as it is assigned to one or more classes',
      );
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return {
      message: 'Course deleted successfully',
    };
  }

  async getClassCourses(classId: string, query: CourseQueryDto, user: any) {
    // Verify class exists and user has access
    const classInfo = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { school_id: true },
    });

    if (!classInfo) {
      throw new NotFoundException('Class not found');
    }

    await this.verifySchoolAccess(classInfo.school_id, user);

    const {
      page = 1,
      limit = 10,
      department,
      grade_level,
      teacher_id,
      status = 'active',
      search,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * Math.min(limit, 100);
    const take = Math.min(limit, 100);

    // Build where clause for courses
    const courseWhere: Prisma.CourseWhereInput = {
      status,
      ...(department && { department }),
      ...(grade_level && { grade_level }),
      ...(teacher_id && { teacher_id }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Build orderBy clause with proper type safety
    const orderBy: Prisma.CourseOrderByWithRelationInput = this.buildOrderBy(sortBy, sortOrder);

    const [classCourses, totalRecords] = await Promise.all([
      this.prisma.classCourse.findMany({
        where: {
          class_id: classId,
          course: courseWhere,
        },
        skip,
        take,
        orderBy: {
          course: orderBy,
        },
        include: {
          course: {
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
              school: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.classCourse.count({
        where: {
          class_id: classId,
          course: courseWhere,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / take);

    return {
      data: classCourses.map((cc: { course: any }) => cc.course),
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        recordsPerPage: take,
      },
    };
  }

  async assignCourseToClass(classId: string, assignCourseDto: AssignCourseDto, user: any) {
    // Verify class exists and user has access
    const classInfo = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { school_id: true },
    });

    if (!classInfo) {
      throw new NotFoundException('Class not found');
    }

    await this.verifySchoolAccess(classInfo.school_id, user);

    // Verify course exists and belongs to the same school
    const course = await this.prisma.course.findUnique({
      where: { id: assignCourseDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.school_id !== classInfo.school_id) {
      throw new BadRequestException('Course and class must belong to the same school');
    }

    if (course.status !== 'active') {
      throw new BadRequestException('Cannot assign inactive course to class');
    }

    // Check if course is already assigned to the class
    const existingAssignment = await this.prisma.classCourse.findUnique({
      where: {
        class_id_course_id: {
          class_id: classId,
          course_id: assignCourseDto.courseId,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Course is already assigned to this class');
    }

    const classCourse = await this.prisma.classCourse.create({
      data: {
        class_id: classId,
        course_id: assignCourseDto.courseId,
      },
      include: {
        course: {
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
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return {
      message: 'Course assigned to class successfully',
      data: classCourse,
    };
  }

  /**
   * Helper method to build type-safe orderBy clause
   */
  private buildOrderBy(sortBy: string, sortOrder: string): Prisma.CourseOrderByWithRelationInput {
    const order = sortOrder === 'desc' ? 'desc' : 'asc';

    switch (sortBy) {
      case 'name':
        return { name: order };
      case 'code':
        return { code: order };
      case 'department':
        return { department: order };
      case 'grade_level':
        return { grade_level: order };
      case 'credits':
        return { credits: order };
      case 'created_at':
        return { created_at: order };
      case 'updated_at':
        return { updated_at: order };
      case 'teacher':
        return { teacher: { user: { first_name: order } } };
      default:
        return { name: order }; // Default fallback
    }
  }

  private async verifySchoolAccess(schoolId: string, user: any) {
    if (user.role === 'admin') {
      return; // Admin has access to all schools
    }

    const schoolUser = await this.prisma.schoolUser.findFirst({
      where: {
        user_id: user.id,
        school_id: schoolId,
        status: 'active',
      },
    });

    if (!schoolUser) {
      throw new ForbiddenException('Access denied to this school');
    }
  }
}