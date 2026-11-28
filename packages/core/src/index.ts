/*
 * Kept as a single file with no internal relative imports: apps/api loads
 * this package at runtime (not just type-checks it), and a multi-file split
 * broke under plain Node's own module loader (which, unlike tsc/ts-node,
 * never remaps a `.js` import specifier to a sibling `.ts` file) - the same
 * fix already applied to packages/contracts for the same reason.
 */

/**
 * Money helpers. Amounts are integer centavos (1 peso = 100 centavos) so no
 * monetary value is ever held as a binary float between calculations.
 */

/** Integer centavos. */
export type Centavos = number;

/**
 * Converts a peso amount (as typed or seeded, e.g. 150000 or 250000.5) to
 * integer centavos, rounding half away from zero to the nearest centavo.
 * Throws on NaN, infinities and negative amounts.
 */
export function toCentavos(pesos: number): Centavos {
  if (!Number.isFinite(pesos)) throw new RangeError(`Not a finite amount: ${pesos}`);
  if (pesos < 0) throw new RangeError(`Amount cannot be negative: ${pesos}`);
  // Round the scaled value to 15 significant digits first, which removes the
  // binary representation error (1.005 * 100 = 100.49999…), then to the centavo.
  return Math.round(Number((pesos * 100).toPrecision(15)));
}

/** Converts integer centavos back to pesos, for display maths only. */
export function fromCentavos(centavos: Centavos): number {
  if (!Number.isInteger(centavos)) throw new RangeError(`Centavos must be an integer: ${centavos}`);
  return centavos / 100;
}

export type FormatPesoOptions = {
  /** Fraction digits to show: 0 (default) or 2. */
  decimals?: 0 | 2;
};

const pesoFormatters = {
  0: new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  2: new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
} as const;

/**
 * Formats centavos as pesos with a ₱ sign and thousands separators, e.g.
 * `formatPeso(15000000)` → "₱150,000" and `formatPeso(770667, { decimals: 2 })`
 * → "₱7,706.67". Whole-peso output rounds half away from zero.
 */
export function formatPeso(centavos: Centavos, options: FormatPesoOptions = {}): string {
  const decimals = options.decimals ?? 0;
  const sign = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  const value = decimals === 0 ? Math.round(abs / 100) : abs / 100;
  return `${sign}₱${pesoFormatters[decimals].format(value)}`;
}

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

/**
 * SIMULATED decision pipeline, ported from the prototype's `decide()` and
 * `scoreOf()`. The real pipeline runs in `apps/api` with live bureau data and
 * a trained model. This deterministic stand-in lets the mock layers produce
 * realistic, reproducible outcomes.
 *
 * Order: policy knockouts → score → product decision bands. Every threshold,
 * rule and version comes from the `policy` argument (tenant configuration);
 * nothing is defaulted here.
 */

export type BureauFile = "Full file" | "Thin file" | "No file";

export type DecisionInput = {
  product: string;
  amount: Centavos;
  age: number;
  sanctions: boolean;
  defaulted: boolean;
  bureau: BureauFile;
  /** Years as a customer. */
  years: number;
  /** Debt-to-income ratio, e.g. 0.11 for 11%. */
  dti: number;
  /** Relative gap between declared and verified income, e.g. 0.2. */
  mismatch: number;
  /** False while income is not verified yet. */
  verifiedKnown?: boolean;
  stable: boolean;
  recentMiss?: boolean;
  related?: boolean;
  /** Fixed score for seeded scenarios; bypasses the scorecard. */
  scoreOverride?: number;
};

export type RuleId = "age" | "sanctions" | "default" | "dti" | "mismatch" | "thin" | "limit" | (string & {});

export type CustomCondition = {
  attr: "amount" | "age" | "dti" | "years" | "score";
  op: ">" | "<" | "=";
  /** Compared against the attribute; amounts in pesos, dti in percent. */
  val: number;
};

export type PolicyRule = {
  id: RuleId;
  name: string;
  type: "Knockout" | "Referral trigger";
  active: boolean;
  locked?: boolean;
  /** Debt-to-income cap in percent, for the `dti` rule. */
  param?: number;
  custom?: boolean;
  logic?: "AND" | "OR";
  conds?: CustomCondition[];
};

