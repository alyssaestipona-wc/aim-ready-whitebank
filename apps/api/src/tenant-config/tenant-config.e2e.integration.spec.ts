import 'reflect-metadata';
import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../app.module';
import { TokenService } from '../auth/token.service';

/**
 * Full-stack, live-HTTP proof that `@Roles('admin')` on `GET /tenant-config`
 * is real backend enforcement, matching the established pattern (e.g.
 * `applications.role-enforcement.e2e.spec.ts`).
 */
describe('Tenant config role enforcement (e2e)', () => {
  let app: INestApplication;
  let tokens: TokenService;

  beforeAll(async () => {
    process.env.DB_NAME = process.env.DB_NAME ?? 'aimready_test';
    process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET ?? 'test-secret';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    tokens = moduleRef.get(TokenService);
  });

  afterAll(async () => {
    await app.close();
  });

  function sessionFor(role: string) {
    return tokens.signSession({
      sub: `tenant-config-e2e-${role}`,
      tenantId: 'kalinaw',
      appScope: 'admin',
      role: role as never,
      email: `${role}@email.com`,
    });
  }

  it('refuses a non-admin role with 401', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .get('/tenant-config')
      .set('Authorization', `Bearer ${sessionFor('officer')}`);
    expect(res.status).toBe(401);
  });

  it('lets the admin role read the tenant config', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .get('/tenant-config')
      .set('Authorization', `Bearer ${sessionFor('admin')}`);
    expect(res.status).toBe(200);
    const body = res.body as { killSwitch: boolean; bureauDown: boolean };
    expect(typeof body.killSwitch).toBe('boolean');
    expect(typeof body.bureauDown).toBe('boolean');
  });
});
