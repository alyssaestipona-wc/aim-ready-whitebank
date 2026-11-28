// @vitest-environment node
import { createHmac } from "node:crypto"

import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { LANDING, pathOf, type SessionRole } from "../lib/access"
import { proxy } from "../proxy"

/** Mirrors apps/api's TokenService signing scheme, test-only. */
function signToken(role: SessionRole): string {
  const secret = process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me"
  const base64url = (s: string) => Buffer.from(s, "utf8").toString("base64url")
  const iat = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = base64url(JSON.stringify({ sub: role, tenantId: "kalinaw", appScope: "staff", role, email: `${role}@kalinawbank.ph`, typ: "session", iat, exp: iat + 3600 }))
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")
  return `${header}.${body}.${signature}`
}

function req(path: string, role?: SessionRole, flags?: string) {
  const cookies = [role ? `wbl_staff_session=${signToken(role)}` : "", flags !== undefined ? `wbl_flags=${flags}` : ""].filter(Boolean).join("; ")
  return new NextRequest(new URL(path, "http://localhost:3001"), { headers: cookies ? { cookie: cookies } : {} })
}

const rewriteTo = (res: Response) => res.headers.get("x-middleware-rewrite")
const redirectTo = (res: Response) => res.headers.get("location")

/** One allowed and one forbidden route per role, from the prototype's NAV. */
const CASES: Array<[SessionRole, string, string]> = [
  ["branch", "/queues", "/compliance/audit"],
  ["officer", "/applications/new", "/booking"],
  ["approver", "/approvals", "/applications/new"],
  ["ops", "/booking", "/approvals"],
  ["opssup", "/exceptions", "/applications"],
  ["risk", "/config/decisioning", "/compliance/audit"],
  ["compliance", "/compliance/aml", "/applications/new"],
]

describe("proxy", () => {
  it.each(CASES)("%s may open %s", (role, ok) => {
    const res = proxy(req(ok, role))
    expect(rewriteTo(res)).toBeNull()
    expect(redirectTo(res)).toBeNull()
  })

  it.each(CASES)("%s is refused %s before render", (role, _ok, forbidden) => {
    const res = proxy(req(forbidden, role))
    expect(rewriteTo(res)).toContain("/denied")
  })

  it.each(CASES)("signed-out request for %s's routes goes to sign-in", (_role, ok) => {
    expect(redirectTo(proxy(req(ok)))).toBe("http://localhost:3001/sign-in")
  })

  it("redirects a request with an invalid or unsigned token", () => {
    const res = new NextRequest(new URL("/queues", "http://localhost:3001"), { headers: { cookie: "wbl_staff_session=officer" } })
    expect(redirectTo(proxy(res))).toBe("http://localhost:3001/sign-in")
  })

  it("redirects a request carrying a different app's valid-looking token", () => {
    const iat = Math.floor(Date.now() / 1000)
    const secret = process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me"
    const base64url = (s: string) => Buffer.from(s, "utf8").toString("base64url")
    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    const body = base64url(JSON.stringify({ sub: "juan", tenantId: "kalinaw", appScope: "borrower", role: "borrower", email: "juan.delacruz@email.com", typ: "session", iat, exp: iat + 3600 }))
    const borrowerToken = `${header}.${body}.${createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")}`
    const res = new NextRequest(new URL("/queues", "http://localhost:3001"), { headers: { cookie: `wbl_staff_session=${borrowerToken}` } })
    expect(redirectTo(proxy(res))).toBe("http://localhost:3001/sign-in")
  })

  it("sends a signed-in user from sign-in and root to their landing screen", () => {
    for (const role of Object.keys(LANDING) as SessionRole[]) {
      expect(redirectTo(proxy(req("/sign-in", role)))).toBe(`http://localhost:3001${pathOf(LANDING[role])}`)
      expect(redirectTo(proxy(req("/", role)))).toBe(`http://localhost:3001${pathOf(LANDING[role])}`)
    }
  })

  it("lets case pages through for every case role", () => {
    expect(rewriteTo(proxy(req("/applications/APP-2041", "officer")))).toBeNull()
  })

  it("refuses AI models for everyone when the module flag is off", () => {
    expect(rewriteTo(proxy(req("/config/models", "risk", "ai")))).toBeNull()
    expect(rewriteTo(proxy(req("/config/models", "risk", "")))).toContain("/denied")
  })

  it("lets unknown paths through to not-found", () => {
    const res = proxy(req("/nowhere", "officer"))
    expect(rewriteTo(res)).toBeNull()
    expect(redirectTo(res)).toBeNull()
  })
})
