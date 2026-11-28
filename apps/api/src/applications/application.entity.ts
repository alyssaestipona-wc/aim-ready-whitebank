import type { DecisionRecord } from '@aim-ready/core';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ApplicationStage =
  | 'Review'
  | 'Info requested'
  | 'Approval'
  | 'Offer'
  | 'Declined'
  | 'Disbursed'
  | 'Withdrawn';

/**
 * The owning officer's recommendation on a `Review`-stage application,
 * written once by `recommend()` and read by `decide()`/`returnToOfficer()` -
 * frozen the same way `decision` is, never edited in place.
 */
export type Recommendation = {
  by: string;
  decision: 'approve' | 'counter' | 'decline';
  amount: number;
  tenor: number;
  reasonCode: string | null;
  overrideLevel: 'above' | 'below' | null;
  note: string | null;
  recommendedAt: string;
};

@Entity({ name: 'applications' })
@Index(['tenantId', 'borrowerId', 'productCode'])
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'borrower_id', type: 'uuid' })
  borrowerId!: string;

  @Column({ name: 'product_code' })
  productCode!: string;

  /** Centavos (integer minor units), per AGENTS.md's money rule. */
  @Column({ type: 'integer' })
  amount!: number;

  @Column()
  tenor!: number;

  @Column({ type: 'integer' })
  income!: number;

  @Column({ type: 'integer' })
  obligations!: number;

  @Column()
  purpose!: string;

  /**
   * Starts from the decision outcome (approve/refer -> Review or Offer,
   * decline -> Declined) and is updated later only by the owning borrower's
   * own `PATCH /applications/:id/close`, when the client's simulated bank
   * progression reaches a terminal stage - the only part of that
   * progression this change needs the server to know about, so the
   * duplicate-open-application check stays correct once a loan finishes.
   */
  @Column({ type: 'varchar' })
  stage!: ApplicationStage;

  /** The full, immutable decision record - frozen at creation, never edited. */
  @Column({ type: 'jsonb' })
  decision!: DecisionRecord;

  /** Set when an approver decides a recommended (`Approval`-stage) application. */
  @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
  reviewerId!: string | null;

  /** Set only on a decline; one of `DECLINE_REASON_CODES`. */
  @Column({ name: 'decline_reason_code', type: 'varchar', nullable: true })
  declineReasonCode!: string | null;

  /** When an approver decided this application (approve or decline). */
  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  /** The officer who claimed this application from the Unassigned queue. */
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId!: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt!: Date | null;

  /**
   * When `stage` last changed - overwritten on every transition (create,
   * decide, request-info, resolve-info). Powers the computed `slaHoursLeft`
   * on reads; `pick()` never touches it since it doesn't change `stage`.
   */
  @Column({ name: 'stage_entered_at', type: 'timestamptz', nullable: true })
  stageEnteredAt!: Date | null;

  /** Set only while in `Info requested`; cleared on resolve. */
  @Column({
    name: 'info_request_items',
    type: 'text',
    array: true,
    nullable: true,
  })
  infoRequestItems!: string[] | null;

  @Column({ name: 'info_request_message', type: 'varchar', nullable: true })
  infoRequestMessage!: string | null;

  /** Set once by `recommend()`; cleared by `returnToOfficer()`; never edited. */
  @Column({ type: 'jsonb', nullable: true })
  recommendation!: Recommendation | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
