import { toCentavos, type DecisionPolicy, type Grade } from '@aim-ready/core';

export type ProductCode = 'PL' | 'SL';

export type Product = {
  code: ProductCode;
  name: string;
  min: number;
  max: number;
  tenorMin: number;
  tenorMax: number;
  feeRate: number;
};

/**
 * Tenant configuration (Kalinaw Bank), lifted verbatim from
 * `apps/web/src/mock/config.ts`'s `PRODUCTS`/`POLICY` - the same values,
 * not invented. Moving them into tenant-editable configuration is Epic
 * 12/13's own future change (see design.md's non-goals); for now this is
 * the one seeded source of truth the real decision pipeline reads, and
 * `apps/web`'s own copy stays for its client-side estimate only.
 */
export const PRODUCTS: Record<ProductCode, Product> = {
  PL: {
    code: 'PL',
    name: 'Personal loan',
    min: toCentavos(20000),
    max: toCentavos(500000),
    tenorMin: 6,
    tenorMax: 36,
    feeRate: 0.02,
  },
  SL: {
    code: 'SL',
    name: 'Salary loan',
    min: toCentavos(10000),
    max: toCentavos(300000),
    tenorMin: 6,
    tenorMax: 24,
    feeRate: 0.015,
  },
};

export const POLICY: DecisionPolicy = {
  rules: [
    {
      id: 'age',
      name: 'Applicant age 21–65',
      type: 'Knockout',
      active: true,
      locked: true,
    },
    {
      id: 'sanctions',
      name: 'No sanctions or watchlist match',
      type: 'Knockout',
      active: true,
      locked: true,
    },
    {
      id: 'default',
      name: 'No existing default',
      type: 'Knockout',
      active: true,
    },
    {
      id: 'dti',
      name: 'Debt-to-income cap',
      type: 'Referral trigger',
      active: true,
      param: 40,
    },
    {
      id: 'mismatch',
      name: 'Declared vs verified income within 15%',
      type: 'Referral trigger',
      active: true,
    },
    {
      id: 'thin',
      name: 'Bureau file sufficient',
      type: 'Referral trigger',
      active: true,
    },
    {
      id: 'limit',
      name: 'Amount within auto-approval limit',
      type: 'Referral trigger',
      active: true,
    },
  ],
  bands: { approve: 700, decline: 600 },
  triggers: {
    grey: true,
    limit: true,
    thin: true,
    mismatch: true,
    dti: true,
    related: true,
  },
  autoLimits: { PL: toCentavos(200000), SL: toCentavos(150000) },
  automation: { PL: 'live', SL: 'live' },
  killSwitch: false,
  bureauDown: false,
  ruleSetVersion: 'v4',
  modelVersion: 'PL-Score 3.2',
  bankName: 'Kalinaw',
};

/**
 * The single seeded approver authority profile, lifted verbatim from
 * `apps/backoffice/src/mock/constants.ts`'s `USERS.approver` (the only
 * delegated-authority check that already exists, informally, in this
 * codebase's simulated approve-case handler). A real, tenant-configurable,
 * multi-level approval matrix is the Configuration epic's own future scope
 * (see staff-decisioning-actions' design.md non-goals) - this is the one
 * seeded source of truth the real decide pipeline reads for now.
 */
export const APPROVER_AUTHORITY: { limit: number; grades: Grade[] } = {
  limit: toCentavos(1000000),
  grades: ['A', 'B', 'C'],
};

/** Lifted verbatim from `apps/backoffice/src/mock/constants.ts`'s `DECLINE_CODES`. */
export const DECLINE_REASON_CODES = [
  'Insufficient verified income',
  'Debt-to-income above policy',
  'Unable to verify information',
  'Recent missed payments on other loans',
] as const;

/** Lifted verbatim from `apps/backoffice/src/mock/constants.ts`'s `GRADE_RATE`. */
export const GRADE_RATE: Record<Grade, number> = {
  A: 1.1,
  B: 1.3,
  C: 1.5,
  D: 1.7,
  E: 1.9,
};
