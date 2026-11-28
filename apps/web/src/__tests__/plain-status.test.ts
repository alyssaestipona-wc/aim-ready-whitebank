import { describe, expect, it } from "vitest"

import { plainStatusForStage } from "@/lib/plain-status"

describe("plainStatusForStage", () => {
  it("reads Review as in review, no internal stage name", () => {
    const st = plainStatusForStage("Review", null)
    expect(st.pill[0]).toBe("In review")
    expect(st.h).not.toMatch(/Review/)
  })

  it("reads Approval the same as Review, never showing the word Approval", () => {
    const st = plainStatusForStage("Approval", null)
    expect(st.pill[0]).toBe("In review")
    expect(st.h).not.toMatch(/Approval/)
    expect(st.p).not.toMatch(/Approval/)
  })

  it("states the real limitation for Info requested, with no working action", () => {
    const st = plainStatusForStage("Info requested", null)
    expect(st.pill[0]).toBe("Action needed")
    expect(st.cta).toBeNull()
  })

  it("states the real limitation for Offer, with no accept action", () => {
    const st = plainStatusForStage("Offer", null)
    expect(st.pill[0]).toBe("Approved")
    expect(st.cta).toBeNull()
    expect(st.p).toMatch(/loan officer/)
  })

  it("shows funds released for Disbursed", () => {
    const st = plainStatusForStage("Disbursed", null)
    expect(st.pill[0]).toBe("Funds released")
  })

  it("shows closed for Withdrawn", () => {
    const st = plainStatusForStage("Withdrawn", null)
    expect(st.pill[0]).toBe("Closed")
  })

  it("looks up a borrower-facing phrase for each real decline reason code", () => {
    expect(plainStatusForStage("Declined", "Insufficient verified income").p).toMatch(/verify enough income/)
    expect(plainStatusForStage("Declined", "Debt-to-income above policy").p).toMatch(/repayments are high/)
    expect(plainStatusForStage("Declined", "Unable to verify information").p).toMatch(/couldn't verify some/)
    expect(plainStatusForStage("Declined", "Recent missed payments on other loans").p).toMatch(/missed payments/)
  })

  it("falls back to a generic message for a null or unknown decline reason code", () => {
    expect(plainStatusForStage("Declined", null).p).toBe("Your application doesn't meet our lending requirements right now.")
    expect(plainStatusForStage("Declined", "some-future-code").p).toBe("Your application doesn't meet our lending requirements right now.")
  })
})