export type ReferralTriggers = {
  grey: boolean;
  limit: boolean;
  thin: boolean;
  mismatch: boolean;
  dti: boolean;
  related: boolean;
};

export type AutomationMode = "live" | "shadow" | "off";

export type DecisionPolicy = {
  rules: readonly PolicyRule[];
  bands: { approve: number; decline: number };
  triggers: ReferralTriggers;
  /** Auto-approval limit per product, in centavos. */
  autoLimits: Readonly<Record<string, Centavos>>;
  automation: Readonly<Record<string, AutomationMode>>;
  killSwitch: boolean;
  bureauDown: boolean;
  ruleSetVersion: string;
  modelVersion: string;
  /** The tenant's bank name, used in reason text. */
  bankName: string;
};

export type RuleResult = { id: RuleId; name: string; res: "p" | "w" | "f"; val: string };
export type Reason = { t: string; pos: boolean };
export type Outcome = "approve" | "refer" | "decline";
export type Grade = "A" | "B" | "C" | "D" | "E";

export type DecisionRecord = {
  outcome: Outcome;
  score: number | null;
  grade: Grade | null;
  pd: number | null;
  rules: RuleResult[];
  bands: { approve: number; decline: number };
  trigger: string;
  reasons: Reason[];
  ruleSetVersion: string;
  modelVersion: string;
  bureauDown: boolean;
  /** Copy of the inputs used, for reproducibility. */
  inputs: DecisionInput;
};

export function gradeOf(score: number): Grade {
  return score >= 740 ? "A" : score >= 700 ? "B" : score >= 640 ? "C" : score >= 600 ? "D" : "E";
}

/** Probability of default in percent, one decimal place, floor 0.6. */
export function pdOf(score: number): number {
  return Math.max(0.6, Math.round((900 - score) / 9) / 10);
}

/** Simulated scorecard, clamped to 450–820. */
export function scoreOf(x: DecisionInput): number {
  let s = 560;
  s += Math.min(x.years || 0, 8) * 11;
  s += x.bureau === "Full file" ? 45 : x.bureau === "Thin file" ? 5 : -10;
  s += x.dti < 0.25 ? 45 : x.dti < 0.35 ? 25 : x.dti < 0.45 ? 0 : -35;
  s += x.stable ? 30 : 0;
  s -= x.recentMiss ? 40 : 0;
  return Math.max(450, Math.min(820, Math.round(s)));
}

function reasonsOf(x: DecisionInput, autoLimit: Centavos, bankName: string): Reason[] {
  const r: Reason[] = [];
  const years = x.years || 0;
  if (x.stable) r.push({ t: `Stable salary credits to a ${bankName} account`, pos: true });
  if (years >= 3) r.push({ t: `Customer for ${years} years`, pos: true });
  if (x.bureau === "Full file") r.push({ t: "Established credit bureau history", pos: true });
  if (x.bureau === "Thin file") r.push({ t: "Thin bureau file: 1 trade line", pos: false });
  if (x.dti >= 0.4) r.push({ t: `Debt-to-income ${Math.round(x.dti * 100)}% is above 40%`, pos: false });
  else if (x.dti < 0.3) r.push({ t: `Low debt-to-income (${Math.round(x.dti * 100)}%)`, pos: true });
  if (x.mismatch > 0.15) r.push({ t: `Declared income differs from payslip by ${Math.round(x.mismatch * 100)}%`, pos: false });
  if (!x.stable && years > 0) r.push({ t: "Irregular income inflows", pos: false });
  if (x.amount > autoLimit) r.push({ t: `Amount above the ${formatPeso(autoLimit)} auto-approval limit`, pos: false });
  return r.slice(0, 4);
}

