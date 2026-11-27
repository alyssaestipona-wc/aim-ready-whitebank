import { describe, expect, it } from "vitest";
import { filterList, paginate, rangeText } from "../lib/list";

const rows = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: i % 2 ? "Odd case" : "Even case", stage: i < 10 ? "Review" : "Offer" }));

describe("paginate", () => {
  it("returns the requested page with range text", () => {
    const p = paginate(rows, 2);
    expect(p.rows.map((r) => r.id)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(rangeText(p)).toBe("Showing 11–20 of 45");
  });
  it("returns a partial last page", () => {
    const p = paginate(rows, 5);
    expect(p.rows).toHaveLength(5);
    expect(rangeText(p)).toBe("Showing 41–45 of 45");
  });
  it("clamps out-of-range pages", () => {
    expect(paginate(rows, 99).page).toBe(5);
    expect(paginate(rows, 0).page).toBe(1);
  });
  it("handles an empty list", () => {
    const p = paginate([], 3);
    expect(p).toMatchObject({ page: 1, pageCount: 1, total: 0, from: 0, to: 0, rows: [] });
    expect(rangeText(p)).toBe("");
  });
  it("captions a single page as results", () => {
    expect(rangeText(paginate(rows.slice(0, 1), 1))).toBe("1 result");
    expect(rangeText(paginate(rows.slice(0, 7), 1))).toBe("7 results");
  });
  it("shows first, last and neighbours with gaps", () => {
    expect(paginate(rows, 3, 5).items).toEqual([1, 2, 3, 4, "gap", 9]);
    expect(paginate(rows, 5, 5).items).toEqual([1, "gap", 4, 5, 6, "gap", 9]);
  });
  it("supports custom sizes", () => {
    expect(paginate(rows, 1, 8).rows).toHaveLength(8);
  });
  it("rejects a bad page size", () => {
    expect(() => paginate(rows, 1, 0)).toThrow(RangeError);
  });
});

describe("filterList", () => {
  const stage = { key: "stage", test: (r: (typeof rows)[number], v: string) => r.stage === v };
  it("searches case-insensitively", () => {
    expect(filterList(rows, "  ODD ", (r) => r.name)).toHaveLength(22);
  });
  it("applies filters with values and ignores empty ones", () => {
    expect(filterList(rows, "", (r) => r.name, [stage], { stage: "Review" })).toHaveLength(10);
    expect(filterList(rows, "", (r) => r.name, [stage], { stage: "" })).toHaveLength(45);
  });
});
