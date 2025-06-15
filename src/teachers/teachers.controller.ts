import { Controller, Post, Body, Get, Param, Put, Query, UseGuards, Request } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: RequestWithUser, @Body() dto: CreateTeacherDto) {
    return this.teachersService.createTeacher(req.user.sub, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.teachersService.getTeacherById(id, req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.updateTeacher(id, req.user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Request() req: RequestWithUser,
    @Query('schoolId') schoolId: string,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    return this.teachersService.getAllTeachers(req.user.sub, schoolId, parseInt(limit), parseInt(offset));
  }
}