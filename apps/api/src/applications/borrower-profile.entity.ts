import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { BureauFile } from '@aim-ready/core';

/**
 * Decision-pipeline inputs that aren't collected on the apply form and so
 * come from the borrower's own seeded record instead - sourced from the
 * authenticated session, never trusted from client input (closing a gap
 * the old client-side pipeline always had: it read these from its own
 * local fixture, which a user could never tamper with via the form, but a
 * real server must source them itself rather than accept them in the
 * request body).
 */
@Entity({ name: 'borrower_profiles' })
export class BorrowerProfileEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column()
  age!: number;

  @Column({ type: 'varchar' })
  bureau!: BureauFile;

  @Column({ name: 'years_as_customer' })
  yearsAsCustomer!: number;

  @Column()
  stable!: boolean;

  @Column({ default: false })
  sanctions!: boolean;

  @Column({ default: false })
  defaulted!: boolean;
}
