import { describe, expect, it } from "vitest"

import {
  blankAssisted,
  canCheckBooking,
  checkBooking,
  findApp,
  generateDocs,
  getState,
  hrsLeft,
  pickCase,
  recommend,
  requestInfo,
  retryBooking,
  setSessionRole,
  startApproval,
  approve,
  submitAssisted,
  submitBooking,
  validateAssisted,
  type AssistedDraft,
} from "@/mock"
import { update } from "@/mock/store"

import { setup } from "./helpers"

const lastHist = (id: string) => findApp(getState(), id)!.hist.at(-1)!.what

describe("queues", () => {
  it("picking an unassigned case makes the officer owner and records it", async () => {
    setup("officer")
    const un = getState().apps.find((a) => a.stage === "Review" && !a.owner)!
    const r = await pickCase(un.id)
    expect(r).toMatchObject({ ok: true, toast: `${un.name} is now in your queue` })
    expect(findApp(getState(), un.id)!.owner).toBe("Miguel Ramos")
    expect(lastHist(un.id)).toBe("Picked from the unassigned queue")
  })

  it("uses singular wording for one hour left", () => {
    expect(hrsLeft(1)).toBe("1 hour left")
    expect(hrsLeft(0)).toBe("under 1 hour left")
    expect(hrsLeft(5)).toBe("5 hours left")
  })
})

describe("officer review", () => {
  it("refuses a request with no items and leaves the case unchanged", async () => {
    setup("officer")
    const r = await requestInfo("APP-2041", { items: [], message: "", due: "In 3 days (30 Nov)" })
    expect(r).toEqual({ ok: false, error: "Pick at least one item to request.", asToast: false, tone: "bad" })
    expect(findApp(getState(), "APP-2041")!.stage).toBe("Review")
  })

  it("moves the case to Info requested with the item missing", async () => {
    setup("officer")
    await requestInfo("APP-2041", { items: ["Bank statements, 3 months"], message: "Hi", due: "In 3 days (30 Nov)" })
    const a = findApp(getState(), "APP-2041")!
    expect(a.stage).toBe("Info requested")
    expect(a.docs).toContainEqual(["Bank statements, 3 months", "Missing"])
  })

  it("requires a reason code for an override", async () => {
    setup("officer")
    const r = await recommend("APP-2041", { decision: "counter", amount: 9000000, tenor: 24, reason: "", note: "" })
    expect(r).toMatchObject({ ok: false, error: "This differs from the AI recommendation. Choose a reason code." })
  })

  it("flags an override ₱50,000 or more from the AI as above threshold", async () => {
    setup("officer")
    // AI recommends ₱180,000 on APP-2056; ₱120,000 is ₱60,000 away.
    const r = await recommend("APP-2056", { decision: "counter", amount: 12000000, tenor: 36, reason: "Lower amount keeps repayments affordable", note: "x" })
    expect(r.ok).toBe(true)
    const a = findApp(getState(), "APP-2056")!
    expect(a.stage).toBe("Approval")
    expect(a.recommendation).toMatchObject({ overLevel: "above", reason: "Lower amount keeps repayments affordable" })
    expect(lastHist("APP-2056")).toContain("override (above ₱50,000 threshold)")
  })

  it("rejects an amount outside product limits", async () => {
    setup("officer")
    const r = await recommend("APP-2041", { decision: "counter", amount: 100, tenor: 24, reason: "x", note: "" })
    expect(r).toMatchObject({ ok: false, error: "Amount must be between ₱20,000 and ₱500,000." })
  })
})

describe("approver", () => {
  it("refuses approving your own recommendation and records the block", async () => {
    setup("approver")
    update((s) => {
      findApp(s, "APP-2043")!.recommendation!.by = "Teresa Lim"
    })
    const r = await startApproval("APP-2043")
    expect(r).toMatchObject({ ok: false, error: "You recommended this case. A different approver must decide it." })
    expect(lastHist("APP-2043")).toBe("Blocked: tried to approve own recommendation (segregation of duties)")
  })

  it("routes above-authority cases to committee", async () => {
    setup("approver")
    update((s) => {
      findApp(s, "APP-2043")!.recommendation!.amount = 120000000
    })
    expect(await startApproval("APP-2043")).toMatchObject({ ok: true, next: "committee" })
  })

  it("keeps the automated outcome when an approver declines", async () => {
    setup("approver")
    const { declineCase } = await import("@/mock")
    await declineCase("APP-2043", "Insufficient verified income")
    const a = findApp(getState(), "APP-2043")!
    expect(a.stage).toBe("Declined")
    expect(a.outcome).toBe("refer")
  })

  it("approves within authority and sends the offer", async () => {
    setup("approver")
    expect(await startApproval("APP-2043")).toMatchObject({ ok: true, next: "confirm" })
    const r = await approve("APP-2043")
    expect(r).toMatchObject({ ok: true, toast: "Approved. Offer sent to the borrower." })
    const a = findApp(getState(), "APP-2043")!
    expect(a.stage).toBe("Offer")
    expect(a.offer).toEqual({ amount: 12000000, tenor: 24, grade: "C" })
  })
})

