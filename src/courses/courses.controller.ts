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
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';
import { AssignCourseDto } from './dto/assign-course.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('schools/:schoolId/courses')
  @Roles('admin', 'school_admin', 'teacher')
  async getSchoolCourses(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() query: CourseQueryDto,
    @GetUser() user: any,
  ) {
    return this.coursesService.getSchoolCourses(schoolId, query, user);
  }

  @Post('schools/:schoolId/courses')
  @Roles('admin', 'school_admin')
  async createCourse(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() createCourseDto: CreateCourseDto,
    @GetUser() user: any,
  ) {
    return this.coursesService.createCourse(schoolId, createCourseDto, user);
  }

  @Get('courses/:id')
  @Roles('admin', 'school_admin', 'teacher', 'student')
  async getCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: any,
  ) {
    return this.coursesService.getCourse(id, user);
  }

  @Put('courses/:id')
  @Roles('admin', 'school_admin')
  async updateCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @GetUser() user: any,
  ) {
    return this.coursesService.updateCourse(id, updateCourseDto, user);
  }

  @Delete('courses/:id')
  @Roles('admin', 'school_admin')
  async deleteCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: any,
  ) {
    return this.coursesService.deleteCourse(id, user);
  }

  @Get('classes/:classId/courses')
  @Roles('admin', 'school_admin', 'teacher', 'student')
  async getClassCourses(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: CourseQueryDto,
    @GetUser() user: any,
  ) {
    return this.coursesService.getClassCourses(classId, query, user);
  }

  @Post('classes/:classId/courses')
  @Roles('admin', 'school_admin', 'teacher')
  async assignCourseToClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() assignCourseDto: AssignCourseDto,
    @GetUser() user: any,
  ) {
    return this.coursesService.assignCourseToClass(classId, assignCourseDto, user);
  }
}