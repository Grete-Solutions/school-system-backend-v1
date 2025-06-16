import { Controller, Post, Get, Param, Body, UseGuards, Request, Query, HttpStatus } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: RequestWithUser, @Body() dto: CreateReportDto) {
    const report = await this.reportsService.createReport(req.user.sub, dto);
    return { statusCode: HttpStatus.OK, data: report };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Request() req: RequestWithUser,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    const reports = await this.reportsService.getReports(req.user.sub, parseInt(limit), parseInt(offset));
    return { statusCode: HttpStatus.OK, data: reports };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Request() req: RequestWithUser, @Param('id') id: string) {
    const report = await this.reportsService.getReportById(req.user.sub, id);
    return { statusCode: HttpStatus.OK, data: report };
  }
}