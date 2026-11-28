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
  aiRecommendation,
  formatPeso,
  monthlyPayment,
  simulateDecision,
  type AiRecommendation,
  type DecisionInput,
  type DecisionRecord,
  type Grade,
  type Outcome,
} from '@aim-ready/core';

import { BorrowerProfileEntity } from './borrower-profile.entity';
import {
  ApplicationEntity,
  type ApplicationStage,
  type Recommendation,
} from './application.entity';
import { ConsentEntity, type ConsentKind } from './consent.entity';
import { TenantConfigService } from '../tenant-config/tenant-config.service';
import type { CreateApplicationDto } from './dto/create-application.dto';
import type { ListApplicationsDto } from './dto/list-applications.dto';
import type { DecideApplicationDto } from './dto/decide-application.dto';
import type { RequestInfoDto } from './dto/request-info.dto';
import type { RecommendApplicationDto } from './dto/recommend-application.dto';
import {
  PRODUCTS,
  POLICY,
  APPROVER_AUTHORITY,
  DECLINE_REASON_CODES,
  GRADE_RATE,
  OVERRIDE_REASON_CODES,
  OVERRIDE_THRESHOLD,
  SLA_HOURS,
} from './policy';

const TERMS_VERSION = 'v3.2';
const OPEN_STAGES: ApplicationStage[] = [
  'Review',
  'Info requested',
  'Approval',
  'Offer',
];
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
  slaHoursLeft: number | null;
};

export type RequestInfoResult = { ok: true } | { ok: false; error: string };
export type ResolveInfoResult = { ok: true } | { ok: false; error: string };

export type DecideApplicationResult =
  | { ok: true; stage: 'Offer'; monthlyPayment: number }
  | { ok: true; stage: 'Declined' }
  | { ok: false; error: string };

export type PickApplicationResult = { ok: true } | { ok: false; error: string };

export type RecommendApplicationResult =
  | { ok: true; stage: 'Approval'; overrideLevel: 'above' | 'below' | null }
  | { ok: false; error: string };

export type ReturnToOfficerResult = { ok: true } | { ok: false; error: string };

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
  slaHoursLeft: number | null;
  infoRequestItems: string[] | null;
  infoRequestMessage: string | null;
  recommendation: Recommendation | null;
  aiRecommendation: AiRecommendation | null;
  reviewerId: string | null;
  declineReasonCode: string | null;
  decidedAt: Date | null;
  consents: { kind: ConsentKind; capturedAt: Date; termsVersion: string }[];
};

/**
 * Hours left in `stage` against its seeded SLA duration, or `null` when the
 * stage has none (terminal stages) or `stageEnteredAt` is unset (shouldn't
 * happen for a real row, but defensive since the column is nullable).
 * Computed on read, never stored - a persisted value would go stale the
 * instant it's read.
 */