const goodDraft = (over: Partial<AssistedDraft> = {}): AssistedDraft => ({
  ...blankAssisted(),
  cif: "CIF-0051907", name: "Rico Manalo", age: "29", employer: "Northwind Retail Corp.", amount: 10000000, tenor: 24, income: 4200000, obligations: 350000, c1: true, c2: true, c3: true, scans: { id: true },
  ...over,
})

describe("assisted application", () => {
  it("reports missing required fields with the prototype's copy", () => {
    setup("branch")
    const e = validateAssisted(goodDraft({ amount: null, name: "", c3: false }))
    expect(e.amount).toBe("Amount must be between ₱20,000 and ₱500,000.")
    expect(e.name).toBe("Enter the customer’s full name.")
    expect(e.consent).toBe("All three consents are required before submitting.")
  })

  it("routes to manual review when the kill switch is on", async () => {
    setup("branch")
    update((s) => {
      s.cfg.killSwitch = true
    })
    const r = await submitAssisted(goodDraft(), null)
    const id = r.ok ? r.go!.split("/").pop()! : ""
    const a = findApp(getState(), id)!
    expect(a.stage).toBe("Review")
    expect(a.trigger).toMatch(/^Kill switch on: all new cases to manual review/)
  })

  it("routes to manual review during a bureau outage", async () => {
    setup("branch")
    update((s) => {
      s.cfg.bureauDown = true
    })
    const r = await submitAssisted(goodDraft(), null)
    const a = findApp(getState(), r.ok ? r.go!.split("/").pop()! : "")!
    expect(a.stage).toBe("Review")
    expect(a.trigger).toMatch(/^Credit bureau unavailable/)
  })

  it("stores an immutable decision record that later actions do not change", async () => {
    setup("branch")
    const r = await submitAssisted(goodDraft({ amount: 25000000 }), null) // above the ₱200,000 auto-limit → refer
    const id = r.ok ? r.go!.split("/").pop()! : ""
    const before = structuredClone(findApp(getState(), id)!.decision)
    expect(before).toMatchObject({ outcome: "refer", ruleSetVersion: "v4", modelVersion: "PL-Score 3.2" })
    expect(before!.inputs.amount).toBe(25000000)
    const rec = findApp(getState(), id)!.hist.find((h) => h.what.startsWith("Decision record stored"))!
    expect(rec.what).toContain("rule set v4 · model PL-Score 3.2 · inputs amount ₱250,000")
    setSessionRole("officer")
    await recommend(id, { decision: "counter", amount: 15000000, tenor: 24, reason: "Lower amount keeps repayments affordable", note: "" })
    setSessionRole("approver")
    await approve(id)
    expect(findApp(getState(), id)!.decision).toEqual(before)
  })
})

