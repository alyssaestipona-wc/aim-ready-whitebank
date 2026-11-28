import { describe, expect, it } from "vitest";
import { aiRecommendation, simulateDecision, toCentavos, type DecisionInput, type DecisionPolicy } from "../index";

// Seeded tenant configuration from the prototype's baseCfg(); tests pass it in
// explicitly because core never defaults policy.
function policy(over: Partial<DecisionPolicy> = {}): DecisionPolicy {
  return {
    rules: [
      { id: "age", name: "Applicant age 21–65", type: "Knockout", active: true, locked: true },
      { id: "sanctions", name: "No sanctions or watchlist match", type: "Knockout", active: true, locked: true },
      { id: "default", name: "No existing default", type: "Knockout", active: true },
      { id: "dti", name: "Debt-to-income cap", type: "Referral trigger", active: true, param: 40 },
      { id: "mismatch", name: "Declared vs verified income within 15%", type: "Referral trigger", active: true },
      { id: "thin", name: "Bureau file sufficient", type: "Referral trigger", active: true },
      { id: "limit", name: "Amount within auto-approval limit", type: "Referral trigger", active: true },
    ],
    bands: { approve: 700, decline: 600 },
    triggers: { grey: true, limit: true, thin: true, mismatch: true, dti: true, related: true },
    autoLimits: { PL: toCentavos(200000), SL: toCentavos(150000) },
    automation: { PL: "live", SL: "live" },
    killSwitch: false,
    bureauDown: false,
    ruleSetVersion: "v4",
    modelVersion: "PL-Score 3.2",
    bankName: "Kalinaw",
    ...over,
  };
}

// Juan Dela Cruz's profile from the prototype's BORROWERS.juan.
const juan: DecisionInput = {
  product: "PL",
  amount: toCentavos(150000),
  age: 36,
  sanctions: false,
  defaulted: false,
  bureau: "Full file",
  years: 2026 - 2019,
  dti: 7500 / 68000,
  mismatch: 0,
  stable: true,
};

describe("simulateDecision", () => {
  it("approves Juan's PL ₱150,000 with score 757, as the prototype does", () => {
    const d = simulateDecision(juan, policy());
    expect(d.outcome).toBe("approve");
    expect(d.score).toBe(757);
    expect(d.grade).toBe("A");
  });

  it("reads bands from policy: approve band 760 refers Juan", () => {
    const d = simulateDecision(juan, policy({ bands: { approve: 760, decline: 600 } }));
    expect(d.outcome).toBe("refer");
    expect(d.trigger).toContain("Score in referral band");
  });

  it("declines on a knockout without scoring", () => {
    const d = simulateDecision({ ...juan, age: 19 }, policy());
    expect(d).toMatchObject({ outcome: "decline", score: null, grade: null, pd: null });
    expect(d.trigger).toBe("Policy knockout: Applicant age 21–65");
  });

  it("declines a sanctions match", () => {
    expect(simulateDecision({ ...juan, sanctions: true }, policy()).outcome).toBe("decline");
  });

  it("declines below the decline band", () => {
    const d = simulateDecision({ ...juan, scoreOverride: 580 }, policy());
    expect(d.outcome).toBe("decline");
  });

  it("auto-approves at or above the approve band with no triggers", () => {
    expect(simulateDecision({ ...juan, scoreOverride: 700 }, policy()).outcome).toBe("approve");
  });

  it.each([
    ["thin file", { bureau: "Thin file" as const }, "Thin bureau file"],
    ["income mismatch", { mismatch: 0.2 }, "Income mismatch"],
    ["debt-to-income", { dti: 0.45 }, "Debt-to-income above cap"],
    ["amount above limit", { amount: toCentavos(250000) }, "Amount above auto-approval limit"],
    ["grey zone", { scoreOverride: 650 }, "Score in referral band"],
    ["related party", { related: true }, "Related-party applicant"],
  ])("refers on %s", (_label, over, trigger) => {
    const d = simulateDecision({ ...juan, ...over }, policy());
    expect(d.outcome).toBe("refer");
    expect(d.trigger).toContain(trigger);
  });

  it("refers everything to manual review with the kill switch on", () => {
    const d = simulateDecision(juan, policy({ killSwitch: true }));
    expect(d.outcome).toBe("refer");
    expect(d.trigger.startsWith("Kill switch on: all new cases to manual review")).toBe(true);
  });

  it("refers when the bureau is down", () => {
    const d = simulateDecision(juan, policy({ bureauDown: true }));
    expect(d.outcome).toBe("refer");
    expect(d.trigger.startsWith("Credit bureau unavailable: routed to manual review")).toBe(true);
    expect(d.bureauDown).toBe(true);
  });

  it("still declines a knockout when the kill switch is on", () => {
    expect(simulateDecision({ ...juan, age: 70 }, policy({ killSwitch: true })).outcome).toBe("decline");
  });

  it("refers when automation is in shadow mode", () => {
    const d = simulateDecision(juan, policy({ automation: { PL: "shadow", SL: "live" } }));
    expect(d.outcome).toBe("refer");
    expect(d.trigger).toContain("Automation in shadow mode: model would approve");
  });

  it("applies custom rules from policy", () => {
    const custom = policy();
    const rules = [...custom.rules, { id: "c1", name: "Large loan, short tenure", type: "Referral trigger" as const, active: true, custom: true, logic: "AND" as const, conds: [{ attr: "amount" as const, op: ">" as const, val: 100000 }, { attr: "years" as const, op: "<" as const, val: 10 }] }];
    const d = simulateDecision(juan, { ...custom, rules });
    expect(d.outcome).toBe("refer");
    expect(d.trigger).toContain("Large loan, short tenure");
  });

  it("echoes versions and inputs and freezes the record", () => {
    const d = simulateDecision(juan, policy({ ruleSetVersion: "v5", modelVersion: "PL-Score 3.3" }));
    expect(d.ruleSetVersion).toBe("v5");
    expect(d.modelVersion).toBe("PL-Score 3.3");
    expect(d.inputs).toEqual(juan);
    expect(Object.isFrozen(d)).toBe(true);
  });

  it("throws when a product has no configured limit", () => {
    expect(() => simulateDecision({ ...juan, product: "HL" }, policy())).toThrow(RangeError);
  });
});