function slaHoursLeft(
  stage: ApplicationStage,
  stageEnteredAt: Date | null,
): number | null {
  const budget = SLA_HOURS[stage];
  if (budget === undefined || !stageEnteredAt) return null;
  const elapsedHours =
    (Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60);
  return Math.round(budget - elapsedHours);
}

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
    private readonly tenantConfig: TenantConfigService,
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
    let cfg: { killSwitch: boolean; bureauDown: boolean };
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
      cfg = await this.tenantConfig.get(user.tenantId);
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
    const decision = simulateDecision(input, {
      ...POLICY,
      killSwitch: cfg.killSwitch,
      bureauDown: cfg.bureauDown,
    });
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
              stageEnteredAt: new Date(),
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
      slaHoursLeft: slaHoursLeft(r.stage, r.stageEnteredAt),
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
      slaHoursLeft: slaHoursLeft(application.stage, application.stageEnteredAt),
      infoRequestItems: application.infoRequestItems,
      infoRequestMessage: application.infoRequestMessage,
      recommendation: application.recommendation,
      aiRecommendation: aiRecommendation(
        application.decision,
        application.amount,
        application.tenor,
        application.income,
      ),
      reviewerId: application.reviewerId,
      declineReasonCode: application.declineReasonCode,
      decidedAt: application.decidedAt,
      consents: consentRows.map((c) => ({
        kind: c.kind,
        capturedAt: c.capturedAt,
        termsVersion: c.termsVersion,
      })),
    };
  }

  /**
   * An approver decides a recommended (`Approval`-stage) application. Above-
   * authority approvals, segregation-of-duties violations, and missing/
   * invalid decline reason codes are business errors (`{ ok: false }`), not
   * exceptions - the request itself is well-formed, it is just refused, the
   * same pattern `create()` already uses for its own business rules.
   * Supersedes the earlier "approver decides a Review-stage application
   * directly" behavior - see design.md's own named risk/mitigation.
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
    const recommendation = application.recommendation;
    if (application.stage !== 'Approval' || !recommendation) {
      throw new BadRequestException('Application is not awaiting a decision.');
    }
    if (recommendation.by === user.sub) {
      return {
        ok: false,
        error:
          'You recommended this case. A different approver must decide it.',
      };
    }

    if (dto.decision === 'approve') {
      const grade = application.decision.grade;
      if (
        recommendation.amount > APPROVER_AUTHORITY.limit ||
        !grade ||
        !APPROVER_AUTHORITY.grades.includes(grade)
      ) {
        return {
          ok: false,
          error: `This application is above your delegated authority (limit ${formatPeso(APPROVER_AUTHORITY.limit)}, grades ${APPROVER_AUTHORITY.grades.join('–')}). Route it to credit committee.`,
        };
      }
      await this.applyDecision(application.id, recommendation.recommendedAt, {
        stage: 'Offer',
        reviewerId: user.sub,
        declineReasonCode: null,
        decidedAt: new Date(),
        stageEnteredAt: new Date(),
      });
      return {
        ok: true,
        stage: 'Offer',
        monthlyPayment: monthlyPayment(
          recommendation.amount,
          recommendation.tenor,
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
    await this.applyDecision(application.id, recommendation.recommendedAt, {
      stage: 'Declined',
      reviewerId: user.sub,
      declineReasonCode: dto.reasonCode,
      decidedAt: new Date(),
      stageEnteredAt: new Date(),
    });
    return { ok: true, stage: 'Declined' };
  }

  /**
   * Writes the decision with a conditional `WHERE stage = 'Approval' AND
   * recommendation ->> 'recommendedAt' = :recommendedAt`, not a plain
   * `findOne` + `save()` - the real race-safe enforcement that only one of
   * two concurrent decide requests on the same application can ever win,
   * the same shape `create()`'s partial unique index already gives the
   * duplicate-open-application rule. Pinning to the exact recommendation
   * read (not just the stage) also closes the narrow window where a
   * `returnToOfficer()` + re-`recommend()` cycle completes between this
   * method's own read and write: the stage alone would still say
   * `'Approval'`, but the recommendation underneath it would have changed.
   * `affected === 0` means either happened - another request already
   * decided it, or the recommendation it was about to decide is stale.
   */
  private async applyDecision(
    id: string,
    recommendedAt: string,
    patch: {
      stage: 'Offer' | 'Declined';
      reviewerId: string;
      declineReasonCode: string | null;
      decidedAt: Date;
      stageEnteredAt: Date;
    },
  ): Promise<void> {
    const result = await this.applications
      .createQueryBuilder()
      .update(ApplicationEntity)
      .set(patch)
      .where(
        "id = :id AND stage = :stage AND recommendation ->> 'recommendedAt' = :recommendedAt",
        { id, stage: 'Approval', recommendedAt },
      )
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

  /**
   * The owning officer recommends a decision on a `Review`-stage
   * application, moving it to `Approval`. Ported from the simulated
   * console's `recommend()`/`overrideLevel()` - see design.md. Race-safe
   * the same way `pick()` is: the actual write is a conditional `UPDATE ...
   * WHERE stage = 'Review' AND assignee_id = :officerId`.
   */
  async recommend(
    user: SessionUser,
    applicationId: string,
    dto: RecommendApplicationDto,
  ): Promise<RecommendApplicationResult> {
    if (!UUID_RE.test(applicationId)) throw new NotFoundException();
    let application: ApplicationEntity | null;
    try {
      application = await this.applications.findOne({
        where: { id: applicationId },
      });
    } catch (err) {
      this.logger.error(
        'Application recommendation failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }
    if (!application || application.tenantId !== user.tenantId) {
      throw new NotFoundException();
    }
    if (application.stage !== 'Review') {
      throw new BadRequestException(
        'Application is not awaiting a recommendation.',
      );
    }
    if (application.assigneeId !== user.sub) {
      return {
        ok: false,
        error: 'Only the owning officer can recommend a decision.',
      };
    }

    const product = PRODUCTS[application.productCode as keyof typeof PRODUCTS];
    let decision = dto.decision;
    let amount =
      dto.amount ?? (decision === 'decline' ? application.amount : NaN);
    let tenor = dto.tenor;
    // Only a counter-offer's amount/tenor actually matter here - "approve"
    // and "decline" are both forced to the application's own amount/tenor
    // below regardless of what was submitted, so there's nothing to bounds-
    // check for them (the application's own amount already passed this same
    // check at submission time, in create()).
    if (decision === 'counter') {
      if (!(amount >= product.min && amount <= product.max)) {
        return {
          ok: false,
          error: `Amount must be between ${formatPeso(product.min)} and ${formatPeso(product.max)}.`,
        };
      }
      if (!(tenor >= product.tenorMin && tenor <= product.tenorMax)) {
        return {
          ok: false,
          error: `Tenor must be ${product.tenorMin} to ${product.tenorMax} months.`,
        };
      }
    }
    if (decision === 'approve' || decision === 'decline') {
      amount = application.amount;
      tenor = application.tenor;
    } else if (
      decision === 'counter' &&
      amount === application.amount &&
      tenor === application.tenor
    ) {
      decision = 'approve';
    }

    const ai = aiRecommendation(
      application.decision,
      application.amount,
      application.tenor,
      application.income,
    );
    const flip = decision === 'decline';
    const differs =
      flip ||
      (decision !== 'decline' &&
        (!ai || amount !== ai.amount || tenor !== ai.tenor));
    const gap = ai ? Math.abs(amount - ai.amount) : 0;
    const overrideLevel: 'above' | 'below' | null = differs
      ? flip || gap >= OVERRIDE_THRESHOLD
        ? 'above'
        : 'below'
      : null;
    if (
      differs &&
      (!dto.reasonCode ||
        !(OVERRIDE_REASON_CODES as readonly string[]).includes(dto.reasonCode))
    ) {
      return {
        ok: false,
        error: `This differs from the AI recommendation. Choose a reason: ${OVERRIDE_REASON_CODES.join(', ')}.`,
      };
    }

    const recommendation: Recommendation = {
      by: user.sub,
      decision,
      amount,
      tenor,
      reasonCode: differs ? (dto.reasonCode ?? null) : null,
      overrideLevel,
      note: dto.note ?? null,
      recommendedAt: new Date().toISOString(),
    };
    const result = await this.applications
      .createQueryBuilder()
      .update(ApplicationEntity)
      .set({
        recommendation,
        stage: 'Approval',
        assigneeId: null,
        stageEnteredAt: new Date(),
      })
      .where('id = :id AND stage = :stage AND assignee_id = :officerId', {
        id: applicationId,
        stage: 'Review',
        officerId: user.sub,
      })
      .execute();
    if (result.affected !== 1) {
      return {
        ok: false,
        error: 'Application is not awaiting a recommendation.',
      };
    }
    return { ok: true, stage: 'Approval', overrideLevel };
  }

  /**
   * An approver sends an `Approval`-stage application back to the officer
   * who recommended it, clearing the recommendation. Race-safe the same way
   * every other stage transition here is.
   */
  async returnToOfficer(
    user: SessionUser,
    applicationId: string,
  ): Promise<ReturnToOfficerResult> {
    if (!UUID_RE.test(applicationId)) throw new NotFoundException();
    let application: ApplicationEntity | null;
    try {
      application = await this.applications.findOne({
        where: { id: applicationId },
      });
    } catch (err) {
      this.logger.error(
        'Application return failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }
    if (!application || application.tenantId !== user.tenantId) {
      throw new NotFoundException();
    }
    if (application.stage !== 'Approval' || !application.recommendation) {
      throw new BadRequestException('Application is not in Approval.');
    }
    const officerId = application.recommendation.by;
    const result = await this.applications
      .createQueryBuilder()
      .update(ApplicationEntity)
      .set({
        stage: 'Review',
        assigneeId: officerId,
        recommendation: null,
        stageEnteredAt: new Date(),
      })
      .where('id = :id AND stage = :stage', {
        id: applicationId,
        stage: 'Approval',
      })
      .execute();
    if (result.affected !== 1) {
      return { ok: false, error: 'Application is not in Approval.' };
    }
    return { ok: true };
  }

  /**
   * An officer pauses a `Review`-stage application on the borrower,
   * recording a checklist and message. Race-safe the same way `pick()` and
   * `applyDecision()` are: the stage change is a conditional `UPDATE ...
   * WHERE stage = 'Review'`, not a `findOne` + `save()`.
   */
  async requestInfo(
    user: SessionUser,
    applicationId: string,
    dto: RequestInfoDto,
  ): Promise<RequestInfoResult> {
    if (!UUID_RE.test(applicationId)) throw new NotFoundException();
    let application: ApplicationEntity | null;
    try {
      application = await this.applications.findOne({
        where: { id: applicationId },
      });
    } catch (err) {
      this.logger.error(
        'Application info request failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }
    if (!application || application.tenantId !== user.tenantId) {
      throw new NotFoundException();
    }
    if (application.stage !== 'Review') {
      throw new BadRequestException(
        'Application is not awaiting review, so information cannot be requested.',
      );
    }
    const result = await this.applications
      .createQueryBuilder()
      .update(ApplicationEntity)
      .set({
        stage: 'Info requested',
        infoRequestItems: dto.items,
        infoRequestMessage: dto.message,
        stageEnteredAt: new Date(),
      })
      .where('id = :id AND stage = :stage', {
        id: applicationId,
        stage: 'Review',
      })
      .execute();
    if (result.affected !== 1) {
      return {
        ok: false,
        error:
          'Application is not awaiting review, so information cannot be requested.',
      };
    }
    return { ok: true };
  }

  /**
   * An officer marks an `Info requested` application resolved, returning it
   * to `Review` - a manual stand-in for a real borrower response, since
   * document upload doesn't exist yet (see design.md's non-goals).
   */
  async resolveInfo(
    user: SessionUser,
    applicationId: string,
  ): Promise<ResolveInfoResult> {
    if (!UUID_RE.test(applicationId)) throw new NotFoundException();
    let application: ApplicationEntity | null;
    try {
      application = await this.applications.findOne({
        where: { id: applicationId },
      });
    } catch (err) {
      this.logger.error(
        'Application info resolve failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('application_service_unavailable');
    }
    if (!application || application.tenantId !== user.tenantId) {
      throw new NotFoundException();
    }
    if (application.stage !== 'Info requested') {
      throw new BadRequestException('Application is not awaiting information.');
    }
    const result = await this.applications
      .createQueryBuilder()
      .update(ApplicationEntity)
      .set({
        stage: 'Review',
        infoRequestItems: null,
        infoRequestMessage: null,
        stageEnteredAt: new Date(),
      })
      .where('id = :id AND stage = :stage', {
        id: applicationId,
        stage: 'Info requested',
      })
      .execute();
    if (result.affected !== 1) {
      return {
        ok: false,
        error: 'Application is not awaiting information.',
      };
    }
    return { ok: true };
  }
}
