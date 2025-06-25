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
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminPaginationQueryDto } from './dto/admin-pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiPaginatedResponse } from '../common/decorators/api-response.decorator';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('admins')
@UseGuards(JwtAuthGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  // GET /admins - Get all system admins (super admin only, paginated)
  @Get()
  @ApiPaginatedResponse(Object, 'Get paginated list of system administrators')
  async getAllAdmins(
    @Request() req: RequestWithUser,
    @Query() query: AdminPaginationQueryDto,
  ) {
    return this.adminsService.getAllAdmins(req.user.sub, query);
  }

  // POST /admins - Create new admin (super admin only)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(
    @Request() req: RequestWithUser,
    @Body() dto: CreateAdminDto,
  ) {
    return this.adminsService.createAdmin(req.user.sub, dto);
  }

  // GET /admins/stats - Get admin statistics (super admin only)
  @Get('stats')
  async getAdminStats(
    @Request() req: RequestWithUser,
  ) {
    return this.adminsService.getAdminStats(req.user.sub);
  }

  // GET /admins/:id - Get admin details (super admin only)
  @Get(':id')
  async getAdminById(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminsService.getAdminById(id, req.user.sub);
  }

  // PUT /admins/:id - Update admin (super admin only)
  @Put(':id')
  async updateAdmin(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.adminsService.updateAdmin(id, req.user.sub, dto);
  }

  // DELETE /admins/:id - Delete admin (super admin only)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAdmin(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminsService.deleteAdmin(id, req.user.sub);
  }
}