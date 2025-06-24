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
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSchoolStatusDto } from './dto/update-school-status.dto';
import { UpdateSchoolSettingsDto } from './dto/school-settings.dto';
import { UpdateSchoolBrandingDto } from './dto/school-branding.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  // Existing endpoints
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

  // NEW ENDPOINTS - School Configuration
  @Get(':id/settings')
  @UseGuards(JwtAuthGuard)
  async getSettings(@Request() req: RequestWithUser, @Param('id') id: string) {
    const settings = await this.schoolsService.getSchoolSettings(id, req.user.sub);
    return { statusCode: HttpStatus.OK, data: settings };
  }

  @Put(':id/settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateSchoolSettingsDto,
  ) {
    const settings = await this.schoolsService.updateSchoolSettings(id, req.user.sub, dto);
    return { statusCode: HttpStatus.OK, data: settings };
  }

  @Get(':id/branding')
  @UseGuards(JwtAuthGuard)
  async getBranding(@Request() req: RequestWithUser, @Param('id') id: string) {
    const branding = await this.schoolsService.getSchoolBranding(id, req.user.sub);
    return { statusCode: HttpStatus.OK, data: branding };
  }

  @Put(':id/branding')
  @UseGuards(JwtAuthGuard)
  async updateBranding(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateSchoolBrandingDto,
  ) {
    const branding = await this.schoolsService.updateSchoolBranding(id, req.user.sub, dto);
    return { statusCode: HttpStatus.OK, data: branding };
  }

  @Post(':id/logo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB.');
    }

    const result = await this.schoolsService.uploadSchoolLogo(id, req.user.sub, file, dto);
    return { statusCode: HttpStatus.CREATED, data: result };
  }

  @Post(':id/banner')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadBanner(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    // Validate file size (10MB max for banners)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 10MB.');
    }

    const result = await this.schoolsService.uploadSchoolBanner(id, req.user.sub, file, dto);
    return { statusCode: HttpStatus.CREATED, data: result };
  }

  // NEW ENDPOINTS - School Statistics
  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req: RequestWithUser, @Param('id') id: string) {
    const stats = await this.schoolsService.getSchoolDashboardStats(id, req.user.sub);
    return { statusCode: HttpStatus.OK, data: stats };
  }

  @Get(':id/revenue')
  @UseGuards(JwtAuthGuard)
  async getRevenue(
    @Request() req: RequestWithUser, 
    @Param('id') id: string,
    @Query('year') year?: number,
    @Query('months') months?: number
  ) {
    const revenue = await this.schoolsService.getSchoolRevenueAnalytics(
      id, 
      req.user.sub, 
      year, 
      months
    );
    return { statusCode: HttpStatus.OK, data: revenue };
  }

  @Get(':id/enrollment-stats')
  @UseGuards(JwtAuthGuard)
  async getEnrollmentStats(
    @Request() req: RequestWithUser, 
    @Param('id') id: string,
    @Query('year') year?: number
  ) {
    const stats = await this.schoolsService.getEnrollmentStatistics(id, req.user.sub, year);
    return { statusCode: HttpStatus.OK, data: stats };
  }
}