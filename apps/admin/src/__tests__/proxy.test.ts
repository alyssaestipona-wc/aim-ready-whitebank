// @vitest-environment node
import { createHmac } from "node:crypto"

import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { proxy } from "../proxy"

/** Mirrors apps/api's TokenService signing scheme, test-only. */
function signToken(appScope: "admin" | "staff" | "borrower" = "admin") {
  const secret = process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me"
  const base64url = (s: string) => Buffer.from(s, "utf8").toString("base64url")
  const iat = Math.floor(Date.now() / 1000)
  const role = appScope === "admin" ? "admin" : appScope === "staff" ? "approver" : "borrower"
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = base64url(JSON.stringify({ sub: "admin", tenantId: "kalinaw", appScope, role, email: "admin@kalinawbank.ph", typ: "session", iat, exp: iat + 3600 }))
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")
  return `${header}.${body}.${signature}`
}

function req(path: string, signedIn = false, flags?: string) {
  const cookies = [signedIn ? `wbl_admin_session=${signToken()}` : "", flags !== undefined ? `wbl_admin_flags=${flags}` : ""].filter(Boolean).join("; ")
  return new NextRequest(new URL(path, "http://localhost:3003"), { headers: cookies ? { cookie: cookies } : {} })
}

const rewriteTo = (res: Response) => res.headers.get("x-middleware-rewrite")
const redirectTo = (res: Response) => res.headers.get("location")

describe("proxy", () => {
  it("redirects a signed-out request to sign-in", () => {
    expect(redirectTo(proxy(req("/config/products")))).toBe("http://localhost:3003/sign-in")
  })

  it("redirects a request with an invalid or unsigned token", () => {
    const res = new NextRequest(new URL("/config/products", "http://localhost:3003"), { headers: { cookie: "wbl_admin_session=admin" } })
    expect(redirectTo(proxy(res))).toBe("http://localhost:3003/sign-in")
  })

  it("redirects a request carrying a different app's valid-looking token", () => {
    const res = new NextRequest(new URL("/config/products", "http://localhost:3003"), { headers: { cookie: `wbl_admin_session=${signToken("staff")}` } })
    expect(redirectTo(proxy(res))).toBe("http://localhost:3003/sign-in")
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
