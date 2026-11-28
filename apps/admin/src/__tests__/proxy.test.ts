// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { proxy } from "../proxy"

function req(path: string, signedIn = false, flags?: string) {
  const cookies = [signedIn ? "wbl_admin_session=admin" : "", flags !== undefined ? `wbl_admin_flags=${flags}` : ""].filter(Boolean).join("; ")
  return new NextRequest(new URL(path, "http://localhost:3003"), { headers: cookies ? { cookie: cookies } : {} })
}

const rewriteTo = (res: Response) => res.headers.get("x-middleware-rewrite")
const redirectTo = (res: Response) => res.headers.get("location")

describe("proxy", () => {
  it("redirects a signed-out request to sign-in", () => {
    expect(redirectTo(proxy(req("/config/products")))).toBe("http://localhost:3003/sign-in")
  })

  it("sends a signed-in session from sign-in and root to Products", () => {
    expect(redirectTo(proxy(req("/sign-in", true)))).toBe("http://localhost:3003/config/products")
    expect(redirectTo(proxy(req("/", true)))).toBe("http://localhost:3003/config/products")
  })

  it("lets a signed-in session open every sidebar route", () => {
    const res = proxy(req("/config/products", true))
    expect(rewriteTo(res)).toBeNull()
    expect(redirectTo(res)).toBeNull()
  })

  it("lets unknown paths through to not-found", () => {
    const res = proxy(req("/nowhere", true))
    expect(rewriteTo(res)).toBeNull()
    expect(redirectTo(res)).toBeNull()
  })

  it("refuses AI models when the module flag is off", () => {
    expect(rewriteTo(proxy(req("/config/models", true, "ai")))).toBeNull()
    expect(rewriteTo(proxy(req("/config/models", true, "")))).toContain("/denied")
  })
})
