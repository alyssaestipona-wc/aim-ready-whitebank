import { Controller, Get, Req } from '@nestjs/common';

import type { RequestWithSession } from '../auth/guards/session-role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLogService, type AuditLogListItem } from './audit-log.service';

@Controller('audit-log')
@Roles('compliance')
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  list(@Req() req: RequestWithSession): Promise<AuditLogListItem[]> {
    const user = req.user!;
    return this.auditLog.list(user.tenantId);
  }
}
