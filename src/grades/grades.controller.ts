import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradeQueryDto } from './dto/grade-query.dto';
import { BulkUpdateGradeDto } from './dto/bulk-update-grade.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('students/:studentId/grades')
  @Roles('admin', 'school_admin', 'teacher', 'student')
  async getStudentGrades(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: GradeQueryDto,
    @GetUser() user: any,
  ) {
    return this.gradesService.getStudentGrades(studentId, query, user);
  }

  @Get('students/:studentId/grades/term/:termId')
  @Roles('admin', 'school_admin', 'teacher', 'student')
  async getStudentGradesByTerm(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Query() query: GradeQueryDto,
    @GetUser() user: any,
  ) {
    return this.gradesService.getStudentGradesByTerm(studentId, termId, query, user);
  }

  @Post('grades')
  @Roles('admin', 'school_admin', 'teacher')
  async createGrade(
    @Body() createGradeDto: CreateGradeDto,
    @GetUser() user: any,
  ) {
    return this.gradesService.createGrade(createGradeDto, user);
  }

  @Put('grades/:id')
  @Roles('admin', 'school_admin', 'teacher')
  async updateGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGradeDto: UpdateGradeDto,
    @GetUser() user: any,
  ) {
    return this.gradesService.updateGrade(id, updateGradeDto, user);
  }

  @Get('classes/:classId/grades/summary')
  @Roles('admin', 'school_admin', 'teacher')
  async getClassGradeSummary(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: GradeQueryDto,
    @GetUser() user: any,
  ) {
    return this.gradesService.getClassGradeSummary(classId, query, user);
  }

  @Post('grades/bulk-update')
  @Roles('admin', 'school_admin', 'teacher')
  async bulkUpdateGrades(
    @Body() bulkUpdateGradeDto: BulkUpdateGradeDto,
    @GetUser() user: any,
  ) {
    return this.gradesService.bulkUpdateGrades(bulkUpdateGradeDto, user);
  }
}