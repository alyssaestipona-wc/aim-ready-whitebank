import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { UserEntity } from '../users/user.entity';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

/**
 * Touches TypeORM against the real local PostgreSQL `aimready_test`
 * database (per AGENTS.md's testing rule: no mocked repository for
 * TypeORM-touching tests). Requires `pnpm --filter api migration:run`
 * to have been run against that database at least once.
 */
describe('AuthService (integration)', () => {
  let dataSource: DataSource;
  let repo: Repository<UserEntity>;
  let service: AuthService;

  const TENANT_ID = 'kalinaw';
  const PASSWORD = 'kalinaw2026';

  beforeAll(async () => {
    process.env.AUTH_JWT_SECRET = 'test-secret';
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'aimready',
      password: process.env.DB_PASSWORD ?? 'aimready_dev',
      database: process.env.DB_NAME ?? 'aimready_test',
      entities: [UserEntity],
      synchronize: false,
    });
    await dataSource.initialize();
    repo = dataSource.getRepository(UserEntity);
    service = new AuthService(repo, new TokenService());
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // A scoped DELETE, not repo.clear()'s TRUNCATE: `users` is now
    // referenced by foreign keys (applications, consents, borrower_profiles,
    // added in real-application-intake), and Postgres refuses to TRUNCATE a
    // referenced table at all, even an empty one, without CASCADE. A plain,
    // unscoped DELETE FROM users would still be safe against those FKs (none
    // of this suite's three emails ever gets an application), but would
    // raze any row another test file's parallel Jest worker is using against
    // this same shared database at the same moment - scope to our own rows.
    await repo.query(
      "DELETE FROM users WHERE email IN ('juan.delacruz@email.com', 'approver@kalinawbank.ph', 'admin@kalinawbank.ph')",
    );
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await repo.save([
      repo.create({
        tenantId: TENANT_ID,
        email: 'juan.delacruz@email.com',
        passwordHash,
        appScope: 'borrower',
        role: 'borrower',
        name: 'Juan Dela Cruz',
      }),
      repo.create({
        tenantId: TENANT_ID,
        email: 'approver@kalinawbank.ph',
        passwordHash,
        appScope: 'staff',
        role: 'approver',
        name: 'Teresa Lim',
      }),
      repo.create({
        tenantId: TENANT_ID,
        email: 'admin@kalinawbank.ph',
        passwordHash,
        appScope: 'admin',
        role: 'admin',
        name: 'Jonas Mercado',
      }),
    ]);
  });

  it('rejects an unknown email with the generic error', async () => {
    const result = await service.login({
      email: 'nobody@email.com',
      password: PASSWORD,
      appScope: 'borrower',
    });
    expect(result).toEqual({
      ok: false,
      error: 'Email or password is incorrect.',
    });
  });

  it('rejects a wrong password with the generic error', async () => {
    const result = await service.login({
      email: 'juan.delacruz@email.com',
      password: 'wrong',
      appScope: 'borrower',
    });
    expect(result).toEqual({
      ok: false,
      error: 'Email or password is incorrect.',
    });
  });

  it('issues a session immediately for a correct borrower login', async () => {
    const result = await service.login({
      email: 'juan.delacruz@email.com',
      password: PASSWORD,
      appScope: 'borrower',
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.kind === 'session') {
      expect(result.role).toBe('borrower');
      expect(typeof result.token).toBe('string');
    } else {
      throw new Error('expected a session result');
    }
  });

  it('requires the code step for a correct staff login', async () => {
    const result = await service.login({
      email: 'approver@kalinawbank.ph',
      password: PASSWORD,
      appScope: 'staff',
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.kind === 'code-required') {
      expect(result.devCode).toMatch(/^\d{6}$/);
    } else {
      throw new Error('expected a code-required result');
    }
  });

  it('refuses the tenant-administrator email on the staff path with a distinct message', async () => {
    const result = await service.login({
      email: 'admin@kalinawbank.ph',
      password: PASSWORD,
      appScope: 'staff',
    });
    expect(result).toEqual({
      ok: false,
      error: 'Tenant administrators sign in at the separate admin console.',
    });
  });

  it('issues a session after the correct code', async () => {
    const login = await service.login({
      email: 'approver@kalinawbank.ph',
      password: PASSWORD,
      appScope: 'staff',
    });
    if (!login.ok || login.kind !== 'code-required')
      throw new Error('expected a code-required result');
    if (!login.devCode) throw new Error('expected devCode outside production');
    const result = service.verifyCode({
      pendingToken: login.pendingToken,
      code: login.devCode,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects an incorrect code', async () => {
    const login = await service.login({
      email: 'approver@kalinawbank.ph',
      password: PASSWORD,
      appScope: 'staff',
    });
    if (!login.ok || login.kind !== 'code-required')
      throw new Error('expected a code-required result');
    const wrongCode = login.devCode === '000000' ? '111111' : '000000';
    const result = service.verifyCode({
      pendingToken: login.pendingToken,
      code: wrongCode,
    });
    expect(result).toEqual({
      ok: false,
      error: 'That code is incorrect. Try again.',
    });
  });

  it('rejects a code with no valid prior pending token', () => {
    const result = service.verifyCode({
      pendingToken: 'not-a-real-pending-token',
      code: '123456',
    });
    expect(result).toEqual({
      ok: false,
      error: 'That code is incorrect. Try again.',
    });
  });

  it('throws a distinct failure when the identity store is unreachable', async () => {
    const brokenRepo = {
      findOne: () => Promise.reject(new Error('connection refused')),
    } as unknown as Repository<UserEntity>;
    const brokenService = new AuthService(brokenRepo, new TokenService());
    await expect(
      brokenService.login({
        email: 'juan.delacruz@email.com',
        password: PASSWORD,
        appScope: 'borrower',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
