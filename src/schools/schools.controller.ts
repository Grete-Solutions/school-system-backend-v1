import { Controller, Post, Body, Get, Param, Put, Query, UseGuards, Request } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
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
    return this.schoolsService.createSchool(req.user.sub, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.schoolsService.getSchoolById(id, req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    return this.schoolsService.updateSchool(id, req.user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Request() req: RequestWithUser,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    return this.schoolsService.getAllSchools(req.user.sub, parseInt(limit), parseInt(offset));
  }
}