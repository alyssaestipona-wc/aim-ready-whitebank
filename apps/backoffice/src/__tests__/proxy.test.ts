// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { LANDING, pathOf, type SessionRole } from "../lib/access"
import { proxy } from "../proxy"

function req(path: string, role?: SessionRole, flags?: string) {
  const cookies = [role ? `wbl_staff_session=${role}` : "", flags !== undefined ? `wbl_flags=${flags}` : ""].filter(Boolean).join("; ")
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
  ["admin", "/config/users", "/queues"],
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

  it("sends a signed-in user from sign-in and root to their landing screen", () => {
    for (const role of Object.keys(LANDING) as SessionRole[]) {
      expect(redirectTo(proxy(req("/sign-in", role)))).toBe(`http://localhost:3001${pathOf(LANDING[role])}`)
      expect(redirectTo(proxy(req("/", role)))).toBe(`http://localhost:3001${pathOf(LANDING[role])}`)
    }
  })

  it("lets case pages through for case roles and refuses admin", () => {
    expect(rewriteTo(proxy(req("/applications/APP-2041", "officer")))).toBeNull()
    expect(rewriteTo(proxy(req("/applications/APP-2041", "admin")))).toContain("/denied")
  })

  it("refuses AI models for everyone when the module flag is off", () => {
    expect(rewriteTo(proxy(req("/config/models", "risk", "ai")))).toBeNull()
    expect(rewriteTo(proxy(req("/config/models", "risk", "")))).toContain("/denied")
    expect(rewriteTo(proxy(req("/config/models", "admin", "")))).toContain("/denied")
  })

  it("lets unknown paths through to not-found", () => {
    const res = proxy(req("/nowhere", "officer"))
    expect(rewriteTo(res)).toBeNull()
    expect(redirectTo(res)).toBeNull()
  })
})
