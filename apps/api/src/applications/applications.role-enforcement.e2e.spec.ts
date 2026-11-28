import 'reflect-metadata';
import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../app.module';
import { TokenService } from '../auth/token.service';
import { AuditLogService } from '../audit-log/audit-log.service';

/**
 * Full-stack, live-HTTP proof that `@Roles(...)` on these routes is real
 * backend enforcement, not just `applications.controller.spec.ts`'s
 * reflected-metadata check - a representative sample per PLT-10's own task
 * breakdown, not every endpoint in the codebase.
 */
describe('Applications role enforcement (e2e)', () => {
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

  function sessionFor(tenantId: string, role: string) {
    return tokens.signSession({
      sub: `role-enforcement-e2e-${role}`,
      tenantId,
      appScope: 'staff',
      role: role as never,
      email: `${role}@email.com`,
    });
  }

  const FAKE_ID = '00000000-0000-0000-0000-000000000000';

  it.each([
    ['GET', '/applications', 'borrower'],
    ['GET', `/applications/${FAKE_ID}`, 'borrower'],
    ['PATCH', `/applications/${FAKE_ID}/decide`, 'officer'],
    ['PATCH', `/applications/${FAKE_ID}/pick`, 'approver'],
    ['PATCH', `/applications/${FAKE_ID}/request-info`, 'approver'],
    ['PATCH', `/applications/${FAKE_ID}/resolve-info`, 'approver'],
    ['PATCH', `/applications/${FAKE_ID}/recommend`, 'approver'],
    ['PATCH', `/applications/${FAKE_ID}/return`, 'officer'],
    ['GET', '/applications/mine', 'officer'],
  ])(
    '%s %s rejects a %s-role session with 401, and records the refusal',
    async (method, path, wrongRole) => {
      const tenantId = `role-enforcement-e2e-${Date.now()}-${wrongRole}-${method}`;
      const server = app.getHttpServer() as Server;
      const token = sessionFor(tenantId, wrongRole);

      const res = await (
        method === 'GET'
          ? request(server).get(path)
          : request(server).patch(path).send({})
      ).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);

      const entries = await auditLog.list(tenantId);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        action: 'permission_denied',
        actorRole: wrongRole,
        reason: 'role_mismatch',
      });
      expect(entries[0].detail).toMatchObject({ method, path });
    },
  );
});
