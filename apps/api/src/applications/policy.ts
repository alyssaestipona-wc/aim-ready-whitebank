import { toCentavos, type DecisionPolicy } from '@aim-ready/core';

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
