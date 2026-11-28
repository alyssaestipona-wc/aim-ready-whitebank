import type { DecisionRecord } from '@aim-ready/core';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ApplicationStage =
  'Review' | 'Offer' | 'Declined' | 'Disbursed' | 'Withdrawn';

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