describe("aiRecommendation", () => {
  it("recommends approve at the applied amount when under the income cap", () => {
    const d = simulateDecision(juan, policy({ bands: { approve: 760, decline: 600 } }));
    expect(d.outcome).toBe("refer");
    // income ₱68,000 × 1.9 = ₱129,200 -> floored to ₱120,000; a ₱90,000 request stays under that cap
    const rec = aiRecommendation(d, toCentavos(90000), 24, toCentavos(68000));
    expect(rec).toEqual({ decision: "approve", amount: toCentavos(90000), tenor: 24 });
  });

  it("caps the recommended amount at income × 1.9, rounded down to the nearest ₱10,000", () => {
    const d = simulateDecision(juan, policy({ bands: { approve: 760, decline: 600 } }));
    // income ₱68,000 × 1.9 = ₱129,200 -> floored to ₱120,000
    const rec = aiRecommendation(d, toCentavos(500000), 24, toCentavos(68000));
    expect(rec).toEqual({ decision: "approve", amount: toCentavos(120000), tenor: 24 });
  });

  it("floors the recommended amount at ₱10,000 even for a very low income", () => {
    const d = simulateDecision(juan, policy({ bands: { approve: 760, decline: 600 } }));
    const rec = aiRecommendation(d, toCentavos(150000), 24, toCentavos(1000));
    expect(rec).toEqual({ decision: "approve", amount: toCentavos(10000), tenor: 24 });
  });

  it("returns null for a decline outcome", () => {
    const d = simulateDecision({ ...juan, age: 19 }, policy());
    expect(d.outcome).toBe("decline");
    expect(aiRecommendation(d, toCentavos(150000), 24, toCentavos(68000))).toBeNull();
  });

  it("returns null for an auto-approved outcome - it never reaches a recommend/decide flow", () => {
    const d = simulateDecision(juan, policy());
    expect(d.outcome).toBe("approve");
    expect(aiRecommendation(d, toCentavos(150000), 24, toCentavos(68000))).toBeNull();
  });
});
