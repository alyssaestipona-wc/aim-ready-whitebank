import { describe, expect, it } from "vitest"

import { matchRoute, NAV } from "@/lib/access"

describe("access", () => {
  it("has exactly eleven sidebar routes", () => {
    expect(NAV).toHaveLength(11)
  })

  it("resolves a template detail route as a regex branch, not a sidebar NAV entry", () => {
    expect(matchRoute("/config/templates/agreement")).toMatchObject({ key: "template", param: "agreement" })
    expect(NAV.map((i) => i.key)).not.toContain("template")
  })

  it("resolves a product detail route the same way", () => {
    expect(matchRoute("/config/products/PL")).toMatchObject({ key: "product", param: "PL" })
  })
})
