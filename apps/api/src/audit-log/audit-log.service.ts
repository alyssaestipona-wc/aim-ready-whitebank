import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLogEntity } from './audit-log.entity';

export type AuditLogEntry = {
  tenantId: string;
  action: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  reason: string;
  detail: Record<string, unknown>;
};

export type AuditLogListItem = {
  id: string;
  action: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  reason: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

/**
 * Append-only: `record()` (insert) and `list()` (tenant-scoped read) are the
 * only two operations this service exposes - there is no update or delete,
 * by design (see design.md's "Immutability is structural" decision).
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLog: Repository<AuditLogEntity>,
  ) {}

  async record(entry: AuditLogEntry): Promise<void> {
    await this.auditLog.save(this.auditLog.create(entry));
  }

  async list(tenantId: string): Promise<AuditLogListItem[]> {
    let rows: AuditLogEntity[];
    try {
      rows = await this.auditLog.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
      });
    } catch (err) {
      this.logger.error(
        'Audit log read failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('audit_log_service_unavailable');
    }
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      actorId: r.actorId,
      actorEmail: r.actorEmail,
      actorRole: r.actorRole,
      reason: r.reason,
      detail: r.detail,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
