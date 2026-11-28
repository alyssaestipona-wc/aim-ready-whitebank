import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

import { DEMO_PASSWORD, USERS } from "./src/mock/constants"
import type { RoleKey } from "./src/mock/types"
import { nav } from "./src/__tests__/nav-mock"

/**
 * Stands in for apps/api's real `/auth/login` and `/auth/verify-code` for
 * staff scope, so every existing test that signs in through
 * `checkCredentials`/`verifyCode` keeps working without a live backend.
 * Individual tests override this with `mockImplementationOnce` (or
 * `mockRejectedValueOnce`) to exercise the identity-service-unavailable path.
 */
vi.stubGlobal(
  "fetch",
  vi.fn(async (url: string, init?: RequestInit) => {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
    if (String(url).endsWith("/auth/login")) {
      const { email, password } = JSON.parse(String(init?.body ?? "{}")) as { email?: string; password?: string }
      const e = String(email ?? "").trim().toLowerCase()
      if (e === USERS.admin.email) return json({ ok: false, error: "Tenant administrators sign in at the separate admin console." })
      const role = (Object.keys(USERS) as RoleKey[]).find((k) => USERS[k].email === e)
      if (!role || role === "admin" || password !== DEMO_PASSWORD) return json({ ok: false, error: "Email or password is incorrect." })
      const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")
      return json({ ok: true, kind: "code-required", pendingToken: JSON.stringify({ role }), devCode: code })
    }
    if (String(url).endsWith("/auth/verify-code")) {
      const { pendingToken, code } = JSON.parse(String(init?.body ?? "{}")) as { pendingToken?: string; code?: string }
      const pending = JSON.parse(pendingToken ?? "{}") as { role?: RoleKey }
      // Any six digits pass here, matching this build's own simulated-code UX: the real
      // backend's exact-code check is covered by apps/api's own integration tests.
      if (!pending.role || !/^\d{6}$/.test(String(code ?? "").trim())) return json({ ok: false, error: "That code is incorrect. Try again." })
      const role = pending.role
      const base64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
      const iat = Math.floor(Date.now() / 1000)
      const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      const body = base64url(JSON.stringify({ sub: role, tenantId: "kalinaw", appScope: "staff", role, email: USERS[role].email, typ: "session", iat, exp: iat + 4 * 60 * 60 }))
      return json({ ok: true, kind: "session", token: `${header}.${body}.test-only-unsigned`, role, email: USERS[role].email })
    }
    throw new Error(`unmocked fetch: ${String(url)}`)
  })
)

vi.mock("next/navigation", () => ({
  useRouter: () => nav.router,
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.searchParams,
  useParams: () => nav.params,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

vi.mock("@/lib/navigation", () => ({ navigateHard: (path: string) => nav.hard(path) }))

afterEach(() => cleanup())

// jsdom has no matchMedia; tests run at desktop width.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({ matches: true, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as typeof window.matchMedia
}
