import 'reflect-metadata';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { UserEntity } from '../users/user.entity';
import { BorrowerProfileEntity } from './borrower-profile.entity';
import { ApplicationEntity } from './application.entity';
import { ConsentEntity } from './consent.entity';
import { ApplicationsService } from './applications.service';
import type { CreateApplicationDto } from './dto/create-application.dto';

/**
 * Touches TypeORM against the real local PostgreSQL `aimready_test`
 * database (per AGENTS.md's testing rule: no mocked repository for
 * TypeORM-touching tests). Requires `pnpm --filter api migration:run`
 * to have been run against that database at least once.
 */
describe('ApplicationsService (integration)', () => {
  let dataSource: DataSource;
  let applications: Repository<ApplicationEntity>;
  let consents: Repository<ConsentEntity>;
  let profiles: Repository<BorrowerProfileEntity>;
  let users: Repository<UserEntity>;
  let service: ApplicationsService;

  const TENANT_ID = 'kalinaw';
  let borrowerId: string;

  const validDto = (
    over: Partial<CreateApplicationDto> = {},
  ): CreateApplicationDto => ({
    product: 'PL',
    amount: 15_000_000, // ₱150,000
    tenor: 24,
    income: 6_800_000,
    obligations: 750_000,
    purpose: 'Home improvement',
    consentCredit: true,
    consentData: true,
    consentTerms: true,
    ...over,
  });

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'aimready',
      password: process.env.DB_PASSWORD ?? 'aimready_dev',
      database: process.env.DB_NAME ?? 'aimready_test',
      entities: [
        UserEntity,
        ApplicationEntity,
        ConsentEntity,
        BorrowerProfileEntity,
      ],
      synchronize: false,
    });
    await dataSource.initialize();
    applications = dataSource.getRepository(ApplicationEntity);
    consents = dataSource.getRepository(ConsentEntity);
    profiles = dataSource.getRepository(BorrowerProfileEntity);
    users = dataSource.getRepository(UserEntity);
    service = new ApplicationsService(
      applications,
      consents,
      profiles,
      dataSource,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // Scoped to this file's own test email's user id, not a blanket DELETE -
    // Jest runs spec files in parallel workers by default, and an unscoped
    // delete here would raze another file's concurrently-running test data
    // the same way an earlier version of auth.service.integration.spec.ts's
    // cleanup did before it was scoped for the same reason. Looked up by
    // email (not the in-memory `borrowerId`) so a stale row left by an
    // interrupted previous run is still cleaned up.
    const priorId = (
      await users.findOne({
        where: { email: 'app-intake-test@email.com' },
      })
    )?.id;
    if (priorId) {
      await consents.query(
        'DELETE FROM consents WHERE application_id IN (SELECT id FROM applications WHERE borrower_id = $1)',
        [priorId],
      );
      await applications.query(
        'DELETE FROM applications WHERE borrower_id = $1',
        [priorId],
      );
      await profiles.query('DELETE FROM borrower_profiles WHERE user_id = $1', [
        priorId,
      ]);
      await users.query('DELETE FROM users WHERE id = $1', [priorId]);
    }

    const user = await users.save(
      users.create({
        tenantId: TENANT_ID,
        email: 'app-intake-test@email.com',
        passwordHash: 'unused-in-this-test',
        appScope: 'borrower',
        role: 'borrower',
        name: 'Test Borrower',
      }),
    );
    borrowerId = user.id;
    await profiles.save(
      profiles.create({
        userId: borrowerId,
        tenantId: TENANT_ID,
        age: 36,
        bureau: 'Full file',
        yearsAsCustomer: 7,
        stable: true,
        sanctions: false,
        defaulted: false,
      }),
    );
  });

  const user = () => ({ sub: borrowerId, tenantId: TENANT_ID });

  it('rejects a submission missing a consent, naming it, and creates no application', async () => {
    const result = await service.create(
      user(),
      validDto({ consentTerms: false }),
    );
    expect(result).toEqual({
      ok: false,
      error: 'Please provide the terms and conditions.',
    });
    expect(await applications.count()).toBe(0);
  });

  it('rejects an amount outside the product limits, with the actual limits in the error', async () => {
    const result = await service.create(
      user(),
      validDto({ product: 'SL', amount: 100_000_000 }),
    );
    expect(result).toEqual({
      ok: false,
      error: 'Enter an amount between ₱10,000 and ₱300,000.',
    });
  });

  it('rejects a tenor outside the product limits, with the actual limits in the error', async () => {
    const result = await service.create(user(), validDto({ tenor: 48 }));
    expect(result).toEqual({
      ok: false,
      error: 'Enter a term between 6 and 36 months.',
    });
  });

  it('captures all three consents with their own timestamp and terms version', async () => {
    const result = await service.create(user(), validDto());
    if (!result.ok) throw new Error('expected success');
    const rows = await consents.find({
      where: { applicationId: result.applicationId },
    });
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.kind).sort()).toEqual([
      'credit_check',
      'data_processing',
      'terms',
    ]);
    rows.forEach((r) => {
      expect(r.capturedAt).toBeInstanceOf(Date);
      expect(r.termsVersion).toBe('v3.2');
    });
  });

  it('blocks a second open application for the same product, naming the existing one', async () => {
    const first = await service.create(user(), validDto());
    if (!first.ok) throw new Error('expected success');
    const second = await service.create(user(), validDto());
    expect(second).toEqual({
      ok: false,
      error: `You already have an open personal loan application (${first.applicationId}).`,
    });
  });

  it('allows a new application once the prior one is closed', async () => {
    const first = await service.create(user(), validDto());
    if (!first.ok) throw new Error('expected success');
    await service.close(user(), first.applicationId, 'Disbursed');
    const second = await service.create(user(), validDto());
    expect(second.ok).toBe(true);
  });

  it('enforces the duplicate-open-application rule at the database level too (race-safety)', async () => {
    // Bypasses the service's own pre-check to prove the partial unique index
    // itself blocks a second open row for the same tenant/borrower/product -
    // the real enforcement point for two concurrent submissions racing past
    // that pre-check at the same time.
    const row = {
      tenantId: TENANT_ID,
      borrowerId,
      productCode: 'PL',
      amount: 15_000_000,
      tenor: 24,
      income: 6_800_000,
      obligations: 750_000,
      purpose: 'Home improvement',
      stage: 'Review' as const,
      decision: {} as never,
    };
    await applications.save(applications.create(row));
    await expect(applications.save(applications.create(row))).rejects.toThrow();
  });

  it('does not block a brand-new open application once prior ones for the same product are terminal (partial index is correctly scoped)', async () => {
    // Direct inserts, bypassing the service, to prove the index itself -
    // not just the service's pre-check - only constrains open-stage rows.
    // If this were a blanket unique constraint on (tenant, borrower,
    // product) rather than a partial one, every insert past the first
    // would fail regardless of stage.
    const base = {
      tenantId: TENANT_ID,
      borrowerId,
      productCode: 'PL',
      amount: 15_000_000,
      tenor: 24,
      income: 6_800_000,
      obligations: 750_000,
      purpose: 'Home improvement',
      decision: {} as never,
    };
    await applications.save(
      applications.create({ ...base, stage: 'Disbursed' as const }),
    );
    await applications.save(
      applications.create({ ...base, stage: 'Declined' as const }),
    );
    await applications.save(
      applications.create({ ...base, stage: 'Withdrawn' as const }),
    );
    await expect(
      applications.save(
        applications.create({ ...base, stage: 'Review' as const }),
      ),
    ).resolves.toBeDefined();
    expect(
      await applications.count({ where: { borrowerId, productCode: 'PL' } }),
    ).toBe(4);
  });

  it('runs the decision pipeline and persists an immutable decision record (auto-approve)', async () => {
    const result = await service.create(user(), validDto());
    if (!result.ok) throw new Error('expected success');
    expect(result.decision.outcome).toBe('approve');
    const stored = await applications.findOne({
      where: { id: result.applicationId },
    });
    expect(stored?.decision).toEqual(result.decision);
    expect(stored?.stage).toBe('Offer');
  });

  it('declines on a policy knockout with no score computed', async () => {
    await profiles.update({ userId: borrowerId }, { age: 17 });
    const result = await service.create(user(), validDto());
    if (!result.ok) throw new Error('expected success');
    expect(result.decision.outcome).toBe('decline');
    expect(result.decision.score).toBeNull();
    const stored = await applications.findOne({
      where: { id: result.applicationId },
    });
    expect(stored?.stage).toBe('Declined');
  });

  it("leaves a persisted decision record unchanged after the application's stage changes later", async () => {
    const result = await service.create(user(), validDto());
    if (!result.ok) throw new Error('expected success');
    await service.close(user(), result.applicationId, 'Disbursed');
    const stored = await applications.findOne({
      where: { id: result.applicationId },
    });
    expect(stored?.decision).toEqual(result.decision);
  });

  it('carries the tenant identifier on every write', async () => {
    const result = await service.create(user(), validDto());
    if (!result.ok) throw new Error('expected success');
    const app = await applications.findOne({
      where: { id: result.applicationId },
    });
    expect(app?.tenantId).toBe(TENANT_ID);
  });

  it("refuses to close another borrower's application, the same as a missing one (no enumeration)", async () => {
    const result = await service.create(user(), validDto());
    if (!result.ok) throw new Error('expected success');
    await expect(
      service.close(
        { sub: 'someone-else', tenantId: TENANT_ID },
        result.applicationId,
        'Disbursed',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to disburse an application that was referred, not approved', async () => {
    // Amount above PL's ₱200,000 auto-approval limit always triggers referral.
    const result = await service.create(
      user(),
      validDto({ amount: 49_000_000 }),
    );
    if (!result.ok) throw new Error('expected success');
    expect(result.decision.outcome).not.toBe('approve');
    await expect(
      service.close(user(), result.applicationId, 'Disbursed'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to close an application that is already closed', async () => {
    const result = await service.create(user(), validDto());
    if (!result.ok) throw new Error('expected success');
    await service.close(user(), result.applicationId, 'Disbursed');
    await expect(
      service.close(user(), result.applicationId, 'Disbursed'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws a distinct failure when the application store is unreachable', async () => {
    const brokenProfiles = {
      findOne: () => Promise.reject(new Error('connection refused')),
    } as unknown as Repository<BorrowerProfileEntity>;
    const brokenService = new ApplicationsService(
      applications,
      consents,
      brokenProfiles,
      dataSource,
    );
    await expect(
      brokenService.create(user(), validDto()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
