import 'reflect-metadata';
import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../app.module';
import { TokenService } from '../auth/token.service';
import { AuditLogService } from './audit-log.service';

/**
 * Full-stack: boots the real `AppModule` (real Postgres, real guard, real
 * `AuditLogService`) and hits `GET /audit-log` over HTTP, per AGENTS.md's
 * testing rule - this is the one endpoint this change adds, so it gets the
 * full-stack treatment rather than a unit-level test.
 */
describe('GET /audit-log (e2e)', () => {
  let app: INestApplication;
  let tokens: TokenService;
  let auditLog: AuditLogService;

  beforeAll(async () => {
    process.env.DB_NAME = process.env.DB_NAME ?? 'aimready_test';
    process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET ?? 'test-secret';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    tokens = moduleRef.get(TokenService);
    auditLog = moduleRef.get(AuditLogService);
  });

  afterAll(async () => {
    await app.close();
  });

  function sessionFor(tenantId: string, role: 'compliance' | 'borrower') {
    return tokens.signSession({
      sub: `audit-e2e-${role}`,
      tenantId,
      appScope: role === 'borrower' ? 'borrower' : 'staff',
      role,
      email: `${role}@email.com`,
    });
  }

  it("returns that tenant's entries, newest-first, to a compliance session", async () => {
    const tenantId = `audit-e2e-tenant-${Date.now()}-list`;
    await auditLog.record({
      tenantId,
      action: 'permission_denied',
      actorId: 'u1',
      actorEmail: 'u1@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: { seq: 1 },
    });
    await new Promise((r) => setTimeout(r, 10));
    await auditLog.record({
      tenantId,
      action: 'permission_denied',
      actorId: 'u2',
      actorEmail: 'u2@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: { seq: 2 },
    });

    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .get('/audit-log')
      .set('Authorization', `Bearer ${sessionFor(tenantId, 'compliance')}`);

    expect(res.status).toBe(200);
    expect(
      (res.body as Array<{ detail: { seq: number } }>).map((e) => e.detail.seq),
    ).toEqual([2, 1]);
  });

  it('refuses a non-compliance role, and that refusal itself is recorded', async () => {
    const tenantId = `audit-e2e-tenant-${Date.now()}-refuse`;
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .get('/audit-log')
      .set('Authorization', `Bearer ${sessionFor(tenantId, 'borrower')}`);

    expect(res.status).toBe(401);

    const entries = await auditLog.list(tenantId);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'permission_denied',
      actorRole: 'borrower',
      reason: 'role_mismatch',
    });
    expect(entries[0].detail).toMatchObject({
      method: 'GET',
      path: '/audit-log',
    });
  });

  it("never returns another tenant's entries", async () => {
    const tenantA = `audit-e2e-tenant-${Date.now()}-a`;
    const tenantB = `audit-e2e-tenant-${Date.now()}-b`;
    await auditLog.record({
      tenantId: tenantA,
      action: 'permission_denied',
      actorId: 'ua',
      actorEmail: 'ua@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: {},
    });
    await auditLog.record({
      tenantId: tenantB,
      action: 'permission_denied',
      actorId: 'ub',
      actorEmail: 'ub@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: {},
    });

    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .get('/audit-log')
      .set('Authorization', `Bearer ${sessionFor(tenantA, 'compliance')}`);

    expect(res.status).toBe(200);
    const actorIds = (res.body as Array<{ actorId: string }>).map(
      (e) => e.actorId,
    );
    expect(actorIds).toContain('ua');
    expect(actorIds).not.toContain('ub');
  });
});
