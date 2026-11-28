import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import FunnelPage from "@/app/(console)/reports/funnel/page"
import DecisioningDashboard from "@/app/(console)/reports/decisioning/page"
import RegulatoryPage from "@/app/(console)/reports/regulatory/page"
import TurnaroundPage from "@/app/(console)/reports/sla/page"
import { allowed, type SessionRole } from "@/lib/access"
import { getState } from "@/mock"

import { renderWithToasts, setup } from "./helpers"

const REPORT_ROLES: SessionRole[] = ["officer", "approver", "risk", "compliance"]

function barsAreAccent(container: HTMLElement) {
  const bars = container.querySelectorAll("[data-slot=bar]")
  expect(bars.length).toBeGreaterThan(0)
  bars.forEach((b) => {
    expect(b).toHaveClass("bg-brand")
    expect(b.className).not.toMatch(/green|orange|bg-ink|bg-g-/)
  })
}

describe("reports", () => {
  it.each(REPORT_ROLES)("%s can open and render the three dashboards", (role) => {
    expect(allowed(role, "dash-funnel")).toBe(true)
    setup(role, "/reports/funnel")
    const f = renderWithToasts(<FunnelPage />)
    expect(screen.getByRole("heading", { name: "Origination funnel" })).toBeInTheDocument()
    barsAreAccent(f.container)
    f.unmount()
    const t = renderWithToasts(<TurnaroundPage />)
    barsAreAccent(t.container)
    t.unmount()
    const d = renderWithToasts(<DecisioningDashboard />)
    expect(screen.getByText(/in this demo/)).toBeInTheDocument()
    barsAreAccent(d.container)
  })

  it("switches funnel channel", async () => {
    setup("risk", "/reports/funnel")
    renderWithToasts(<FunnelPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Branch" }))
    expect(screen.getAllByText("9,100").length).toBeGreaterThan(0)
  })

  it("regulatory is limited to risk and compliance", () => {
    expect(allowed("officer", "dash-reg")).toBe(false)
    expect(allowed("approver", "dash-reg")).toBe(false)
    for (const r of ["risk", "compliance"] as const) expect(allowed(r, "dash-reg")).toBe(true)
  })

  it("CIC: errors block submission; fix and submit are audited", async () => {
    setup("risk", "/reports/regulatory")
    renderWithToasts(<RegulatoryPage />)
    await userEvent.click(screen.getByRole("button", { name: "Generate CIC file for Nov 2026" }))
    expect(screen.getByText("2 errors")).toBeInTheDocument()
    const submit = screen.getByRole("button", { name: "Mark submitted" })
    expect(submit).toBeDisabled()
    expect(submit).toHaveAttribute("title", "Resolve the validation errors first")
    expect(getState().audit[0]?.what).toMatch(/Generated CIC submission file for Nov 2026: 2 validation errors/)
    await userEvent.click(screen.getByRole("button", { name: "Fix and regenerate" }))
    expect(getState().audit[0]?.what).toMatch(/Corrected 2 records and regenerated CIC file/)
    await userEvent.click(screen.getByRole("button", { name: "Mark submitted" }))
    expect(screen.getByText("Submitted 27 Nov")).toBeInTheDocument()
    expect(getState().audit[0]).toMatchObject({ what: "Marked CIC file for Nov 2026 as submitted", who: "Rafael Cruz" })
  })

  it("compliance cannot generate a file", () => {
    setup("compliance", "/reports/regulatory")
    renderWithToasts(<RegulatoryPage />)
    const b = screen.getByRole("button", { name: "Generate CIC file for Nov 2026" })
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute("title", "Read-only access")
  })

  it("lists past submissions with a pager", () => {
    setup("risk", "/reports/regulatory")
    renderWithToasts(<RegulatoryPage />)
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(11)
    expect(screen.getByText(/Showing 1–10 of/)).toBeInTheDocument()
  })
})
