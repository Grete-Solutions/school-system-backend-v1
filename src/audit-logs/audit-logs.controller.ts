import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  UseGuards, 
  Request, 
  HttpStatus, 
  BadRequestException 
} from '@nestjs/common';
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
  @Query('limit') limitStr?: string,
  @Query('offset') offsetStr?: string,
) {
  const limit = limitStr ? parseInt(limitStr, 10) : 10;
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
  
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new BadRequestException('Limit must be between 1 and 100');
  }
  if (isNaN(offset) || offset < 0) {
    throw new BadRequestException('Offset must be 0 or greater');
  }
  
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