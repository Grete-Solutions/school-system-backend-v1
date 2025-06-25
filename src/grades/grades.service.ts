import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradeQueryDto } from './dto/grade-query.dto';
import { BulkUpdateGradeDto } from './dto/bulk-update-grade.dto';
import { Prisma } from '@prisma/client';
import { PaginationUtil } from '../common/utils/pagination.util';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentGrades(studentId: string, query: GradeQueryDto, user: any) {
    // Verify student exists and user has access
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await this.verifySchoolAccess(student.school_id, user);

    // If user is a student, they can only see their own grades
    if (user.role === 'student' && user.id !== student.user_id) {
      throw new ForbiddenException('Access denied');
    }

    const {
      page = 1,
      limit = 10,
      assessment_id,
      class_id,
      course_id,
      term_id,
      status,
      letter_grade,
      graded_from,
      graded_to,
      sortBy = 'graded_at',
      sortOrder = 'desc',
    } = query;

    const { skip, take } = PaginationUtil.getPaginationParams(page, limit);

    const where: Prisma.GradeWhereInput = {
      student_id: studentId,
      ...(assessment_id && { assessment_id }),
      ...(class_id && { class_id }),
      ...(course_id && { course_id }),
      ...(term_id && { term_id }),
      ...(status && { status }),
      ...(letter_grade && { letter_grade }),
      ...(graded_from && { graded_at: { gte: new Date(graded_from) } }),
      ...(graded_to && { graded_at: { lte: new Date(graded_to) } }),
    };

    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const [grades, totalRecords] = await Promise.all([
      this.prisma.grade.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              type: true,
              total_points: true,
              due_date: true,
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
          grader: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.grade.count({ where }),
    ]);

    const pagination = PaginationUtil.calculatePagination(totalRecords, page, limit);

    return {
      data: grades,
      pagination: {
        ...pagination,
        hasNextPage: page < pagination.totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getStudentGradesByTerm(
    studentId: string,
    termId: string,
    query: GradeQueryDto,
    user: any,
  ) {
    // Verify student and term exist
    const [student, term] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: studentId },
        include: { school: true },
      }),
      this.prisma.term.findUnique({
        where: { id: termId },
      }),
    ]);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    await this.verifySchoolAccess(student.school_id, user);

    // If user is a student, they can only see their own grades
    if (user.role === 'student' && user.id !== student.user_id) {
      throw new ForbiddenException('Access denied');
    }

    const queryWithTerm = { ...query, term_id: termId };
    return this.getStudentGrades(studentId, queryWithTerm, user);
  }

  async createGrade(createGradeDto: CreateGradeDto, user: any) {
    const { student_id, assessment_id, points_earned, points_possible } = createGradeDto;

    // Verify assessment exists and user has permission
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessment_id },
      include: { school: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    await this.verifySchoolAccess(assessment.school_id, user);

    // Verify student exists and is in the same school
    const student = await this.prisma.student.findUnique({
      where: { id: student_id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.school_id !== assessment.school_id) {
      throw new BadRequestException('Student and assessment must be in the same school');
    }

    // Check if grade already exists
    const existingGrade = await this.prisma.grade.findUnique({
      where: {
        student_id_assessment_id: {
          student_id,
          assessment_id,
        },
      },
    });

    if (existingGrade) {
      throw new ConflictException('Grade already exists for this student and assessment');
    }

    // Calculate percentage
    const percentage = (points_earned / points_possible) * 100;

    // Calculate letter grade if not provided
    let letter_grade = createGradeDto.letter_grade;
    if (!letter_grade) {
      letter_grade = this.calculateLetterGrade(percentage);
    }

    const grade = await this.prisma.grade.create({
      data: {
        ...createGradeDto,
        percentage,
        letter_grade,
        graded_by: user.id,
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            total_points: true,
          },
        },
        student: {
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
    });

    return grade;
  }

  async updateGrade(id: string, updateGradeDto: UpdateGradeDto, user: any) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        assessment: {
          include: { school: true },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    await this.verifySchoolAccess(grade.assessment.school.id, user);

    // Recalculate percentage if points changed
    let updateData = { ...updateGradeDto };
    if (updateGradeDto.points_earned !== undefined || updateGradeDto.points_possible !== undefined) {
      const points_earned = updateGradeDto.points_earned ?? grade.points_earned;
      const points_possible = updateGradeDto.points_possible ?? grade.points_possible;
      
      updateData.percentage = (points_earned / points_possible) * 100;
      
      // Recalculate letter grade if not explicitly provided
      if (!updateGradeDto.letter_grade) {
        updateData.letter_grade = this.calculateLetterGrade(updateData.percentage);
      }
    }

    const updatedGrade = await this.prisma.grade.update({
      where: { id },
      data: updateData,
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            total_points: true,
          },
        },
        student: {
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
    });

    return updatedGrade;
  }

  async getClassGradeSummary(classId: string, query: GradeQueryDto, user: any) {
    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { school: true },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    await this.verifySchoolAccess(classEntity.school_id, user);

    const { term_id, assessment_id } = query;

    // Get class students
    const classStudents = await this.prisma.classStudent.findMany({
      where: { class_id: classId },
      include: {
        student: {
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
    });

    // Build grades query
    const gradesWhere: Prisma.GradeWhereInput = {
      class_id: classId,
      ...(term_id && { term_id }),
      ...(assessment_id && { assessment_id }),
    };

    // Get grades for all students in the class
    const grades = await this.prisma.grade.findMany({
      where: gradesWhere,
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            total_points: true,
          },
        },
      },
    });

    // Group grades by student
    const studentGrades = classStudents.map(cs => {
      const studentGradesList = grades.filter(g => g.student_id === cs.student_id);
      const totalPoints = studentGradesList.reduce((sum, g) => sum + g.points_earned, 0);
      const totalPossible = studentGradesList.reduce((sum, g) => sum + g.points_possible, 0);
      const averagePercentage = totalPossible > 0 ? (totalPoints / totalPossible) * 100 : 0;

      return {
        student: cs.student,
        grades: studentGradesList,
        summary: {
          totalGrades: studentGradesList.length,
          totalPoints,
          totalPossible,
          averagePercentage,
          letterGrade: this.calculateLetterGrade(averagePercentage),
        },
      };
    });

    // Calculate class statistics
    const classStats = {
      totalStudents: classStudents.length,
      totalGrades: grades.length,
      averageClassPercentage: studentGrades.length > 0 
        ? studentGrades.reduce((sum, sg) => sum + sg.summary.averagePercentage, 0) / studentGrades.length 
        : 0,
      gradeDistribution: this.calculateGradeDistribution(studentGrades),
    };

    return {
      class: {
        id: classEntity.id,
        name: classEntity.name,
      },
      students: studentGrades,
      statistics: classStats,
    };
  }

  async bulkUpdateGrades(bulkUpdateGradeDto: BulkUpdateGradeDto, user: any) {
    const { grades: gradeUpdates } = bulkUpdateGradeDto;

    // Verify all grades exist and user has permission
    const gradeIds = gradeUpdates.map(g => g.id);
    const existingGrades = await this.prisma.grade.findMany({
      where: { id: { in: gradeIds } },
      include: {
        assessment: {
          include: { school: true },
        },
      },
    });

    if (existingGrades.length !== gradeIds.length) {
      throw new NotFoundException('One or more grades not found');
    }

    // Verify user has access to all schools
    const schoolIds = [...new Set(existingGrades.map(g => g.assessment.school.id))];
    for (const schoolId of schoolIds) {
      await this.verifySchoolAccess(schoolId, user);
    }

    // Prepare bulk update data
    const updatePromises = gradeUpdates.map(async (gradeUpdate) => {
      const existingGrade = existingGrades.find(g => g.id === gradeUpdate.id);
      
      let updateData = { ...gradeUpdate };
      delete updateData.id; // Remove id from update data

      // Recalculate percentage if points changed
      if (gradeUpdate.points_earned !== undefined) {
        const points_possible = existingGrade.points_possible;
        updateData.percentage = (gradeUpdate.points_earned / points_possible) * 100;
        
        // Recalculate letter grade if not explicitly provided
        if (!gradeUpdate.letter_grade) {
          updateData.letter_grade = this.calculateLetterGrade(updateData.percentage);
        }
      }

      return this.prisma.grade.update({
        where: { id: gradeUpdate.id },
        data: updateData,
      });
    });

    const updatedGrades = await Promise.all(updatePromises);

    return {
      message: `Successfully updated ${updatedGrades.length} grades`,
      updatedGrades,
    };
  }

  private buildOrderBy(sortBy: string, sortOrder: string) {
    const validSortFields = ['points_earned', 'percentage', 'letter_grade', 'graded_at', 'created_at'];
    
    if (!validSortFields.includes(sortBy)) {
      return { graded_at: 'desc' };
    }

    return { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };
  }

  private calculateLetterGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  private calculateGradeDistribution(studentGrades: any[]) {
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    
    studentGrades.forEach(sg => {
      const letterGrade = sg.summary.letterGrade;
      if (distribution.hasOwnProperty(letterGrade)) {
        distribution[letterGrade]++;
      }
    });

    return distribution;
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