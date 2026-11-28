import { createHmac } from "node:crypto"

import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { config, proxy } from "@/proxy"

const req = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, "http://localhost:3002"), { headers: cookie ? { cookie } : {} })

/** Mirrors apps/api's TokenService signing scheme, test-only. */
function signToken(payload: Record<string, unknown>): string {
  const secret = process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me"
  const base64url = (s: string) => Buffer.from(s, "utf8").toString("base64url")
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = base64url(JSON.stringify(payload))
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")
  return `${header}.${body}.${signature}`
}

function validBorrowerToken() {
  const iat = Math.floor(Date.now() / 1000)
  return signToken({ sub: "juan", tenantId: "kalinaw", appScope: "borrower", role: "borrower", email: "juan.delacruz@email.com", typ: "session", iat, exp: iat + 3600 })
}

describe("proxy", () => {
  it("redirects signed-out requests to sign-in", () => {
    const res = proxy(req("/offer"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost:3002/sign-in")
  })

  it("lets requests with a valid session token through", () => {
    const res = proxy(req("/offer", `wbl_borrower_session=${validBorrowerToken()}`))
    expect(res.headers.get("location")).toBeNull()
  })

  it("redirects a request with an invalid or unsigned token", () => {
    const res = proxy(req("/offer", "wbl_borrower_session=juan"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost:3002/sign-in")
  })

  it("redirects a request carrying a different app's valid-looking token", () => {
    const iat = Math.floor(Date.now() / 1000)
    const staffToken = signToken({ sub: "approver", tenantId: "kalinaw", appScope: "staff", role: "approver", email: "approver@kalinawbank.ph", typ: "session", iat, exp: iat + 3600 })
    const res = proxy(req("/offer", `wbl_borrower_session=${staffToken}`))
    expect(res.status).toBe(307)
  })

  it("always allows the sign-in page", () => {
    expect(proxy(req("/sign-in")).headers.get("location")).toBeNull()
  })

  it("does not match static assets", () => {
    const re = new RegExp(`^${config.matcher[0]}$`)
    expect(re.test("/_next/static/chunk.js")).toBe(false)
    expect(re.test("/favicon.ico")).toBe(false)
    expect(re.test("/apply")).toBe(true)
  })
})
