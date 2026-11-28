import { describe, expect, it } from "vitest";
import { formatPeso, fromCentavos, toCentavos } from "../index";

describe("toCentavos", () => {
  it("converts whole and fractional pesos", () => {
    expect(toCentavos(150000)).toBe(15000000);
    expect(toCentavos(250000.5)).toBe(25000050);
  });
  it("rounds half away from zero to the centavo", () => {
    expect(toCentavos(1.005)).toBe(101);
    expect(toCentavos(1000.005)).toBe(100001);
    expect(toCentavos(7706.666666)).toBe(770667);
  });
  it("accepts zero", () => {
    expect(toCentavos(0)).toBe(0);
  });
  it("rejects negative and non-finite input", () => {
    expect(() => toCentavos(-1)).toThrow(RangeError);
    expect(() => toCentavos(Number.NaN)).toThrow(RangeError);
    expect(() => toCentavos(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("fromCentavos", () => {
  it("round-trips", () => {
    expect(fromCentavos(toCentavos(68000))).toBe(68000);
  });
  it("rejects fractional centavos", () => {
    expect(() => fromCentavos(1.5)).toThrow(RangeError);
  });
});

describe("formatPeso", () => {
  it("formats whole pesos by default", () => {
    expect(formatPeso(15000000)).toBe("₱150,000");
    expect(formatPeso(0)).toBe("₱0");
  });
  it("formats two decimals when asked", () => {
    expect(formatPeso(770667, { decimals: 2 })).toBe("₱7,706.67");
    expect(formatPeso(850000, { decimals: 2 })).toBe("₱8,500.00");
  });
  it("rounds to whole pesos", () => {
    expect(formatPeso(150050)).toBe("₱1,501");
  });
});
