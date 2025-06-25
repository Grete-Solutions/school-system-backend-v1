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

    const skip = (page - 1) * Math.min(limit, 100);
    const take = Math.min(limit, 100);

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