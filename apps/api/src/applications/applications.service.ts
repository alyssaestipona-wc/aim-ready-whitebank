import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import {
  formatPeso,
  monthlyPayment,
  simulateDecision,
  type DecisionInput,
  type DecisionRecord,
  type Grade,
  type Outcome,
} from '@aim-ready/core';

import { BorrowerProfileEntity } from './borrower-profile.entity';
import { ApplicationEntity, type ApplicationStage } from './application.entity';
import { ConsentEntity, type ConsentKind } from './consent.entity';
import type { CreateApplicationDto } from './dto/create-application.dto';
import type { ListApplicationsDto } from './dto/list-applications.dto';
import type { DecideApplicationDto } from './dto/decide-application.dto';
import {
  PRODUCTS,
  POLICY,
  APPROVER_AUTHORITY,
  DECLINE_REASON_CODES,
  GRADE_RATE,
} from './policy';

const TERMS_VERSION = 'v3.2';
const OPEN_STAGES: ApplicationStage[] = ['Review', 'Offer'];
const POSTGRES_UNIQUE_VIOLATION = '23505';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SessionUser = { sub: string; tenantId: string };

/**
 * Structurally compatible with (but more precise than) `@aim-ready/contracts`'
 * `CreateApplicationResponse` - that package types `decision` as `unknown`
 * rather than depending on `@aim-ready/core` for the real `DecisionRecord`
 * type (ADR-0002 keeps the two packages from depending on each other).
 * apps/api itself has no such restriction, so this service keeps the
 * concrete type for its own callers and tests.
 */
export type CreateApplicationResult =
  | { ok: true; applicationId: string; decision: DecisionRecord }
  | { ok: false; error: string };

export type StaffApplicationListItem = {
  id: string;
  productCode: string;
  amount: number;
  tenor: number;
  stage: ApplicationStage;
  outcome: Outcome;
  grade: Grade | null;
  assigneeId: string | null;
};

export type DecideApplicationResult =
  | { ok: true; stage: 'Offer'; monthlyPayment: number }
  | { ok: true; stage: 'Declined' }
  | { ok: false; error: string };

export type PickApplicationResult = { ok: true } | { ok: false; error: string };