/** Runs the simulated pipeline and returns an immutable decision record. */
export function simulateDecision(x: DecisionInput, policy: DecisionPolicy): DecisionRecord {
  const R = policy.rules;
  const rules: RuleResult[] = [];
  const add = (id: RuleId, name: string, res: RuleResult["res"], val: string) => rules.push({ id, name, res, val });
  const on = (id: RuleId) => R.find((r) => r.id === id && r.active) ?? null;
  const autoLimit = policy.autoLimits[x.product];
  if (autoLimit === undefined) throw new RangeError(`No auto-approval limit configured for product ${x.product}`);

  if (on("age")) add("age", "Applicant age 21–65", x.age >= 21 && x.age <= 65 ? "p" : "f", `${x.age} yrs`);
  if (on("sanctions")) add("sanctions", "No sanctions or watchlist match", x.sanctions ? "f" : "p", x.sanctions ? "Match: OFAC SDN list" : "Clear");
  if (on("default")) add("default", "No existing default", x.defaulted ? "f" : "p", x.defaulted ? "1 default" : "None");
  const dtiRule = on("dti");
  if (dtiRule) {
    const cap = dtiRule.param ?? 0;
    add("dti", `Debt-to-income at or below ${cap}%`, x.dti * 100 <= cap ? "p" : "w", `${Math.round(x.dti * 100)}%`);
  }
  if (on("mismatch")) {
    add("mismatch", "Declared vs verified income within 15%", x.mismatch > 0.15 ? "w" : "p", x.verifiedKnown === false ? "Not verified yet" : `${Math.round(x.mismatch * 100)}%`);
  }
  if (on("thin")) add("thin", "Bureau file sufficient", x.bureau === "Full file" ? "p" : "w", x.bureau);
  if (on("limit")) add("limit", "Amount within auto-approval limit", x.amount <= autoLimit ? "p" : "w", `limit ${formatPeso(autoLimit)}`);

  const score = x.scoreOverride ?? scoreOf(x);
  const attr: Record<CustomCondition["attr"], number> = {
    amount: fromCentavos(x.amount),
    age: x.age,
    dti: Math.round(x.dti * 100),
    years: x.years || 0,
    score,
  };
  for (const r of R) {
    if (!r.custom || !r.active || !r.conds?.length) continue;
    const hits = r.conds.map((c) => (c.op === ">" ? attr[c.attr] > c.val : c.op === "<" ? attr[c.attr] < c.val : attr[c.attr] === c.val));
    const hit = r.logic === "AND" ? hits.every(Boolean) : hits.some(Boolean);
    const joiner = r.logic === "AND" ? " and " : " or ";
    add(r.id, r.name, hit ? (r.type === "Knockout" ? "f" : "w") : "p", r.conds.map((c) => `${c.attr} ${c.op} ${c.val}`).join(joiner));
  }

  const knock = rules.find((r) => r.res === "f");
  const T = policy.triggers;
  const trig: string[] = [];
  const warned = (id: RuleId) => rules.some((r) => r.id === id && r.res === "w");
  if (!knock) {
    if (warned("thin") && T.thin) trig.push("Thin bureau file");
    if (warned("mismatch") && T.mismatch) trig.push("Income mismatch");
    if (warned("dti") && T.dti) trig.push("Debt-to-income above cap");
    if (warned("limit") && T.limit) trig.push("Amount above auto-approval limit");
    if (score >= policy.bands.decline && score < policy.bands.approve && T.grey) trig.push("Score in referral band");
    if (x.related && T.related) trig.push("Related-party applicant");
    for (const r of rules) {
      if (r.res === "w" && R.some((q) => q.id === r.id && q.custom)) trig.push(r.name);
    }
  }

  let outcome: Outcome = knock ? "decline" : score < policy.bands.decline ? "decline" : trig.length ? "refer" : "approve";
  const auto = policy.automation[x.product] ?? "off";
  if (policy.bureauDown && !knock) {
    trig.unshift("Credit bureau unavailable: routed to manual review");
    outcome = "refer";
  } else if ((policy.killSwitch || auto !== "live") && !knock) {
    trig.unshift(
      policy.killSwitch
        ? "Kill switch on: all new cases to manual review"
        : `Automation ${auto === "off" ? "off" : "in shadow mode"}: model would ${outcome}`,
    );
    outcome = "refer";
  }

  return Object.freeze({
    outcome,
    score: knock ? null : score,
    grade: knock ? null : gradeOf(score),
    pd: knock ? null : pdOf(score),
    rules,
    bands: { ...policy.bands },
    trigger: knock ? `Policy knockout: ${knock.name}` : trig.join(" · "),
    reasons: knock ? [{ t: "Application does not meet policy requirements", pos: false }] : reasonsOf(x, autoLimit, policy.bankName),
    ruleSetVersion: policy.ruleSetVersion,
    modelVersion: policy.modelVersion,
    bureauDown: policy.bureauDown,
    inputs: { ...x },
  });
}