describe("closing and booking", () => {
  it("generating documents sends them for signature", async () => {
    setup("ops")
    const a = getState().apps.find((x) => x.stage === "Documentation" && x.borrowerPending !== "sign")!
    await generateDocs(a.id)
    expect(findApp(getState(), a.id)!.borrowerPending).toBe("sign")
  })

  it("blocks a duplicate booking submit", async () => {
    setup("ops")
    const a = getState().apps.find((x) => x.stage === "Booking" && x.booking?.status !== "failed")!
    expect((await submitBooking(a.id)).ok).toBe(true)
    expect(await submitBooking(a.id)).toMatchObject({ ok: false, error: "Already submitted. Duplicate blocked." })
  })

  it("refuses the maker as checker and records it", async () => {
    setup("opssup")
    update((s) => {
      findApp(s, "APP-2054")!.booking!.maker = "Celine Uy"
    })
    expect(await canCheckBooking("APP-2054")).toMatchObject({ ok: false, error: "You prepared this booking; a different person must approve it." })
    expect(lastHist("APP-2054")).toBe("Blocked: maker tried to check their own booking")
  })

  it("refuses a checker who is not a supervisor", async () => {
    // Paolo Reyes (ops) made every seeded booking, so use another role here.
    setup("officer")
    expect(await canCheckBooking("APP-2054")).toMatchObject({ ok: false, error: "Only a loan operations supervisor can check bookings." })
  })

  it("books with a loan number when the supervisor approves", async () => {
    setup("opssup")
    expect((await canCheckBooking("APP-2054")).ok).toBe(true)
    const r = await checkBooking("APP-2054")
    const a = findApp(getState(), "APP-2054")!
    expect(a.stage).toBe("Disbursed")
    expect(a.loanNo).toMatch(/^LN-2026-\d+$/)
    expect(r).toMatchObject({ ok: true, toast: `Booked ${a.loanNo}. Funds released.` })
  })

  it("moves a core timeout to exceptions and retries with the same key", async () => {
    setup("opssup")
    update((s) => {
      s.cfg.coreFailNext = true
    })
    const key = findApp(getState(), "APP-2054")!.booking!.key
    expect(await checkBooking("APP-2054")).toMatchObject({ ok: true, toast: "Core timed out. Moved to booking exceptions.", tone: "bad" })
    let a = findApp(getState(), "APP-2054")!
    expect(a.booking).toMatchObject({ status: "failed", key })
    expect(getState().cfg.coreFailNext).toBe(false)
    setSessionRole("ops")
    await retryBooking("APP-2054")
    a = findApp(getState(), "APP-2054")!
    expect(a.stage).toBe("Disbursed")
    expect(a.booking!.key).toBe(key)
    // A second retry cannot mint another loan under the same key.
    const loanNo = a.loanNo
    expect(await retryBooking("APP-2054")).toMatchObject({ ok: false })
    expect(findApp(getState(), "APP-2054")!.loanNo).toBe(loanNo)
    expect(a.hist.some((h) => h.what === `Retried booking with the same idempotency key ${key}`)).toBe(true)
  })
})

describe("intake", () => {
  it("refuses a tenor outside the product's range", async () => {
    setup("officer")
    const { submitIntakeDraft } = await import("@/mock")
    const idx = getState().drafts.findIndex((d) => d.status === "Draft")
    const r = await submitIntakeDraft(idx, { amount: 5000000, tenor: 0, govId: "PSN-1", consent: true })
    expect(r).toMatchObject({ ok: false })
    expect(getState().drafts[idx]!.status).toBe("Draft")
  })
})

describe("code review hardening", () => {
  it("approve() itself refuses the recommender and a case not in Approval", async () => {
    setup("approver")
    const { approve: approveCase } = await import("@/mock")
    update((s) => {
      findApp(s, "APP-2043")!.recommendation!.by = "Teresa Lim"
    })
    expect(await approveCase("APP-2043")).toMatchObject({ ok: false })
    expect(await approveCase("APP-2041")).toMatchObject({ ok: false })
    expect(findApp(getState(), "APP-2043")!.stage).toBe("Approval")
  })

  it("a recommended decline asks for confirmation before declining", async () => {
    setup("officer")
    await recommend("APP-2041", { decision: "decline", amount: null, tenor: 24, reason: "Risk higher than the score suggests", note: "" })
    expect(findApp(getState(), "APP-2041")!.recommendation!.amount).toBe(findApp(getState(), "APP-2041")!.amount)
    setSessionRole("approver")
    expect(await startApproval("APP-2041")).toMatchObject({ ok: true, next: "confirm-decline" })
    expect(findApp(getState(), "APP-2041")!.stage).toBe("Approval")
    const { confirmDecline } = await import("@/mock")
    expect(await confirmDecline("APP-2041")).toMatchObject({ ok: true, toast: "Declined. Borrower notified." })
    expect(findApp(getState(), "APP-2041")!.stage).toBe("Declined")
  })

  it("actions refuse to run without a session", async () => {
    setup(null)
    expect(await pickCase("APP-2058")).toMatchObject({ ok: false, error: "Your session has ended. Sign in again." })
  })
})
