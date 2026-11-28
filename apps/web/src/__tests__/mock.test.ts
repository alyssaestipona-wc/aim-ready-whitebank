import { toCentavos } from "@aim-ready/core"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createActions } from "@/mock/actions"
import { BANK_STEP_MS } from "@/mock/config"
import { myApp, plainStatus } from "@/mock/selectors"
import { browserStorage, createStore, memoryStorage, STORAGE_KEY } from "@/mock/store"
import { form } from "@/test/utils"

function harness(storage = memoryStorage()) {
  let t = 1_000_000
  const store = createStore(storage)
  const actions = createActions(store, { now: () => t, wait: async () => {} })
  return { store, actions, storage, tick: (ms: number) => (t += ms), now: () => t }
}

beforeEach(() => {
  document.cookie = "wbl_borrower_session=; path=/; max-age=0"
})

describe("store", () => {
  it("persists across store re-creation", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form())
    const again = createStore(h.storage)
    expect(again.getState().apps).toHaveLength(1)
    expect(again.getState().session).toBe("juan")
    expect(h.storage.getItem(STORAGE_KEY)).toContain("APP-4301")
  })

  it("resets to the seed", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form())
    h.store.reset()
    expect(h.store.getState()).toMatchObject({ apps: [], session: null, seq: 1300, tenantId: "kalinaw" })
  })

  it("falls back to memory when localStorage throws", () => {
    const spy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked")
    })
    try {
      const s = browserStorage()
      s.setItem("k", "v")
      expect(s.getItem("k")).toBe("v")
      const store = createStore(s)
      store.update((d) => {
        d.session = "juan"
      })
      expect(store.getState().session).toBe("juan")
    } finally {
      spy.mockRestore()
    }
  })

  it("puts the tenant id on every record", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form())
    expect(h.store.getState().tenantId).toBe("kalinaw")
    expect(h.store.getState().apps.every((a) => a.tenantId === "kalinaw")).toBe(true)
  })
})

describe("sign in", () => {
  it("rejects a wrong password and an unknown email with the same message", async () => {
    const h = harness()
    expect(await h.actions.signIn("juan.delacruz@email.com", "nope")).toEqual({ ok: false, error: "Email or password is incorrect." })
    expect(await h.actions.signIn("someone@email.com", "kalinaw2026")).toEqual({ ok: false, error: "Email or password is incorrect." })
  })

  it("sets the session cookie", async () => {
    const h = harness()
    await h.actions.signIn(" Juan.DelaCruz@email.com ", "kalinaw2026")
    expect(document.cookie).toMatch(/wbl_borrower_session=\S+/)
    await h.actions.signOut()
    expect(document.cookie).not.toMatch(/wbl_borrower_session=\S+/)
  })
})

describe("application", () => {
  it("auto-approves Juan's ₱150,000 / 24 months and records the decision", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    const r = await h.actions.submitApplication(form())
    expect(r).toEqual({ ok: true, id: "APP-4301" })
    const a = myApp(h.store.getState())!
    expect(a.stage).toBe("Offer")
    expect(plainStatus(a).h).toBe("You’re approved for ₱150,000")
    expect(a.decision).toMatchObject({ outcome: "approve", score: 757, ruleSetVersion: "v4", modelVersion: "PL-Score 3.2" })
    expect(a.decision.inputs.amount).toBe(toCentavos(150000))
  })

  it("validates each step with the prototype's messages", () => {
    const h = harness()
    expect(h.actions.validateStep(1, form({ amount: toCentavos(5000) }))).toBe("Enter an amount between ₱20,000 and ₱500,000.")
    expect(h.actions.validateStep(1, form({ product: "SL", amount: toCentavos(400000) }))).toBe("Enter an amount between ₱10,000 and ₱300,000.")
    expect(h.actions.validateStep(2, form({ income: null }))).toBe("Enter your monthly income.")
    expect(h.actions.validateStep(1, form())).toBeNull()
  })

  it("requires every consent", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    const r = await h.actions.submitApplication(form({ consentCredit: false, consentData: false, consentTerms: false }))
    expect(r).toEqual({ ok: false, error: "Please tick the credit check consent, data processing consent, terms and conditions to submit." })
    expect(h.store.getState().apps).toHaveLength(0)
  })

  it("blocks a duplicate open application for the same product", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form())
    const r = await h.actions.submitApplication(form())
    expect(r).toEqual({ ok: false, error: "You already have an open personal loan application (APP-4301). We’ll update you on that one first." })
    expect(h.store.getState().apps).toHaveLength(1)
  })

  it("keeps the decision record unchanged through accept, sign and release", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form())
    const before = JSON.stringify(myApp(h.store.getState())!.decision)
    await h.actions.acceptOffer(true)
    h.tick(BANK_STEP_MS)
    h.actions.advanceBank()
    await h.actions.signDocuments("Juan Dela Cruz", true)
    h.tick(BANK_STEP_MS)
    h.actions.advanceBank()
    const a = myApp(h.store.getState())!
    expect(a.stage).toBe("Disbursed")
    expect(JSON.stringify(a.decision)).toBe(before)
    expect(Object.isFrozen(a.decision)).toBe(true)
  })
})

