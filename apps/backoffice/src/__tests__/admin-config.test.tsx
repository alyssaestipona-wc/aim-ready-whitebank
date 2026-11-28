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
import { TemplateView } from "@/components/admin/template-view"
import TemplatesPage from "@/app/(console)/config/templates/page"
import TenantPage from "@/app/(console)/config/tenant/page"
import UsersPage from "@/app/(console)/config/users/page"
import WorkflowsPage from "@/app/(console)/config/workflows/page"
import { getState, submitProductDraft } from "@/mock"
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

  it("drafting and submitting shows no publish control here; the admin console approves it (D6)", async () => {
    setup("risk", "/config/products/PL", "", { code: "PL" })
    renderWithToasts(<ProductView code={(nav.params.code ?? "")} />)
    expect(screen.getByText(SIMULATED)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Create draft" }))
    expect(screen.getByLabelText("Maximum amount")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Submit for review" }))
    expect(screen.queryByRole("button", { name: "Approve and publish" })).not.toBeInTheDocument()
    expect(screen.getByText(/The tenant administrator approves and publishes it in the admin console/)).toBeInTheDocument()
    expect(getState().pdraft).toMatchObject({ inReview: true, author: "Rafael Cruz" })
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
    ["templates", TemplatesPage],
    ["notifications", NotificationConfigPage],
    ["users", UsersPage],
  ] as const)("%s has no edit or publish control for anyone", (_n, Page) => {
    setup("compliance", "/config")
    renderWithToasts(<Page />)
    expect(screen.queryByRole("button", { name: /edit|publish|draft|save|submit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })

  it("users lists 30 people over three pages", () => {
    setup("compliance", "/config/users")
    renderWithToasts(<UsersPage />)
    expect(screen.getByText("Showing 1–10 of 30")).toBeInTheDocument()
  })
})

describe("approval matrix (direct edit — PC-4, no maker-checker)", () => {
  it("shows the configured authority and override threshold", () => {
    setup("risk", "/config/matrix")
    renderWithToasts(<MatrixPage />)
    expect(screen.getByText("Up to ₱1,000,000")).toBeInTheDocument()
    expect(screen.getByText(/differs from the AI amount by ₱50,000 or more/)).toBeInTheDocument()
  })

  it("credit risk edits a level; the version increments and it is audited", async () => {
    setup("risk", "/config/matrix")
    renderWithToasts(<MatrixPage />)
    expect(screen.getByText("Published · v2")).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole("table")).getAllByRole("button", { name: "Edit" })[1] as HTMLElement)
    const amt = screen.getByLabelText("Amount limit")
    await userEvent.clear(amt)
    await userEvent.type(amt, "Up to ₱3,500,000")
    await userEvent.click(screen.getByRole("button", { name: "Save and publish" }))
    expect(screen.getByText("Published · v3")).toBeInTheDocument()
    expect(screen.getByText("Up to ₱3,500,000")).toBeInTheDocument()
    expect(lastAudit()).toMatchObject({ who: "Rafael Cruz", what: "Published approval matrix v3: level L2 now Up to ₱3,500,000, grades A–D" })
  })

  it("refuses an empty amount limit", async () => {
    setup("risk", "/config/matrix")
    renderWithToasts(<MatrixPage />)
    await userEvent.click(within(screen.getByRole("table")).getAllByRole("button", { name: "Edit" })[0] as HTMLElement)
    await userEvent.clear(screen.getByLabelText("Amount limit"))
    await userEvent.click(screen.getByRole("button", { name: "Save and publish" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Amount limit is required.")
    expect(getState().cfg.matrixVersion).toBe("v2")
  })

  it("compliance sees no edit control", () => {
    setup("compliance", "/config/matrix")
    renderWithToasts(<MatrixPage />)
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
  })
})

describe("decisioning rule set (maker-checker split across the app boundary — D6)", () => {
  it("drafts and submits; no publish control shows here (the admin console approves it)", async () => {
    setup("risk", "/config/decisioning")
    renderWithToasts(<DecisioningPage />)
    expect(screen.getByText(SIMULATED)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Create draft" }))
    await userEvent.click(screen.getByRole("switch", { name: "Toggle No existing default" }))
    expect(getState().cfg.draft?.rules.find((x) => x.id === "default")?.active).toBe(false)
    await userEvent.click(screen.getByRole("tab", { name: "Draft changes" }))
    expect(screen.getByText("− No existing default: inactive")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Submit for review" }))
    expect(screen.queryByRole("button", { name: "Approve and publish" })).not.toBeInTheDocument()
    expect(screen.getByText(/The tenant administrator approves and publishes it in the admin console/)).toBeInTheDocument()
    expect(getState().cfg.ruleset).toMatchObject({ inReview: true, author: "Rafael Cruz" })
  })

  it("adds a custom rule, and needs a name", async () => {
    setup("risk", "/config/decisioning")
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

describe("documents and templates (view-only here — editing moved to the admin console, PC-5)", () => {
  it.each(["risk", "compliance"] as const)("%s sees the body and preview with no edit controls", (role) => {
    setup(role, "/config/templates/decline")
    renderWithToasts(<TemplateView id="decline" />)
    expect(screen.getByText(/Reason: \{\{decline_reason\}\}/)).toBeInTheDocument()
    expect(screen.queryByLabelText("Template body")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /save|discard|delete/i })).not.toBeInTheDocument()
    expect(screen.getByText("Grace Medina")).toBeInTheDocument()
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

  it("is disabled for compliance", async () => {
    setup("compliance", "/config/models")
    renderWithToasts(<ModelsPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Automation controls" }))
    expect(screen.getByRole("button", { name: "Turn kill switch on" })).toBeDisabled()
  })
})

describe("AI module flag (PRD PLT-2, moved to the admin console)", () => {
  it.each(["risk", "compliance"] as const)("is disabled for %s", (role) => {
    setup(role, "/config/tenant")
    renderWithToasts(<TenantPage />)
    const toggle = screen.getByRole("switch", { name: "AI credit scoring" })
    expect(toggle).toBeDisabled()
    expect(toggle).toHaveAttribute("title", "Tenant administrator only, in the admin console")
  })
})

describe("failure drills (moved to the admin console)", () => {
  it.each(["risk", "compliance"] as const)("is disabled for %s", (role) => {
    setup(role, "/config/integrations")
    renderWithToasts(<IntegrationsPage />)
    expect(screen.getByRole("button", { name: "Simulate outage" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Fail next booking" })).toBeDisabled()
  })
})
