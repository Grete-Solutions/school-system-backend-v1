import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentQueryDto } from './dto/assessment-query.dto';
import { BulkCreateAssessmentDto } from './dto/bulk-create-assessment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get('students/:studentId/assessments')
  @Roles('admin', 'school_admin', 'teacher', 'student')
  async getStudentAssessments(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: AssessmentQueryDto,
    @GetUser() user: any,
  ) {
    return this.assessmentsService.getStudentAssessments(studentId, query, user);
  }

  @Get('classes/:classId/assessments')
  @Roles('admin', 'school_admin', 'teacher', 'student')
  async getClassAssessments(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: AssessmentQueryDto,
    @GetUser() user: any,
  ) {
    return this.assessmentsService.getClassAssessments(classId, query, user);
  }

  @Post('assessments')
  @Roles('admin', 'school_admin', 'teacher')
  async createAssessment(
    @Body() createAssessmentDto: CreateAssessmentDto,
    @GetUser() user: any,
  ) {
    return this.assessmentsService.createAssessment(createAssessmentDto, user);
  }

  @Get('assessments/:id')
  @Roles('admin', 'school_admin', 'teacher', 'student')
  async getAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: any,
  ) {
    return this.assessmentsService.getAssessment(id, user);
  }

  @Put('assessments/:id')
  @Roles('admin', 'school_admin', 'teacher')
  async updateAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
    @GetUser() user: any,
  ) {
    return this.assessmentsService.updateAssessment(id, updateAssessmentDto, user);
  }

  @Delete('assessments/:id')
  @Roles('admin', 'school_admin', 'teacher')
  async deleteAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: any,
  ) {
    return this.assessmentsService.deleteAssessment(id, user);
  }

  @Post('assessments/bulk')
  @Roles('admin', 'school_admin', 'teacher')
  async bulkCreateAssessments(
    @Body() bulkCreateAssessmentDto: BulkCreateAssessmentDto,
    @GetUser() user: any,
  ) {
    return this.assessmentsService.bulkCreateAssessments(bulkCreateAssessmentDto, user);
  }
}