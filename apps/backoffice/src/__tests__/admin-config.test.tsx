import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import DecisioningPage from "@/app/(console)/config/decisioning/page"
import IntegrationsPage from "@/app/(console)/config/integrations/page"
import MatrixPage from "@/app/(console)/config/matrix/page"
import ModelsPage from "@/app/(console)/config/models/page"
import NotificationConfigPage from "@/app/(console)/config/notifications/page"
import ProductsPage from "@/app/(console)/config/products/page"
import { ProductView } from "@/components/admin/product-view"
import TemplatesPage from "@/app/(console)/config/templates/page"
import TenantPage from "@/app/(console)/config/tenant/page"
import UsersPage from "@/app/(console)/config/users/page"
import WorkflowsPage from "@/app/(console)/config/workflows/page"
import { ConsoleShell } from "@/components/console-shell"
import { allowed } from "@/lib/access"
import { getState, products, publishRuleSet, setSessionRole, submitProductDraft } from "@/mock"
import { update } from "@/mock/store"

import { renderWithToasts, setup } from "./helpers"
import { nav } from "./nav-mock"

const SIMULATED = "Maker-checker is simulated in this prototype until the API enforces it."
const lastAudit = () => getState().audit[0]

describe("products (maker-checker)", () => {
  it("lists products with versions and pages campaigns", async () => {
    setup("risk", "/config/products")
    const l = renderWithToasts(<ProductsPage />)
    expect(screen.getByText("Personal loan")).toBeInTheDocument()
    expect(screen.getByText("Published · v6")).toBeInTheDocument()
    l.unmount()
    setup("risk", "/config/products/PL", "", { code: "PL" })
    renderWithToasts(<ProductView code={(nav.params.code ?? "")} />)
    await userEvent.click(screen.getByRole("tab", { name: "Pre-approved offers" }))
    expect(within(screen.getByRole("table", { name: "Pre-approved offer campaigns" })).getAllByRole("row")).toHaveLength(11)
  })

  it("author cannot publish; a second person publishes and both are logged", async () => {
    setup("risk", "/config/products/PL", "", { code: "PL" })
    const r = renderWithToasts(<ProductView code={(nav.params.code ?? "")} />)
    expect(screen.getByText(SIMULATED)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Create draft" }))
    expect(screen.getByLabelText("Maximum amount")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Submit for review" }))
    const publish = screen.getByRole("button", { name: "Approve and publish" })
    expect(publish).toBeDisabled()
    expect(publish).toHaveAttribute("title", "You submitted this change; a different person must approve it")
    r.unmount()

    act(() => setSessionRole("admin"))
    renderWithToasts(<ProductView code={(nav.params.code ?? "")} />)
    await userEvent.click(screen.getByRole("button", { name: "Approve and publish" }))
    expect(products(getState()).PL.version).toBe("v7")
    expect(lastAudit()).toMatchObject({ who: "Jonas Mercado", what: "Approved and published Personal loan v7 (maker-checker; drafted by Rafael Cruz)" })
  })

  it("refuses an auto-approval limit above the maximum", async () => {
    setup("risk", "/config/products/PL", "", { code: "PL" })
    act(() => {
      update((s) => {
        s.pdraft = { code: "PL", max: 10000000, autoLimit: 20000000, inReview: false, author: null }
      })
    })
    const r = await submitProductDraft()
    expect(r).toMatchObject({ ok: false, error: "The auto-approval limit can’t exceed the maximum amount." })
    expect(getState().pdraft?.inReview).toBe(false)
  })

  it("compliance sees product controls disabled", () => {
    setup("compliance", "/config/products/SL", "", { code: "SL" })
    renderWithToasts(<ProductView code={(nav.params.code ?? "")} />)
    const b = screen.getByRole("button", { name: "Create draft" })
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute("title", "Read-only access")
  })
})

describe("read-only configuration", () => {
  it.each([
    ["workflows", WorkflowsPage],
    ["matrix", MatrixPage],
    ["templates", TemplatesPage],
    ["notifications", NotificationConfigPage],
    ["users", UsersPage],
  ] as const)("%s has no edit or publish control for the administrator", (_n, Page) => {
    setup("admin", "/config")
    renderWithToasts(<Page />)
    expect(screen.queryByRole("button", { name: /edit|publish|draft|save|submit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })

  it("users lists 30 people over three pages", () => {
    setup("admin", "/config/users")
    renderWithToasts(<UsersPage />)
    expect(screen.getByText("Showing 1–10 of 30")).toBeInTheDocument()
  })

  it("matrix shows the configured authority and override threshold", () => {
    setup("risk", "/config/matrix")
    renderWithToasts(<MatrixPage />)
    expect(screen.getByText("Up to ₱1,000,000")).toBeInTheDocument()
    expect(screen.getByText(/differs from the AI amount by ₱50,000 or more/)).toBeInTheDocument()
  })
})

describe("decisioning rule set (maker-checker)", () => {
  it("drafts, refuses the author's publish, and publishes by a second person", async () => {
    setup("risk", "/config/decisioning")
    const r = renderWithToasts(<DecisioningPage />)
    expect(screen.getByText(SIMULATED)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Create draft" }))
    await userEvent.click(screen.getByRole("switch", { name: "Toggle No existing default" }))
    expect(getState().cfg.draft?.rules.find((x) => x.id === "default")?.active).toBe(false)
    await userEvent.click(screen.getByRole("tab", { name: "Draft changes" }))
    expect(screen.getByText("− No existing default: inactive")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Submit for review" }))
    const pub = screen.getByRole("button", { name: "Approve and publish" })
    expect(pub).toBeDisabled()
    expect(pub).toHaveAttribute("title", "You submitted this change; a different person must approve it")
    expect(await publishRuleSet()).toMatchObject({ ok: false, error: "You submitted this change; a different person must approve it" })
    r.unmount()

    act(() => setSessionRole("admin"))
    renderWithToasts(<DecisioningPage />)
    await userEvent.click(screen.getByRole("button", { name: "Approve and publish" }))
    expect(screen.getByRole("dialog", { name: "Publish rule set v5?" })).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve and publish" }))
    expect(getState().cfg.ruleset.pub).toBe("v5")
    expect(lastAudit()).toMatchObject({ who: "Jonas Mercado", what: "Approved and published rule set v5 (maker-checker; drafted by Rafael Cruz)" })
  })

  it("adds a custom rule, and needs a name", async () => {
    setup("admin", "/config/decisioning")
    renderWithToasts(<DecisioningPage />)
    await userEvent.click(screen.getByRole("button", { name: "Create draft" }))
    await userEvent.click(screen.getByRole("button", { name: "Add rule" }))
    await userEvent.clear(screen.getByLabelText("Rule name"))
    await userEvent.click(screen.getByRole("button", { name: "Add to draft" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Give the rule a name.")
    await userEvent.type(screen.getByLabelText("Rule name"), "High DTI, new to bank")
    await userEvent.click(screen.getByRole("button", { name: "Add to draft" }))
    expect(getState().cfg.draft?.rules.at(-1)).toMatchObject({ name: "High DTI, new to bank", custom: true })
  })

  it("compares the draft in the test harness", async () => {
    setup("risk", "/config/decisioning")
    renderWithToasts(<DecisioningPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Test harness" }))
    expect(screen.getByText("Create a draft to compare its outcomes with the published rule set.")).toBeInTheDocument()
  })

  it("compliance cannot create a draft", () => {
    setup("compliance", "/config/decisioning")
    renderWithToasts(<DecisioningPage />)
    expect(screen.getByRole("button", { name: "Create draft" })).toBeDisabled()
  })
})

describe("kill switch (PRD AIS-7)", () => {
  it("credit risk turns it on and off; each direction is audited", async () => {
    setup("risk", "/config/models")
    renderWithToasts(<ModelsPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Automation controls" }))
    await userEvent.click(screen.getByRole("button", { name: "Turn kill switch on" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Applications already decided are not affected.")
    await userEvent.click(screen.getByRole("button", { name: "Turn on" }))
    expect(getState().cfg.killSwitch).toBe(true)
    expect(lastAudit()).toMatchObject({ who: "Rafael Cruz", what: "Turned kill switch ON: all new applications to manual review" })
    await userEvent.click(screen.getByRole("button", { name: "Turn kill switch off" }))
    await userEvent.click(screen.getByRole("button", { name: "Turn off" }))
    expect(getState().cfg.killSwitch).toBe(false)
    expect(lastAudit()).toMatchObject({ who: "Rafael Cruz", what: "Turned kill switch off" })
  })

  it.each(["admin", "compliance"] as const)("is disabled for %s", async (role) => {
    setup(role, "/config/models")
    renderWithToasts(<ModelsPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Automation controls" }))
    expect(screen.getByRole("button", { name: "Turn kill switch on" })).toBeDisabled()
  })
})

describe("AI module flag (PRD PLT-2)", () => {
  it("admin turns it off: nav item gone, route refused, audited; and back on", async () => {
    setup("admin", "/config/tenant")
    renderWithToasts(<TenantPage />)
    await userEvent.click(screen.getByRole("switch", { name: "AI credit scoring" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Existing records are kept, not deleted.")
    await userEvent.click(screen.getByRole("button", { name: "Turn off" }))
    expect(getState().flags.ai).toBe(false)
    expect(lastAudit()).toMatchObject({ who: "Jonas Mercado", what: "Turned off module: AI credit scoring" })
    expect(document.cookie).toContain("wbl_flags=")
    expect(document.cookie).not.toContain("wbl_flags=ai")
    for (const r of ["risk", "admin", "compliance"] as const) expect(allowed(r, "models", getState().flags)).toBe(false)
    renderWithToasts(<ConsoleShell>x</ConsoleShell>)
    expect(screen.queryByRole("link", { name: "AI models" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("switch", { name: "AI credit scoring" }))
    await userEvent.click(screen.getByRole("button", { name: "Turn on" }))
    expect(lastAudit()).toMatchObject({ what: "Turned on module: AI credit scoring" })
    expect(allowed("risk", "models", getState().flags)).toBe(true)
  })

  it.each(["risk", "compliance"] as const)("is disabled for %s", (role) => {
    setup(role, "/config/tenant")
    renderWithToasts(<TenantPage />)
    expect(screen.getByRole("switch", { name: "AI credit scoring" })).toBeDisabled()
  })
})

describe("failure drills", () => {
  it("admin toggles both drills; each is audited", async () => {
    setup("admin", "/config/integrations")
    renderWithToasts(<IntegrationsPage />)
    await userEvent.click(screen.getByRole("button", { name: "Simulate outage" }))
    expect(getState().cfg.bureauDown).toBe(true)
    expect(lastAudit()).toMatchObject({ what: "Failure drill: credit bureau outage simulated" })
    expect(screen.getByText("Outage (simulated)")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Fail next booking" }))
    expect(lastAudit()).toMatchObject({ what: "Failure drill: next core booking will time out" })
    await userEvent.click(screen.getByRole("button", { name: "Restore bureau" }))
    expect(lastAudit()).toMatchObject({ what: "Credit bureau restored" })
  })

  it("drills are disabled for compliance", () => {
    setup("compliance", "/config/integrations")
    renderWithToasts(<IntegrationsPage />)
    expect(screen.getByRole("button", { name: "Simulate outage" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Fail next booking" })).toBeDisabled()
  })
})
