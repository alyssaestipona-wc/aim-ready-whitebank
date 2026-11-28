import { describe, expect, it } from "vitest";
import { disclosure, effectiveRate, monthlyPayment, toCentavos } from "../index";

// Expected figures come from the prototype's terms() for the same inputs.
describe("disclosure", () => {
  it("matches the prototype for PL ₱150,000 / 24 months / grade C (1.5%, 2% fee)", () => {
    const d = disclosure({ principal: toCentavos(150000), months: 24, monthlyAddOnRatePct: 1.5, feeRate: 0.02 });
    expect(d.monthlyPayment).toBe(toCentavos(8500));
    expect(d.lastPayment).toBe(toCentavos(8500));
    expect(d.fee).toBe(toCentavos(3000));
    expect(d.netProceeds).toBe(toCentavos(147000));
    expect(d.totalOfPayments).toBe(toCentavos(204000));
    expect(d.financeCharge).toBe(toCentavos(57000));
    expect(d.effectiveRatePct.toFixed(2)).toBe("39.39");
  });

  it("matches the prototype for SL ₱80,000 / 12 months / grade B (1.3%, 1.5% fee)", () => {
    const d = disclosure({ principal: toCentavos(80000), months: 12, monthlyAddOnRatePct: 1.3, feeRate: 0.015 });
    expect(d.monthlyPayment).toBe(770667);
    expect(d.totalOfPayments).toBe(toCentavos(92480));
    expect(d.lastPayment).toBe(toCentavos(92480) - 770667 * 11);
    expect(d.fee).toBe(toCentavos(1200));
    expect(d.netProceeds).toBe(toCentavos(78800));
    expect(d.financeCharge).toBe(toCentavos(13680));
    expect(d.effectiveRatePct.toFixed(2)).toBe("35.33");
  });

  it("rejects a zero or negative term", () => {
    expect(() => disclosure({ principal: 100, months: 0, monthlyAddOnRatePct: 1.5, feeRate: 0.02 })).toThrow(RangeError);
    expect(() => disclosure({ principal: 100, months: -6, monthlyAddOnRatePct: 1.5, feeRate: 0.02 })).toThrow(RangeError);
  });

  it("rejects a non-positive principal", () => {
    expect(() => disclosure({ principal: 0, months: 12, monthlyAddOnRatePct: 1.5, feeRate: 0.02 })).toThrow(RangeError);
  });
});

describe("monthlyPayment", () => {
  it("rounds half-up to the centavo", () => {
    expect(monthlyPayment(toCentavos(80000), 12, 1.3)).toBe(770667);
  });
});

describe("effectiveRate", () => {
  it("rejects non-positive proceeds", () => {
    expect(() => effectiveRate(0, 100, 12)).toThrow(RangeError);
  });
});
