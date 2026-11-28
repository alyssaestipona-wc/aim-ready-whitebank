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
import {
  APPROVER_AUTHORITY,
  DECLINE_REASON_CODES,
  INFO_REQUEST_ITEM_IDS,
  SLA_HOURS,
} from './policy';

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

  describe('staff read access', () => {
    it("lists only the caller's tenant applications", async () => {
      await service.create(user(), validDto());
      const other = await applications.save(
        applications.create({
          tenantId: 'another-tenant',
          borrowerId,
          productCode: 'PL',
          amount: 15_000_000,
          tenor: 24,
          income: 6_800_000,
          obligations: 750_000,
          purpose: 'Home improvement',
          stage: 'Review' as const,
          decision: { outcome: 'refer' } as never,
        }),
      );
      const rows = await service.findAllForTenant(user(), {});
      expect(rows.every((r) => r.id !== other.id)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
    });

    it('filters the list by stage and by product', async () => {
      const result = await service.create(user(), validDto());
      if (!result.ok) throw new Error('expected success');
      const byStage = await service.findAllForTenant(user(), {
        stage: 'Declined',
      });
      expect(
        byStage.find((r) => r.id === result.applicationId),
      ).toBeUndefined();
      const byProduct = await service.findAllForTenant(user(), {
        product: 'SL',
      });
      expect(
        byProduct.find((r) => r.id === result.applicationId),
      ).toBeUndefined();
    });

    it("returns the full decision record and consents for the caller's tenant", async () => {
      const result = await service.create(user(), validDto());
      if (!result.ok) throw new Error('expected success');
      const detail = await service.findOneForTenant(
        TENANT_ID,
        result.applicationId,
      );
      expect(detail.decision).toEqual(result.decision);
      expect(detail.consents).toHaveLength(3);
      expect(detail.consents.map((c) => c.kind).sort()).toEqual([
        'credit_check',
        'data_processing',
        'terms',
      ]);
    });

    it("refuses another tenant's application the same way as a missing one", async () => {
      const result = await service.create(user(), validDto());
      if (!result.ok) throw new Error('expected success');
      await expect(
        service.findOneForTenant('another-tenant', result.applicationId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws a distinct failure when the application store is unreachable (list)', async () => {
      const brokenApplications = {
        find: () => Promise.reject(new Error('connection refused')),
      } as unknown as Repository<ApplicationEntity>;
      const brokenService = new ApplicationsService(
        brokenApplications,
        consents,
        profiles,
        dataSource,
      );
      await expect(
        brokenService.findAllForTenant(user(), {}),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws a distinct failure when the application store is unreachable (detail)', async () => {
      const brokenApplications = {
        findOne: () => Promise.reject(new Error('connection refused')),
      } as unknown as Repository<ApplicationEntity>;
      const brokenService = new ApplicationsService(
        brokenApplications,
        consents,
        profiles,
        dataSource,
      );
      await expect(
        brokenService.findOneForTenant(
          TENANT_ID,
          '11111111-1111-1111-1111-111111111111',
        ),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('refuses a malformed id as not-found, never reaching the database', async () => {
      await expect(
        service.findOneForTenant(TENANT_ID, 'not-a-uuid'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('decide', () => {
    const referred = (over: Partial<ApplicationEntity> = {}) =>
      applications.save(
        applications.create({
          tenantId: TENANT_ID,
          borrowerId,
          productCode: 'PL',
          amount: 15_000_000,
          tenor: 24,
          income: 6_800_000,
          obligations: 750_000,
          purpose: 'Home improvement',
          stage: 'Review' as const,
          decision: { outcome: 'refer', grade: 'A' } as never,
          ...over,
        }),
      );

    it('approves within authority, recording the reviewer and returning the monthly repayment', async () => {
      const app = await referred();
      const result = await service.decide(user(), app.id, {
        decision: 'approve',
      });
      if (!result.ok || result.stage !== 'Offer') {
        throw new Error('expected an approval');
      }
      expect(result.monthlyPayment).toBeGreaterThan(0);
      const stored = await applications.findOne({ where: { id: app.id } });
      expect(stored?.stage).toBe('Offer');
      expect(stored?.reviewerId).toBe(borrowerId);
    });

    it('refuses to approve above the amount limit, leaving the application in Review', async () => {
      const app = await referred({ amount: APPROVER_AUTHORITY.limit + 1 });
      const result = await service.decide(user(), app.id, {
        decision: 'approve',
      });
      expect(result.ok).toBe(false);
      const stored = await applications.findOne({ where: { id: app.id } });
      expect(stored?.stage).toBe('Review');
      expect(stored?.reviewerId).toBeNull();
    });

    it('refuses to approve a grade outside the allowed grades', async () => {
      const app = await referred({
        decision: { outcome: 'refer', grade: 'D' } as never,
      });
      const result = await service.decide(user(), app.id, {
        decision: 'approve',
      });
      expect(result.ok).toBe(false);
      const stored = await applications.findOne({ where: { id: app.id } });
      expect(stored?.stage).toBe('Review');
    });

    it('refuses to approve a null grade', async () => {
      const app = await referred({
        decision: { outcome: 'refer', grade: null } as never,
      });
      const result = await service.decide(user(), app.id, {
        decision: 'approve',
      });
      expect(result.ok).toBe(false);
    });

    it('approves exactly at the amount limit (inclusive boundary)', async () => {
      const app = await referred({ amount: APPROVER_AUTHORITY.limit });
      const result = await service.decide(user(), app.id, {
        decision: 'approve',
      });
      expect(result.ok).toBe(true);
    });

    it('refuses a second, concurrent decide on the same application', async () => {
      const app = await referred();
      const [first, second] = await Promise.allSettled([
        service.decide(user(), app.id, { decision: 'approve' }),
        service.decide(user(), app.id, {
          decision: 'decline',
          reasonCode: DECLINE_REASON_CODES[0],
        }),
      ]);
      // Exactly one of the two concurrent requests wins; the other is
      // refused as "not awaiting a decision" (a BadRequestException, the
      // same race-safety shape as create()'s unique-index catch) - never
      // both silently applied.
      const settled = [first, second];
      const won = settled.filter((r) => r.status === 'fulfilled' && r.value.ok);
      const lost = settled.filter(
        (r) =>
          r.status === 'rejected' && r.reason instanceof BadRequestException,
      );
      expect(won).toHaveLength(1);
      expect(lost).toHaveLength(1);
    });

    it('declines with a valid reason code, recording the reviewer and the code', async () => {
      const app = await referred();
      const reasonCode = DECLINE_REASON_CODES[0];
      const result = await service.decide(user(), app.id, {
        decision: 'decline',
        reasonCode,
      });
      expect(result).toEqual({ ok: true, stage: 'Declined' });
      const stored = await applications.findOne({ where: { id: app.id } });
      expect(stored?.stage).toBe('Declined');
      expect(stored?.reviewerId).toBe(borrowerId);
      expect(stored?.declineReasonCode).toBe(reasonCode);
    });

    it('refuses to decline with a missing reason code', async () => {
      const app = await referred();
      const result = await service.decide(user(), app.id, {
        decision: 'decline',
      });
      expect(result.ok).toBe(false);
      const stored = await applications.findOne({ where: { id: app.id } });
      expect(stored?.stage).toBe('Review');
    });

    it('refuses to decline with an invalid reason code', async () => {
      const app = await referred();
      const result = await service.decide(user(), app.id, {
        decision: 'decline',
        reasonCode: 'Not a real reason',
      });
      expect(result.ok).toBe(false);
    });

    it('refuses to decide an application not in Review', async () => {
      const app = await referred({ stage: 'Offer' as const });
      await expect(
        service.decide(user(), app.id, { decision: 'approve' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to decide another tenant's application, same as a missing one", async () => {
      const app = await referred();
      await expect(
        service.decide(
          { sub: borrowerId, tenantId: 'another-tenant' },
          app.id,
          { decision: 'approve' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws a distinct failure when the application store is unreachable', async () => {
      const brokenApplications = {
        findOne: () => Promise.reject(new Error('connection refused')),
      } as unknown as Repository<ApplicationEntity>;
      const brokenService = new ApplicationsService(
        brokenApplications,
        consents,
        profiles,
        dataSource,
      );
      await expect(
        brokenService.decide(user(), '11111111-1111-1111-1111-111111111111', {
          decision: 'approve',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('queues and pick', () => {
    const openApp = (over: Partial<ApplicationEntity> = {}) =>
      applications.save(
        applications.create({
          tenantId: TENANT_ID,
          borrowerId,
          productCode: 'PL',
          amount: 15_000_000,
          tenor: 24,
          income: 6_800_000,
          obligations: 750_000,
          purpose: 'Home improvement',
          stage: 'Review' as const,
          decision: { outcome: 'refer', grade: 'A' } as never,
          ...over,
        }),
      );

    it('lists only the applications assigned to the caller under the mine filter', async () => {
      const mine = await openApp({ assigneeId: borrowerId, productCode: 'PL' });
      await openApp({ productCode: 'SL' }); // unassigned, same tenant - must not appear under "mine"
      const rows = await service.findAllForTenant(user(), { queue: 'mine' });
      expect(rows.map((r) => r.id)).toEqual([mine.id]);
    });

    it('lists only unassigned Review-stage applications under the unassigned filter', async () => {
      const unassigned = await openApp({ productCode: 'PL' });
      await openApp({ productCode: 'SL', assigneeId: borrowerId }); // assigned - must not appear
      const rows = await service.findAllForTenant(user(), {
        queue: 'unassigned',
      });
      expect(rows.map((r) => r.id)).toEqual([unassigned.id]);
    });

    it("never leaks another tenant's application into mine or unassigned, even with a colliding assignee/borrower id", async () => {
      // Same borrowerId/assigneeId as the caller, but a different tenant -
      // proves the queue filters are never satisfied by assigneeId/stage
      // alone; tenantId must always be ANDed in too.
      await openApp({
        tenantId: 'another-tenant',
        assigneeId: borrowerId,
        productCode: 'PL',
      });
      await openApp({ tenantId: 'another-tenant', productCode: 'SL' });
      const mine = await service.findAllForTenant(user(), { queue: 'mine' });
      const unassigned = await service.findAllForTenant(user(), {
        queue: 'unassigned',
      });
      expect(mine).toHaveLength(0);
      expect(unassigned).toHaveLength(0);
    });

    it('refuses an unassigned-queue request with a conflicting explicit stage filter', async () => {
      await expect(
        service.findAllForTenant(user(), {
          queue: 'unassigned',
          stage: 'Offer',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows an unassigned-queue request with a redundant but consistent stage filter', async () => {
      const unassigned = await openApp();
      const rows = await service.findAllForTenant(user(), {
        queue: 'unassigned',
        stage: 'Review',
      });
      expect(rows.map((r) => r.id)).toEqual([unassigned.id]);
    });

    it('picks an unassigned Review-stage application, recording the assignee and time', async () => {
      const app = await openApp();
      const result = await service.pick(user(), app.id);
      expect(result).toEqual({ ok: true });
      const stored = await applications.findOne({ where: { id: app.id } });
      expect(stored?.assigneeId).toBe(borrowerId);
      expect(stored?.assignedAt).toBeInstanceOf(Date);
    });

    it('refuses to pick an already-assigned application', async () => {
      const otherOfficerId = '22222222-2222-2222-2222-222222222222';
      const app = await openApp({ assigneeId: otherOfficerId });
      const result = await service.pick(user(), app.id);
      expect(result.ok).toBe(false);
      const stored = await applications.findOne({ where: { id: app.id } });
      expect(stored?.assigneeId).toBe(otherOfficerId);
    });

    it('refuses to pick an application not in Review', async () => {
      const app = await openApp({ stage: 'Offer' as const });
      await expect(service.pick(user(), app.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("refuses to pick another tenant's application, same as a missing one", async () => {
      const app = await openApp();
      await expect(
        service.pick({ sub: borrowerId, tenantId: 'another-tenant' }, app.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets exactly one of two concurrent picks on the same application win', async () => {
      const app = await openApp();
      const otherOfficerId = '33333333-3333-3333-3333-333333333333';
      const [first, second] = await Promise.all([
        service.pick(user(), app.id),
        service.pick({ sub: otherOfficerId, tenantId: TENANT_ID }, app.id),
      ]);
      const won = [first, second].filter((r) => r.ok);
      expect(won).toHaveLength(1);
    });

    it('throws a distinct failure when the application store is unreachable', async () => {
      const brokenApplications = {
        findOne: () => Promise.reject(new Error('connection refused')),
      } as unknown as Repository<ApplicationEntity>;
      const brokenService = new ApplicationsService(
        brokenApplications,
        consents,
        profiles,
        dataSource,
      );
      await expect(
        brokenService.pick(user(), '11111111-1111-1111-1111-111111111111'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('refuses a malformed id as not-found, never reaching the database', async () => {
      await expect(service.pick(user(), 'not-a-uuid')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('SLA and information requests', () => {
    const openApp = (over: Partial<ApplicationEntity> = {}) =>
      applications.save(
        applications.create({
          tenantId: TENANT_ID,
          borrowerId,
          productCode: 'PL',
          amount: 15_000_000,
          tenor: 24,
          income: 6_800_000,
          obligations: 750_000,
          purpose: 'Home improvement',
          stage: 'Review' as const,
          decision: { outcome: 'refer', grade: 'A' } as never,
          stageEnteredAt: new Date(),
          ...over,
        }),
      );

    it('reports hours left for a Review-stage application', async () => {
      await openApp();
      const rows = await service.findAllForTenant(user(), {});
      expect(rows[0]?.slaHoursLeft).toBe(SLA_HOURS.Review);
    });

    it('reports no SLA for a terminal stage', async () => {
      await openApp({
        stage: 'Declined' as const,
        decision: { outcome: 'decline', grade: null } as never,
      });
      const rows = await service.findAllForTenant(user(), {});
      expect(rows[0]?.slaHoursLeft).toBeNull();
    });

    it('requests information, moving to Info requested with a fresh SLA window', async () => {
      const app = await openApp();
      const result = await service.requestInfo(user(), app.id, {
        items: [INFO_REQUEST_ITEM_IDS[0]],
        message: 'Please upload your statements.',
      });
      expect(result).toEqual({ ok: true });
      const stored = await applications.findOne({ where: { id: app.id } });
      expect(stored?.stage).toBe('Info requested');
      expect(stored?.infoRequestItems).toEqual([INFO_REQUEST_ITEM_IDS[0]]);
      expect(stored?.infoRequestMessage).toBe('Please upload your statements.');
      const detail = await service.findOneForTenant(TENANT_ID, app.id);
      expect(detail.slaHoursLeft).toBe(SLA_HOURS['Info requested']);
    });

    it('refuses to request information for an application not in Review', async () => {
      const app = await openApp({ stage: 'Offer' as const });
      await expect(
        service.requestInfo(user(), app.id, {
          items: [INFO_REQUEST_ITEM_IDS[0]],
          message: 'Please upload your statements.',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to request information for another tenant's application", async () => {
      const app = await openApp();
      await expect(
        service.requestInfo(
          { sub: borrowerId, tenantId: 'another-tenant' },
          app.id,
          { items: [INFO_REQUEST_ITEM_IDS[0]], message: 'Hi' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resolves an information request, moving back to Review', async () => {
      const app = await openApp({
        stage: 'Info requested' as const,
        infoRequestItems: [INFO_REQUEST_ITEM_IDS[0]],
        infoRequestMessage: 'Please upload your statements.',
      });
      const result = await service.resolveInfo(user(), app.id);
      expect(result).toEqual({ ok: true });
      const stored = await applications.findOne({ where: { id: app.id } });
      expect(stored?.stage).toBe('Review');
      expect(stored?.infoRequestItems).toBeNull();
      expect(stored?.infoRequestMessage).toBeNull();
    });

    it('refuses to resolve an application not awaiting information', async () => {
      const app = await openApp();
      await expect(service.resolveInfo(user(), app.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lets exactly one of two concurrent resolve attempts win', async () => {
      const app = await openApp({ stage: 'Info requested' as const });
      const [first, second] = await Promise.all([
        service.resolveInfo(user(), app.id),
        service.resolveInfo(user(), app.id),
      ]);
      const won = [first, second].filter((r) => r.ok);
      expect(won).toHaveLength(1);
    });

    it('lets exactly one of two concurrent request-info attempts win', async () => {
      const app = await openApp();
      const [first, second] = await Promise.all([
        service.requestInfo(user(), app.id, {
          items: [INFO_REQUEST_ITEM_IDS[0]],
          message: 'First request.',
        }),
        service.requestInfo(user(), app.id, {
          items: [INFO_REQUEST_ITEM_IDS[1]],
          message: 'Second request.',
        }),
      ]);
      const won = [first, second].filter((r) => r.ok);
      expect(won).toHaveLength(1);
    });

    it('throws a distinct failure when the application store is unreachable (requestInfo)', async () => {
      const brokenApplications = {
        findOne: () => Promise.reject(new Error('connection refused')),
      } as unknown as Repository<ApplicationEntity>;
      const brokenService = new ApplicationsService(
        brokenApplications,
        consents,
        profiles,
        dataSource,
      );
      await expect(
        brokenService.requestInfo(
          user(),
          '11111111-1111-1111-1111-111111111111',
          { items: [INFO_REQUEST_ITEM_IDS[0]], message: 'Hi' },
        ),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
