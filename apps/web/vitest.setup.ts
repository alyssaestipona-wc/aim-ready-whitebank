import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import * as React from "react"
import { afterEach, vi } from "vitest"

import { BORROWERS, DEMO_PASSWORD } from "./src/mock/config"
import { nav } from "./src/test/nav"

/**
 * Stands in for apps/api's real `/auth/login` for borrower scope, so every
 * existing test that signs in through `actions.signIn` keeps working without
 * a live backend. Individual tests override this with `mockImplementationOnce`
 * (or `mockRejectedValueOnce`) to exercise the identity-service-unavailable path.
 */
vi.stubGlobal(
  "fetch",
  vi.fn(async (_url: string, init?: RequestInit) => {
    const { email, password } = JSON.parse(String(init?.body ?? "{}")) as { email?: string; password?: string }
    const who = Object.values(BORROWERS).find((b) => b.email === email)
    const body = !who || password !== DEMO_PASSWORD ? { ok: false, error: "Email or password is incorrect." } : { ok: true, kind: "session", token: `test-session-token-${who.id}`, role: "borrower", email: who.email }
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })
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
