import { Controller, Post, Body, Get, Param, Put, Delete, Query, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSchoolStatusDto } from './dto/update-school-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: RequestWithUser, @Body() dto: CreateSchoolDto) {
    const school = await this.schoolsService.createSchool(req.user.sub, dto);
    return { statusCode: HttpStatus.CREATED, data: school };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Request() req: RequestWithUser,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: SchoolFilterDto,
  ) {
    const result = await this.schoolsService.getAllSchools(req.user.sub, paginationDto, filterDto);
    return { 
      statusCode: HttpStatus.OK, 
      data: result.data,
      pagination: result.pagination
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Request() req: RequestWithUser, @Param('id') id: string) {
    const school = await this.schoolsService.getSchoolById(id, req.user.sub);
    return { statusCode: HttpStatus.OK, data: school };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    const school = await this.schoolsService.updateSchool(id, req.user.sub, dto);
    return { statusCode: HttpStatus.OK, data: school };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Request() req: RequestWithUser, @Param('id') id: string) {
    await this.schoolsService.deleteSchool(id, req.user.sub);
    return { statusCode: HttpStatus.OK, message: 'School deleted successfully' };
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateSchoolStatusDto,
  ) {
    const school = await this.schoolsService.updateSchoolStatus(id, req.user.sub, dto);
    return { statusCode: HttpStatus.OK, data: school };
  }
}