import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { config, proxy } from "@/proxy"

const req = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, "http://localhost:3002"), { headers: cookie ? { cookie } : {} })

describe("proxy", () => {
  it("redirects signed-out requests to sign-in", () => {
    const res = proxy(req("/offer"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost:3002/sign-in")
  })

  it("lets signed-in requests through", () => {
    const res = proxy(req("/offer", "wbl_borrower_session=juan"))
    expect(res.headers.get("location")).toBeNull()
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
