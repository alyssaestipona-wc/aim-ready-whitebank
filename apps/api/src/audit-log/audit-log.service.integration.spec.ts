import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';

import { AuditLogEntity } from './audit-log.entity';
import { AuditLogService } from './audit-log.service';

/**
 * Touches TypeORM against the real local PostgreSQL `aimready_test`
 * database (per AGENTS.md's testing rule: no mocked repository for
 * TypeORM-touching tests). Requires `pnpm --filter api migration:run`
 * to have been run against that database at least once.
 */
describe('AuditLogService (integration)', () => {
  let dataSource: DataSource;
  let auditLogRepo: Repository<AuditLogEntity>;
  let service: AuditLogService;

  const TENANT_A = 'audit-log-test-tenant-a';
  const TENANT_B = 'audit-log-test-tenant-b';

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'aimready',
      password: process.env.DB_PASSWORD ?? 'aimready_dev',
      database: process.env.DB_NAME ?? 'aimready_test',
      entities: [AuditLogEntity],
      synchronize: false,
    });
    await dataSource.initialize();
    auditLogRepo = dataSource.getRepository(AuditLogEntity);
    service = new AuditLogService(auditLogRepo);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await auditLogRepo.delete({ tenantId: TENANT_A });
    await auditLogRepo.delete({ tenantId: TENANT_B });
  });

  it('records an entry and reads it back', async () => {
    await service.record({
      tenantId: TENANT_A,
      action: 'permission_denied',
      actorId: 'u1',
      actorEmail: 'u1@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: {
        method: 'GET',
        path: '/applications',
        requiredRoles: ['officer'],
      },
    });

    const entries = await service.list(TENANT_A);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'permission_denied',
      actorId: 'u1',
      actorEmail: 'u1@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: {
        method: 'GET',
        path: '/applications',
        requiredRoles: ['officer'],
      },
    });
  });

  it('lists newest-first', async () => {
    await service.record({
      tenantId: TENANT_A,
      action: 'permission_denied',
      actorId: 'u1',
      actorEmail: 'u1@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: { seq: 1 },
    });
    await new Promise((r) => setTimeout(r, 10));
    await service.record({
      tenantId: TENANT_A,
      action: 'permission_denied',
      actorId: 'u2',
      actorEmail: 'u2@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: { seq: 2 },
    });

    const entries = await service.list(TENANT_A);
    expect(entries.map((e) => e.detail.seq)).toEqual([2, 1]);
  });

  it("never lets one tenant see another tenant's entries", async () => {
    await service.record({
      tenantId: TENANT_A,
      action: 'permission_denied',
      actorId: 'u1',
      actorEmail: 'u1@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: {},
    });
    await service.record({
      tenantId: TENANT_B,
      action: 'permission_denied',
      actorId: 'u2',
      actorEmail: 'u2@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: {},
    });

    const entriesA = await service.list(TENANT_A);
    const entriesB = await service.list(TENANT_B);
    expect(entriesA).toHaveLength(1);
    expect(entriesA[0].actorId).toBe('u1');
    expect(entriesB).toHaveLength(1);
    expect(entriesB[0].actorId).toBe('u2');
  });
});
