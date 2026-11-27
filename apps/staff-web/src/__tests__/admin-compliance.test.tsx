import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import AmlPage from "@/app/(console)/compliance/aml/page"
import AuditLogPage from "@/app/(console)/compliance/audit/page"
import ConsentPage from "@/app/(console)/compliance/consent/page"
import GovernancePage from "@/app/(console)/compliance/governance/page"
import RelatedPartyPage from "@/app/(console)/compliance/related/page"
import { allowed } from "@/lib/access"
import { getState } from "@/mock"

import { renderWithToasts, setup } from "./helpers"

const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1)

describe("compliance views", () => {
  it("audit log filters by role, paginated", async () => {
    setup("compliance", "/compliance/audit")
    renderWithToasts(<AuditLogPage />)
    expect(rows()).toHaveLength(10)
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Role" }), "Loan officer")
    const shown = rows()
    expect(shown.length).toBeGreaterThan(0)
    shown.forEach((r) => expect(r).toHaveTextContent("Loan officer"))
    expect(screen.getByText(/Showing 1–|results?$/)).toBeInTheDocument()
  })

  it("audit log filters by action type", async () => {
    setup("admin", "/compliance/audit")
    renderWithToasts(<AuditLogPage />)
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Action type" }), "booking")
    rows().forEach((r) => expect(r.textContent).toMatch(/book|disburs|core/i))
  })

  it("AML export changes status and is audited", async () => {
    setup("compliance", "/compliance/aml")
    renderWithToasts(<AmlPage />)
    const btns = screen.getAllByRole("button", { name: "Mark reviewed and export" })
    expect(btns).toHaveLength(4)
    await userEvent.click(btns[0]!)
    expect(getState().amlCases[0]?.status).toBe("Exported to AML system")
    expect(getState().apps.find((a) => a.id === "APP-2050")?.aml).toBe("Exported to AML system")
    expect(getState().audit[0]).toMatchObject({ who: "Nina Torres", what: "AML escalation for Arturo Santos reviewed and exported to the bank’s AML system", target: "APP-2050" })
    expect(screen.getAllByRole("button", { name: "Mark reviewed and export" })).toHaveLength(3)
  })

  it("consent, related-party and governance render paginated lists", () => {
    setup("compliance", "/compliance/consent")
    const c = renderWithToasts(<ConsentPage />)
    expect(rows()).toHaveLength(10)
    c.unmount()
    const r = renderWithToasts(<RelatedPartyPage />)
    expect(rows()).toHaveLength(10)
    r.unmount()
    renderWithToasts(<GovernancePage />)
    expect(screen.getByText("Findings")).toBeInTheDocument()
  })

  it("governance is visible to risk but not to admin", () => {
    expect(allowed("risk", "governance")).toBe(true)
    expect(allowed("compliance", "governance")).toBe(true)
    expect(allowed("admin", "governance")).toBe(false)
  })
})
