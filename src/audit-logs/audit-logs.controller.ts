import { Controller, Get, Param, Query, UseGuards, Request, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; role: string };
}

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Request() req: RequestWithUser,
    @Query() dto: GetAuditLogsDto,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('offset', ParseIntPipe) offset: number = 0,
  ) {
    const logs = await this.auditLogsService.getLogs(req.user.sub, dto, limit, offset);
    return { statusCode: HttpStatus.OK, data: logs };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Request() req: RequestWithUser, @Param('id') id: string) {
    const log = await this.auditLogsService.getLogById(req.user.sub, id);
    return { statusCode: HttpStatus.OK, data: log };
  }
}