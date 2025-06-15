import { Controller, Post, Body, Get, Param, Put, Query, UseGuards, Request } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: RequestWithUser, @Body() dto: CreateStudentDto) {
    return this.studentsService.createStudent(req.user.sub, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.studentsService.getStudentById(id, req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.updateStudent(id, req.user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Request() req: RequestWithUser,
    @Query('schoolId') schoolId: string,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    return this.studentsService.getAllStudents(req.user.sub, schoolId, parseInt(limit), parseInt(offset));
  }
}