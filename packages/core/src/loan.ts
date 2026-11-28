import type { Centavos } from "./money";

/**
 * Loan term maths, ported from the prototype's `monthly()`, `terms()` and
 * `eir()`. The product prices loans with a flat monthly add-on rate per risk
 * grade (configured in the tenant pricing grid), so:
 *
 *   monthly payment = principal × (1 / months + addOnRate)
 *   total of payments = principal × (1 + addOnRate × months)
 *   finance charge = total of payments − principal + processing fee
 *
 * Rounding: every money result is integer centavos.
 * - The monthly payment is rounded half-up to the centavo.
 * - The total of payments is computed from the closed form above and rounded
 *   once, so it matches the prototype to the centavo.
 * - The last instalment absorbs the difference: total − monthly × (months − 1).
 * - The processing fee is rounded to the whole peso, as the prototype does.
 *
 * In production these figures come from core banking's calculation APIs. This
 * module is the simulated stand-in the mock layers call.
 */

export type LoanTermsInput = {
  /** Amount financed, in centavos. */
  principal: Centavos;
  /** Term in whole months. */
  months: number;
  /** Flat monthly add-on rate as a percentage, e.g. 1.5 for grade C. */
  monthlyAddOnRatePct: number;
  /** Processing fee as a fraction of principal, e.g. 0.02. */
  feeRate: number;
};

export type Disclosure = {
  principal: Centavos;
  months: number;
  monthlyPayment: Centavos;
  lastPayment: Centavos;
  fee: Centavos;
  netProceeds: Centavos;
  totalOfPayments: Centavos;
  financeCharge: Centavos;
  /** Effective annual interest rate, percent, unrounded (display to 2 dp). */
  effectiveRatePct: number;
};

function assertTerms(principal: number, months: number): void {
  if (!Number.isInteger(principal) || principal <= 0) throw new RangeError(`Principal must be positive centavos: ${principal}`);
  if (!Number.isInteger(months) || months <= 0) throw new RangeError(`Term must be a positive whole number of months: ${months}`);
}

/** Unrounded monthly payment in centavos. Internal: used for the EIR. */
function exactMonthly(principal: Centavos, months: number, ratePct: number): number {
  return principal * (1 / months + ratePct / 100);
}

/** Monthly payment in centavos, rounded half-up. */
export function monthlyPayment(principal: Centavos, months: number, monthlyAddOnRatePct: number): Centavos {
  assertTerms(principal, months);
  return Math.round(exactMonthly(principal, months, monthlyAddOnRatePct));
}

/**
 * Effective annual interest rate, in percent. Bisection on the monthly rate m
 * that solves  netProceeds = payment × (1 − (1 + m)^−n) / m,  then annualised
 * as (1 + m)^12 − 1. Ported from the prototype's `eir()` (60 iterations over
 * 0–20% a month).
 */
export function effectiveRate(netProceeds: number, payment: number, months: number): number {
  if (!(netProceeds > 0) || !(payment > 0)) throw new RangeError("Proceeds and payment must be positive");
  assertTerms(1, months);
  let lo = 0;
  let hi = 0.2;
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2;
    const pv = (payment * (1 - Math.pow(1 + m, -months))) / m;
    if (pv > netProceeds) lo = m;
    else hi = m;
  }
  return (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100;
}

/** Full Truth in Lending disclosure for one set of terms. */
export function disclosure(input: LoanTermsInput): Disclosure {
  const { principal, months, monthlyAddOnRatePct, feeRate } = input;
  assertTerms(principal, months);
  if (!(feeRate >= 0)) throw new RangeError(`Fee rate cannot be negative: ${feeRate}`);
  const exact = exactMonthly(principal, months, monthlyAddOnRatePct);
  const monthly = Math.round(exact);
  const total = Math.round(principal * (1 + (monthlyAddOnRatePct / 100) * months));
  const fee = Math.round((principal * feeRate) / 100) * 100;
  const netProceeds = principal - fee;
  return {
    principal,
    months,
    monthlyPayment: monthly,
    lastPayment: total - monthly * (months - 1),
    fee,
    netProceeds,
    totalOfPayments: total,
    financeCharge: total - principal + fee,
    effectiveRatePct: effectiveRate(netProceeds, exact, months),
  };
}
