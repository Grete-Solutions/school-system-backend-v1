import { Controller, Post, Body, Get, Param, Put, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiPaginatedResponse } from '../common/decorators/api-response.decorator';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller()
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  // Get all teachers in a school (paginated)
  @Get('schools/:schoolId/teachers')
  @UseGuards(JwtAuthGuard)
  @ApiPaginatedResponse(Object, 'Get paginated list of teachers in school')
  async getTeachersBySchool(
    @Request() req: RequestWithUser,
    @Param('schoolId') schoolId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.teachersService.getTeachersBySchool(req.user.sub, schoolId, paginationDto);
  }

  // Add new teacher to school
  @Post('schools/:schoolId/teachers')
  @UseGuards(JwtAuthGuard)
  async createTeacherInSchool(
    @Request() req: RequestWithUser,
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateTeacherDto,
  ) {
    // Ensure school_id matches the route parameter
    const createDto = { ...dto, school_id: schoolId };
    return this.teachersService.createTeacher(req.user.sub, createDto);
  }

  // Get teacher details
  @Get('teachers/:id')
  @UseGuards(JwtAuthGuard)
  async getTeacherById(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.teachersService.getTeacherById(id, req.user.sub);
  }

  // Update teacher
  @Put('teachers/:id')
  @UseGuards(JwtAuthGuard)
  async updateTeacher(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.updateTeacher(id, req.user.sub, dto);
  }

  // Delete teacher
  @Delete('teachers/:id')
  @UseGuards(JwtAuthGuard)
  async deleteTeacher(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.teachersService.deleteTeacher(id, req.user.sub);
  }

  // Get teacher's classes (paginated) - placeholder for future implementation
  @Get('teachers/:id/classes')
  @UseGuards(JwtAuthGuard)
  @ApiPaginatedResponse(Object, 'Get paginated list of teacher classes')
  async getTeacherClasses(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.teachersService.getTeacherClasses(id, req.user.sub, paginationDto);
  }

  // Get teacher's students (paginated) - placeholder for future implementation
  @Get('teachers/:id/students')
  @UseGuards(JwtAuthGuard)
  @ApiPaginatedResponse(Object, 'Get paginated list of teacher students')
  async getTeacherStudents(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.teachersService.getTeacherStudents(id, req.user.sub, paginationDto);
  }

  // Legacy endpoint - keeping for backward compatibility
  @Get('teachers')
  @UseGuards(JwtAuthGuard)
  @ApiPaginatedResponse(Object, 'Get paginated list of teachers')
  async getAllTeachers(
    @Request() req: RequestWithUser,
    @Query('schoolId') schoolId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    if (!schoolId) {
      throw new Error('schoolId query parameter is required');
    }
    return this.teachersService.getTeachersBySchool(req.user.sub, schoolId, paginationDto);
  }
}