describe("simulated bank progression", () => {
  it("walks a referral through every bank step after about 4 seconds each", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form({ amount: toCentavos(250000) }))
    expect(myApp(h.store.getState())!.stage).toBe("Review")

    h.tick(BANK_STEP_MS - 1)
    expect(h.actions.advanceBank()).toBe(0)
    h.tick(1)
    expect(h.actions.advanceBank()).toBe(1)
    let a = myApp(h.store.getState())!
    expect(a.stage).toBe("Info requested")
    expect(plainStatus(a).h).toBe("We need a few more documents")
    expect(a.hist.at(-1)!.what).toMatch(/\(simulated bank step\)$/)

    expect(await h.actions.uploadDocuments("ok")).toEqual({ ok: true })
    expect(myApp(h.store.getState())!.stage).toBe("Review")
    h.tick(BANK_STEP_MS)
    h.actions.advanceBank()
    a = myApp(h.store.getState())!
    expect(a.stage).toBe("Offer")
    expect(a.offer!.amount).toBe(toCentavos(180000))

    await h.actions.acceptOffer(true)
    h.tick(BANK_STEP_MS)
    h.actions.advanceBank()
    a = myApp(h.store.getState())!
    expect(plainStatus(a).h).toBe("Sign your loan documents")
    expect(plainStatus(a).cta).toEqual(["Sign documents", "/sign"])

    await h.actions.signDocuments("juan dela cruz", true)
    h.tick(BANK_STEP_MS)
    h.actions.advanceBank()
    a = myApp(h.store.getState())!
    expect(a.stage).toBe("Disbursed")
    expect(a.loanNo).toBe("LN-2026-1302")
    expect(a.hist.filter((x) => x.what.endsWith("(simulated bank step)"))).toHaveLength(4)
  })

  it("catches up on load when a step fell due while closed", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form())
    await h.actions.acceptOffer(true)
    const reopened = createStore(h.storage)
    const later = createActions(reopened, { now: () => h.now() + 60_000 })
    expect(later.advanceBank()).toBe(1)
    expect(myApp(reopened.getState())!.borrowerPending).toBe("sign")
  })
})

describe("borrower actions", () => {
  async function atInfoRequested() {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form({ amount: toCentavos(250000) }))
    h.tick(BANK_STEP_MS)
    h.actions.advanceBank()
    return h
  }

  it("rejects missing, unsupported and oversized uploads", async () => {
    const h = await atInfoRequested()
    expect(await h.actions.uploadDocuments("")).toEqual({ ok: false, error: "Choose a file to upload." })
    expect(await h.actions.uploadDocuments("type")).toEqual({ ok: false, error: "HEIC files aren’t accepted. Upload a PDF, JPG or PNG." })
    expect(await h.actions.uploadDocuments("size")).toEqual({ ok: false, error: "This file is 41 MB. The limit is 10 MB." })
    expect(myApp(h.store.getState())!.stage).toBe("Info requested")
  })

  it("needs the disclosure acknowledged to accept", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form())
    expect(await h.actions.acceptOffer(false)).toEqual({ ok: false, error: "Acknowledge the disclosure statement first" })
  })

  it("needs the exact name and agreement to sign", async () => {
    const h = harness()
    await h.actions.signIn("juan.delacruz@email.com", "kalinaw2026")
    await h.actions.submitApplication(form())
    await h.actions.acceptOffer(true)
    h.tick(BANK_STEP_MS)
    h.actions.advanceBank()
    expect(await h.actions.signDocuments("Juan Cruz", true)).toEqual({ ok: false, error: "Type your name exactly as it appears on your account: Juan Dela Cruz." })
    expect(await h.actions.signDocuments("Juan Dela Cruz", false)).toEqual({ ok: false, error: "Tick the box to agree to sign electronically." })
  })
})