export type StaffApplicationDetail = {
  id: string;
  tenantId: string;
  borrowerId: string;
  productCode: string;
  amount: number;
  tenor: number;
  income: number;
  obligations: number;
  purpose: string;
  stage: ApplicationStage;
  decision: DecisionRecord;
  createdAt: Date;
  assigneeId: string | null;
  consents: { kind: ConsentKind; capturedAt: Date; termsVersion: string }[];
};

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly applications: Repository<ApplicationEntity>,
    @InjectRepository(ConsentEntity)
    private readonly consents: Repository<ConsentEntity>,
    @InjectRepository(BorrowerProfileEntity)
    private readonly profiles: Repository<BorrowerProfileEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    user: SessionUser,
    dto: CreateApplicationDto,
  ): Promise<CreateApplicationResult> {
    const missing = (
      [
        [dto.consentCredit, 'credit check consent'],
        [dto.consentData, 'data processing consent'],
        [dto.consentTerms, 'terms and conditions'],
      ] as const
    )
      .filter(([v]) => !v)
      .map(([, label]) => label);
    if (missing.length)
      return { ok: false, error: `Please provide the ${missing.join(', ')}.` };

    const product = PRODUCTS[dto.product];
    if (dto.amount < product.min || dto.amount > product.max) {
      return {
        ok: false,
        error: `Enter an amount between ${formatPeso(product.min)} and ${formatPeso(product.max)}.`,
      };
    }
    if (dto.tenor < product.tenorMin || dto.tenor > product.tenorMax) {
      return {
        ok: false,
        error: `Enter a term between ${product.tenorMin} and ${product.tenorMax} months.`,
      };
    }

    let profile: BorrowerProfileEntity | null;
    let existing: ApplicationEntity | null;
    try {
      profile = await this.profiles.findOne({
        where: { userId: user.sub, tenantId: user.tenantId },
      });
      existing = await this.applications.findOne({
        where: {
          tenantId: user.tenantId,
          borrowerId: user.sub,
          productCode: dto.product,
        },
        order: { createdAt: 'DESC' },
      });
    } catch (err) {
      this.logger.error(
        'Application submission failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }

    if (existing && OPEN_STAGES.includes(existing.stage)) {
      return {
        ok: false,
        error: `You already have an open ${product.name.toLowerCase()} application (${existing.id}).`,
      };
    }
    if (!profile)
      return { ok: false, error: 'We could not find your borrower profile.' };

    const input: DecisionInput = {
      product: dto.product,
      amount: dto.amount,
      age: profile.age,
      sanctions: profile.sanctions,
      defaulted: profile.defaulted,
      bureau: profile.bureau,
      years: profile.yearsAsCustomer,
      dti: dto.obligations / dto.income,
      mismatch: 0,
      stable: profile.stable,
    };
    const decision = simulateDecision(input, POLICY);
    const stage: ApplicationStage =
      decision.outcome === 'approve'
        ? 'Offer'
        : decision.outcome === 'refer'
          ? 'Review'
          : 'Declined';

    try {
      const applicationId = await this.dataSource.transaction(
        async (manager) => {
          const application = await manager.save(
            manager.create(ApplicationEntity, {
              tenantId: user.tenantId,
              borrowerId: user.sub,
              productCode: dto.product,
              amount: dto.amount,
              tenor: dto.tenor,
              income: dto.income,
              obligations: dto.obligations,
              purpose: dto.purpose,
              stage,
              decision,
            }),
          );
          const kinds: ConsentKind[] = [
            'credit_check',
            'data_processing',
            'terms',
          ];
          await manager.save(
            kinds.map((kind) =>
              manager.create(ConsentEntity, {
                applicationId: application.id,
                kind,
                termsVersion: TERMS_VERSION,
              }),
            ),
          );
          return application.id;
        },
      );
      return { ok: true, applicationId, decision };
    } catch (err) {
      // The partial unique index (open stages only) is the real race-safe
      // enforcement of "duplicate open application" - the pre-check above
      // only shortcuts the common case. A violation here means a concurrent
      // request won the race; report the same business error, not a 503.
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code?: string }).code ===
          POSTGRES_UNIQUE_VIOLATION
      ) {
        return {
          ok: false,
          error: `You already have an open ${product.name.toLowerCase()} application.`,
        };
      }
      this.logger.error(
        'Application submission failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }
  }

  /**
   * Lets the owning borrower report a terminal stage their client-side
   * simulated bank progression reached, so the duplicate-open-application
   * check stays correct once a loan finishes (see design.md). Only a
   * legitimate transition out of an open stage is accepted - never a
   * no-op on an already-closed application, and `Disbursed` only from
   * `Offer` with an `approve` decision, matching how the client's own
   * simulation actually reaches each terminal stage.
   */
  async close(
    user: SessionUser,
    applicationId: string,
    stage: ApplicationStage,
  ): Promise<void> {
    const application = await this.applications.findOne({
      where: { id: applicationId },
    });
    // Same "not found" for a missing application and one that isn't the
    // caller's own: a 403 would let a borrower enumerate valid ids within
    // their tenant by distinguishing "exists, not yours" from "no such id".
    if (
      !application ||
      application.tenantId !== user.tenantId ||
      application.borrowerId !== user.sub
    ) {
      throw new NotFoundException();
    }
    if (!OPEN_STAGES.includes(application.stage)) {
      throw new BadRequestException('Application is already closed.');
    }
    if (stage === 'Disbursed' && application.decision.outcome !== 'approve') {
      throw new BadRequestException(
        'Only an approved application can be disbursed.',
      );
    }
    application.stage = stage;
    await this.applications.save(application);
  }

  /**
   * Staff-facing, tenant-scoped list - never includes another tenant's rows.
   * `filters.queue` narrows to the caller's own assigned applications
   * (`mine`) or to the Unassigned queue (`unassigned`, Review-stage only,
   * no assignee); omitted shows the team view (every tenant application,
   * matching the simulated console's own team-queue, which never filters
   * by owner either - see work-queues' design.md).
   */
  async findAllForTenant(
    user: SessionUser,
    filters: ListApplicationsDto,
  ): Promise<StaffApplicationListItem[]> {
    if (
      filters.queue === 'unassigned' &&
      filters.stage &&
      filters.stage !== 'Review'
    ) {
      throw new BadRequestException(
        "The unassigned queue only ever contains Review-stage applications; stage filter must be 'Review' or omitted.",
      );
    }
    let rows: ApplicationEntity[];
    try {
      rows = await this.applications.find({
        where: {
          tenantId: user.tenantId,
          stage:
            filters.queue === 'unassigned'
              ? 'Review'
              : (filters.stage ?? undefined),
          ...(filters.product ? { productCode: filters.product } : {}),
          ...(filters.queue === 'mine' ? { assigneeId: user.sub } : {}),
          ...(filters.queue === 'unassigned' ? { assigneeId: IsNull() } : {}),
        },
        order: { createdAt: 'DESC' },
      });
    } catch (err) {
      this.logger.error(
        'Application list failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }
    return rows.map((r) => ({
      id: r.id,
      productCode: r.productCode,
      amount: r.amount,
      tenor: r.tenor,
      stage: r.stage,
      outcome: r.decision.outcome,
      grade: r.decision.grade,
      assigneeId: r.assigneeId,
    }));
  }

  /**
   * Staff-facing detail. A missing id and one belonging to another tenant
   * get the same NotFoundException, the same anti-enumeration rule `close()`
   * already applies to a borrower's own cross-tenant lookup. A malformed
   * (non-UUID) id gets the same NotFoundException too, checked before the
   * query runs - otherwise Postgres' own "invalid input syntax for type
   * uuid" error would fall into the catch block below and get misreported
   * as a store outage (503), not the 404 a bad id actually is.
   */
  async findOneForTenant(
    tenantId: string,
    id: string,
  ): Promise<StaffApplicationDetail> {
    if (!UUID_RE.test(id)) throw new NotFoundException();
    let application: ApplicationEntity | null;
    let consentRows: ConsentEntity[];
    try {
      application = await this.applications.findOne({ where: { id } });
      consentRows = application
        ? await this.consents.find({
            where: { applicationId: application.id },
          })
        : [];
    } catch (err) {
      this.logger.error(
        'Application detail failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }
    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundException();
    }
    return {
      id: application.id,
      tenantId: application.tenantId,
      borrowerId: application.borrowerId,
      productCode: application.productCode,
      amount: application.amount,
      tenor: application.tenor,
      income: application.income,
      obligations: application.obligations,
      purpose: application.purpose,
      stage: application.stage,
      decision: application.decision,
      createdAt: application.createdAt,
      assigneeId: application.assigneeId,
      consents: consentRows.map((c) => ({
        kind: c.kind,
        capturedAt: c.capturedAt,
        termsVersion: c.termsVersion,
      })),
    };
  }

  /**
   * An approver decides a referred (`Review`-stage) application. Above-
   * authority approvals and missing/invalid decline reason codes are
   * business errors (`{ ok: false }`), not exceptions - the request itself
   * is well-formed, it is just refused, the same pattern `create()` already
   * uses for its own business rules.
   */
  async decide(
    user: SessionUser,
    applicationId: string,
    dto: DecideApplicationDto,
  ): Promise<DecideApplicationResult> {
    if (!UUID_RE.test(applicationId)) throw new NotFoundException();
    let application: ApplicationEntity | null;
    try {
      application = await this.applications.findOne({
        where: { id: applicationId },
      });
    } catch (err) {
      this.logger.error(
        'Application decision failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }
    if (!application || application.tenantId !== user.tenantId) {
      throw new NotFoundException();
    }
    if (application.stage !== 'Review') {
      throw new BadRequestException('Application is not awaiting a decision.');
    }

    if (dto.decision === 'approve') {
      const grade = application.decision.grade;
      if (
        application.amount > APPROVER_AUTHORITY.limit ||
        !grade ||
        !APPROVER_AUTHORITY.grades.includes(grade)
      ) {
        return {
          ok: false,
          error: `This application is above your delegated authority (limit ${formatPeso(APPROVER_AUTHORITY.limit)}, grades ${APPROVER_AUTHORITY.grades.join('–')}).`,
        };
      }
      await this.applyDecision(application.id, {
        stage: 'Offer',
        reviewerId: user.sub,
        declineReasonCode: null,
        decidedAt: new Date(),
      });
      return {
        ok: true,
        stage: 'Offer',
        monthlyPayment: monthlyPayment(
          application.amount,
          application.tenor,
          GRADE_RATE[grade],
        ),
      };
    }

    if (
      !dto.reasonCode ||
      !(DECLINE_REASON_CODES as readonly string[]).includes(dto.reasonCode)
    ) {
      return {
        ok: false,
        error: `Choose a reason: ${DECLINE_REASON_CODES.join(', ')}.`,
      };
    }
    await this.applyDecision(application.id, {
      stage: 'Declined',
      reviewerId: user.sub,
      declineReasonCode: dto.reasonCode,
      decidedAt: new Date(),
    });
    return { ok: true, stage: 'Declined' };
  }

  /**
   * Writes the decision with a conditional `WHERE stage = 'Review'`, not a
   * plain `findOne` + `save()` - the real race-safe enforcement that only
   * one of two concurrent decide requests on the same application can ever
   * win, the same shape `create()`'s partial unique index already gives the
   * duplicate-open-application rule. `affected === 0` means another request
   * already decided it between this method's own read and this write.
   */
  private async applyDecision(
    id: string,
    patch: {
      stage: 'Offer' | 'Declined';
      reviewerId: string;
      declineReasonCode: string | null;
      decidedAt: Date;
    },
  ): Promise<void> {
    const result = await this.applications
      .createQueryBuilder()
      .update(ApplicationEntity)
      .set(patch)
      .where('id = :id AND stage = :stage', { id, stage: 'Review' })
      .execute();
    if (result.affected !== 1) {
      throw new BadRequestException('Application is not awaiting a decision.');
    }
  }

  /**
   * An officer claims an unassigned, Review-stage application from the
   * Unassigned queue. Race-safe the same way `applyDecision()` is: the
   * actual claim is a conditional `UPDATE ... WHERE stage = 'Review' AND
   * assignee_id IS NULL`, not a `findOne` + `save()`, so two officers
   * racing to pick the same case can never both succeed.
   */
  async pick(
    user: SessionUser,
    applicationId: string,
  ): Promise<PickApplicationResult> {
    if (!UUID_RE.test(applicationId)) throw new NotFoundException();
    let application: ApplicationEntity | null;
    try {
      application = await this.applications.findOne({
        where: { id: applicationId },
      });
    } catch (err) {
      this.logger.error(
        'Application pick failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }
    if (!application || application.tenantId !== user.tenantId) {
      throw new NotFoundException();
    }
    if (application.stage !== 'Review') {
      throw new BadRequestException('Application is not awaiting pickup.');
    }
    if (application.assigneeId) {
      return {
        ok: false,
        error: 'This application has already been picked by someone else.',
      };
    }
    const result = await this.applications
      .createQueryBuilder()
      .update(ApplicationEntity)
      .set({ assigneeId: user.sub, assignedAt: new Date() })
      .where('id = :id AND stage = :stage AND assignee_id IS NULL', {
        id: applicationId,
        stage: 'Review',
      })
      .execute();
    if (result.affected !== 1) {
      return {
        ok: false,
        error: 'This application has already been picked by someone else.',
      };
    }
    return { ok: true };
  }
}
