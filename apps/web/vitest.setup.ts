import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { simulateDecision } from "@aim-ready/core"
import * as React from "react"
import { afterEach, vi } from "vitest"

import { BORROWERS, DEMO_PASSWORD, POLICY } from "./src/mock/config"
import type { ProductCode } from "./src/mock/types"
import { nav } from "./src/test/nav"

const TOKEN_PREFIX = "test-session-token-"

/**
 * Stands in for apps/api's real `/auth/login` and `/applications` for
 * borrower scope, so every existing test that signs in and applies through
 * `actions` keeps working without a live backend. Individual tests override
 * this with `mockImplementationOnce` (or `mockRejectedValueOnce`) to exercise
 * the identity/application-service-unavailable paths.
 */
vi.stubGlobal(
  "fetch",
  vi.fn(async (url: string, init?: RequestInit) => {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
    if (String(url).endsWith("/auth/login")) {
      const { email, password } = JSON.parse(String(init?.body ?? "{}")) as { email?: string; password?: string }
      const who = Object.values(BORROWERS).find((b) => b.email === email)
      if (!who || password !== DEMO_PASSWORD) return json({ ok: false, error: "Email or password is incorrect." })
      return json({ ok: true, kind: "session", token: `${TOKEN_PREFIX}${who.id}`, role: "borrower", email: who.email })
    }
    if (String(url).endsWith("/applications")) {
      const token = String(init?.headers && (init.headers as Record<string, string>)["Authorization"] || "")
      const borrowerId = token.startsWith(`Bearer ${TOKEN_PREFIX}`) ? token.slice(`Bearer ${TOKEN_PREFIX}`.length) : ""
      const b = BORROWERS[borrowerId]
      if (!b) return json({ ok: false, error: "Your session has ended. Sign in again." }, 401)
      const dto = JSON.parse(String(init?.body ?? "{}")) as { product: ProductCode; amount: number; income: number; obligations: number }
      const decision = simulateDecision(
        { product: dto.product, amount: dto.amount, age: b.age, sanctions: false, defaulted: false, bureau: b.bureau, years: 2026 - b.since, dti: dto.obligations / dto.income, mismatch: 0, stable: b.stable },
        POLICY
      )
      return json({ ok: true, applicationId: `test-app-${Math.random().toString(36).slice(2)}`, decision })
    }
    if (/\/applications\/.+\/close$/.test(String(url))) {
      return json({ ok: true })
    }
    throw new Error(`unmocked fetch: ${String(url)}`)
  })
)

// Next's router is not mounted in unit tests: record navigations instead.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => nav.pathname,
}))

vi.mock("@/lib/navigation", () => ({ navigateHard: nav.hard }))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => React.createElement("a", { href, ...props }, children),
}))

// jsdom has no ResizeObserver; Radix checkboxes measure themselves with it.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

afterEach(() => cleanup())
