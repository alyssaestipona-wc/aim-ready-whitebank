import 'reflect-metadata';
import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../app.module';

/**
 * Confirms /auth/login is rate-limited and /auth/me is not - i.e. the
 * throttle is scoped to the credential-guessing endpoints, not applied
 * globally (a prior review round found a global-guard version of this that
 * would have throttled every route in the app).
 */
describe('Auth throttling (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DB_NAME = process.env.DB_NAME ?? 'aimready_test';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after the limit on /auth/login, within the window', async () => {
    const body = {
      email: 'nobody@email.com',
      password: 'wrong',
      appScope: 'borrower',
    };
    const server = app.getHttpServer() as Server;
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(server).post('/auth/login').send(body);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it('does not throttle /auth/me', async () => {
    const server = app.getHttpServer() as Server;
    for (let i = 0; i < 15; i++) {
      const res = await request(server).get('/auth/me');
      expect(res.status).not.toBe(429);
    }
  });
});
