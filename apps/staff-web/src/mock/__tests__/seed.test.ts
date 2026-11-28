import { describe, expect, it } from "vitest"

import { seed, SEED_PLAN } from "../seed"

describe("seed", () => {
  const s = seed()

  it("is deterministic", () => {
    expect(JSON.stringify(seed())).toBe(JSON.stringify(s))
  })

  it("holds the named cases plus the seed plan", () => {
    const planned = SEED_PLAN.reduce((n, [, k]) => n + k, 0)
    expect(s.apps).toHaveLength(8 + planned)
  })

  it("matches the per-stage counts of the seed plan", () => {
    const byStage = (st: string) => s.apps.filter((a) => a.stage === st).length
    expect(byStage("Review")).toBe(30 + 12 + 3) // + APP-2041, 2056, 2058
    expect(s.apps.filter((a) => a.stage === "Review" && !a.owner)).toHaveLength(12 + 1) // + APP-2058
    expect(byStage("Info requested")).toBe(10)
    expect(byStage("Approval")).toBe(14 + 1)
    expect(byStage("Offer")).toBe(8)
    expect(byStage("Documentation")).toBe(12)
    expect(byStage("Booking")).toBe(13 + 11 + 1)
    expect(s.apps.filter((a) => a.booking?.status === "failed")).toHaveLength(11 + 1)
    expect(byStage("Pending checker")).toBe(12 + 1)
    expect(byStage("Disbursed")).toBe(30)
    expect(byStage("Declined")).toBe(12 + 1)
    expect(byStage("Withdrawn")).toBe(6)
    expect(byStage("Draft")).toBe(8 + 1)
  })

  it("gives every list more than one page of rows", () => {
    expect(s.audit.length).toBeGreaterThan(10)
    expect(s.drafts.length).toBeGreaterThan(10)
    expect(s.amlCases.length).toBeGreaterThan(10)
    expect(s.cicHist.length).toBeGreaterThan(10)
    expect(s.related.length).toBeGreaterThan(10)
    expect(s.campaigns.length).toBeGreaterThan(10)
    expect(s.apps.filter((a) => a.loanNo).length).toBeGreaterThan(10)
  })

  it("puts a tenant ID on every record", () => {
    expect(s.tenantId).toBe("kalinaw")
    expect(s.apps.every((a) => a.tenantId === "kalinaw")).toBe(true)
    expect(s.audit.every((x) => x.tenantId === "kalinaw")).toBe(true)
    expect(s.drafts.every((x) => x.tenantId === "kalinaw")).toBe(true)
    expect(s.amlCases.every((x) => x.tenantId === "kalinaw")).toBe(true)
  })

  it("stores money as integer centavos", () => {
    const a = s.apps.find((x) => x.id === "APP-2041")
    expect(a?.amount).toBe(18000000)
    expect(a?.aiRec?.amount).toBe(10000000)
    expect(s.apps.every((x) => Number.isInteger(x.amount) && (x.income == null || Number.isInteger(x.income)))).toBe(true)
  })
})
