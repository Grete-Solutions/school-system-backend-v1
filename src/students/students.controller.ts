import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Put, 
  Delete,
  Query, 
  UseGuards, 
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { BulkImportStudentsDto } from './dto/bulk-import-students.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // GET /schools/:schoolId/students - Get all students in school (paginated)
  @Get('schools/:schoolId')
  async getStudentsBySchool(
    @Request() req: RequestWithUser,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.studentsService.getStudentsBySchool(req.user.sub, schoolId, query);
  }

  // POST /schools/:schoolId/students - Add new student
  @Post('schools/:schoolId')
  async createStudentInSchool(
    @Request() req: RequestWithUser,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: CreateStudentDto,
  ) {
    return this.studentsService.createStudent(req.user.sub, schoolId, dto);
  }

  // GET /students/:id - Get student details
  @Get(':id')
  async getStudentById(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studentsService.getStudentById(id, req.user.sub);
  }

  // PUT /students/:id - Update student
  @Put(':id')
  async updateStudent(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.updateStudent(id, req.user.sub, dto);
  }

  // DELETE /students/:id - Delete student
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStudent(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studentsService.deleteStudent(id, req.user.sub);
  }

  // PUT /students/:id/status - Update student enrollment status
  @Put(':id/status')
  async updateStudentStatus(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentStatusDto,
  ) {
    return this.studentsService.updateStudentStatus(id, req.user.sub, dto);
  }

  // GET /students/:id/profile - Get student profile
  @Get(':id/profile')
  async getStudentProfile(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studentsService.getStudentProfile(id, req.user.sub);
  }

  // PUT /students/:id/profile - Update student profile
  @Put(':id/profile')
  async updateStudentProfile(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.studentsService.updateStudentProfile(id, req.user.sub, dto);
  }

  // POST /students/bulk-import - Bulk import students
  @Post('bulk-import')
  async bulkImportStudents(
    @Request() req: RequestWithUser,
    @Query('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: BulkImportStudentsDto,
  ) {
    return this.studentsService.bulkImportStudents(req.user.sub, schoolId, dto);
  }

  // Legacy endpoints for backward compatibility
  @Post()
  async create(@Request() req: RequestWithUser, @Body() dto: CreateStudentDto) {
    // This assumes school_id is in the DTO for backward compatibility
    return this.studentsService.createStudent(req.user.sub, (dto as any).school_id, dto);
  }

  @Get()
  async getAll(
    @Request() req: RequestWithUser,
    @Query('schoolId') schoolId: string,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    // Convert to new pagination format for backward compatibility
    const query: PaginationQueryDto = {
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      limit: parseInt(limit),
    };
    return this.studentsService.getStudentsBySchool(req.user.sub, schoolId, query);
  }
}