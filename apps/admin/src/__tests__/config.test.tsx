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
import AuditLogPage from "@/app/(console)/compliance/audit/page"
import { ConsoleShell } from "@/components/console-shell"
import { allowed } from "@/lib/access"
import { getState } from "@/mock"
import { update } from "@/mock/store"

import { renderWithToasts, setup } from "./helpers"
import { nav } from "./nav-mock"

const lastAudit = () => getState().audit[0]

describe("products (maker-checker split across the app boundary — D6)", () => {
  it("lists products and pages campaigns", async () => {
    setup("admin", "/config/products")
    const l = renderWithToasts(<ProductsPage />)
    expect(screen.getByText("Personal loan")).toBeInTheDocument()
    expect(screen.getByText("Published · v6")).toBeInTheDocument()
    l.unmount()
    setup("admin", "/config/products/PL", "", { code: "PL" })
    renderWithToasts(<ProductView code="PL" />)
    await userEvent.click(screen.getByRole("tab", { name: "Pre-approved offers" }))
    expect(within(screen.getByRole("table", { name: "Pre-approved offer campaigns" })).getAllByRole("row")).toHaveLength(11)
  })

  it("is pre-seeded with the credit-risk draft already submitted and awaiting approval", () => {
    setup("admin", "/config/products/PL")
    renderWithToasts(<ProductView code="PL" />)
    expect(screen.getByText("In review · v7")).toBeInTheDocument()
    expect(screen.getByText(/Submitted by Rafael Cruz/)).toBeInTheDocument()
  })

  it("the administrator publishes the credit-risk-drafted change; the version increments and both people are named", async () => {
    setup("admin", "/config/products/PL")
    renderWithToasts(<ProductView code="PL" />)
    await userEvent.click(screen.getByRole("button", { name: "Approve and publish" }))
    expect(screen.getByText("Published · v7")).toBeInTheDocument()
    expect(lastAudit()).toMatchObject({ who: "Jonas Mercado", what: expect.stringContaining("Approved and published Personal loan v7 (maker-checker; drafted by Rafael Cruz)") })
  })

  it("the administrator cannot publish their own draft", async () => {
    setup("admin", "/config/products/PL")
    act(() => {
      update((s) => {
        s.pdraft = null
      })
    })
    renderWithToasts(<ProductView code="PL" />)
    await userEvent.click(screen.getByRole("button", { name: "Create draft" }))
    await userEvent.click(screen.getByRole("button", { name: "Submit for review" }))
    const publish = screen.getByRole("button", { name: "Approve and publish" })
    expect(publish).toBeDisabled()
    expect(publish).toHaveAttribute("title", "You submitted this change; a different person must approve it")
  })
})

describe("workflows (read-only in this port)", () => {
  it("renders the maker-checker tab naming both apps' roles", async () => {
    setup("admin", "/config/workflows")
    renderWithToasts(<WorkflowsPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Maker-checker" }))
    expect(screen.getByText("Rule, product and model changes")).toBeInTheDocument()
  })
})

describe("approval matrix (direct edit, independent version — PC-4)", () => {
  it("edits a level; the version increments and it is audited", async () => {
    setup("admin", "/config/matrix")
    renderWithToasts(<MatrixPage />)
    expect(screen.getByText("Published · v2")).toBeInTheDocument()
    await userEvent.click(within(screen.getAllByRole("row")[1]!).getByRole("button", { name: "Edit" }))
    const dialog = screen.getByRole("dialog")
    await userEvent.clear(within(dialog).getByLabelText("Amount limit"))
    await userEvent.type(within(dialog).getByLabelText("Amount limit"), "Up to ₱1,500,000")
    await userEvent.click(within(dialog).getByRole("button", { name: "Save and publish" }))
    expect(screen.getByText("Published · v3")).toBeInTheDocument()
    expect(screen.getByText("Up to ₱1,500,000")).toBeInTheDocument()
    expect(lastAudit()).toMatchObject({ who: "Jonas Mercado", what: expect.stringContaining("Published approval matrix v3") })
  })

  it("refuses an empty amount limit, naming the missing field", async () => {
    setup("admin", "/config/matrix")
    renderWithToasts(<MatrixPage />)
    await userEvent.click(within(screen.getAllByRole("row")[1]!).getByRole("button", { name: "Edit" }))
    const dialog = screen.getByRole("dialog")
    await userEvent.clear(within(dialog).getByLabelText("Amount limit"))
    await userEvent.click(within(dialog).getByRole("button", { name: "Save and publish" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Amount limit is required.")
    expect(getState().cfg.matrixVersion).toBe("v2")
  })
})

describe("documents and templates (full editor, always on — PC-5)", () => {
  it("inserts a merge field at the cursor and the preview substitutes its sample value", async () => {
    setup("admin", "/config/templates/decline")
    renderWithToasts(<TemplateView id="decline" />)
    const body = screen.getByLabelText("Template body") as HTMLTextAreaElement
    body.focus()
    body.setSelectionRange(0, 0)
    await userEvent.click(screen.getByRole("button", { name: "+ {{borrower_name}}" }))
    expect(body.value.startsWith("{{borrower_name}}")).toBe(true)
  })

  it("shows the dirty bar, saves a new version, and audits it", async () => {
    setup("admin", "/config/templates/decline")
    renderWithToasts(<TemplateView id="decline" />)
    expect(screen.getByText("Published · v4")).toBeInTheDocument()
    expect(screen.queryByText(/Unsaved changes/)).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Template body"), " Extra line.")
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Save as new version" }))
    expect(screen.getByText("Published · v5")).toBeInTheDocument()
    expect(lastAudit()).toMatchObject({ who: "Jonas Mercado", what: "Published Decline letter v5" })
  })

  it("discards unsaved edits back to the published version", async () => {
    setup("admin", "/config/templates/decline")
    renderWithToasts(<TemplateView id="decline" />)
    await userEvent.type(screen.getByLabelText("Template body"), " Extra line.")
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))
    expect(screen.queryByText(/Unsaved changes/)).not.toBeInTheDocument()
    expect((screen.getByLabelText("Template body") as HTMLTextAreaElement).value).not.toContain("Extra line.")
  })

  it("blocks delete while this app's open-case stand-in still references it, and allows it once unreferenced", async () => {
    setup("admin", "/config/templates/decline")
    renderWithToasts(<TemplateView id="decline" />)
    await userEvent.click(screen.getByRole("button", { name: "Delete template" }))
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Can’t delete Decline letter: still referenced by an open loan’s documents.")
    expect(getState().cfg.templates.some((t) => t.id === "decline")).toBe(true)

    act(() => {
      update((s) => {
        s.openCaseDocs = []
      })
    })
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(getState().cfg.templates.some((t) => t.id === "decline")).toBe(false)
    expect(lastAudit()).toMatchObject({ what: "Deleted template Decline letter" })
  })

  it("rows link into the detail route", async () => {
    setup("admin", "/config/templates")
    renderWithToasts(<TemplatesPage />)
    expect(screen.getByText("Decline letter")).toBeInTheDocument()
  })
})

describe("notifications (read-only in this port)", () => {
  it("shows the template list and a sample delivery log", async () => {
    setup("admin", "/config/notifications")
    renderWithToasts(<NotificationConfigPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Delivery log" }))
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1)
  })
})

describe("decisioning rule set (maker-checker split across the app boundary — D6)", () => {
  it("is pre-seeded with the draft already submitted by credit risk", () => {
    setup("admin", "/config/decisioning")
    renderWithToasts(<DecisioningPage />)
    expect(screen.getByText("In review · v5")).toBeInTheDocument()
    expect(screen.getByText(/Submitted by Rafael Cruz/)).toBeInTheDocument()
  })

  it("the administrator publishes it", async () => {
    setup("admin", "/config/decisioning")
    renderWithToasts(<DecisioningPage />)
    await userEvent.click(screen.getByRole("button", { name: "Approve and publish" }))
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve and publish" }))
    expect(screen.getByText("Published · v5")).toBeInTheDocument()
    expect(lastAudit()).toMatchObject({ who: "Jonas Mercado", what: expect.stringContaining("Approved and published rule set v5 (maker-checker; drafted by Rafael Cruz)") })
  })

  it("compares the draft in the test harness", async () => {
    setup("admin", "/config/decisioning")
    renderWithToasts(<DecisioningPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Test harness" }))
    expect(screen.getByText(/Same sample, both versions/)).toBeInTheDocument()
  })
})

describe("AI models (view-only automation here — automation stays in the staff console)", () => {
  it("shows registry and disabled automation controls", async () => {
    setup("admin", "/config/models")
    renderWithToasts(<ModelsPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Automation controls" }))
    expect(screen.getByRole("combobox", { name: "Mode for Personal loan" })).toBeDisabled()
  })
})

describe("integrations (failure drills, PRD AIS-7 adjacent)", () => {
  it("toggles both drills; each is audited", async () => {
    setup("admin", "/config/integrations")
    renderWithToasts(<IntegrationsPage />)
    await userEvent.click(screen.getByRole("button", { name: "Simulate outage" }))
    expect(getState().cfg.bureauDown).toBe(true)
    expect(lastAudit()).toMatchObject({ what: "Failure drill: credit bureau outage simulated" })
    await userEvent.click(screen.getByRole("button", { name: "Fail next booking" }))
    expect(lastAudit()).toMatchObject({ what: "Failure drill: next core booking will time out" })
    await userEvent.click(screen.getByRole("button", { name: "Restore bureau" }))
    expect(lastAudit()).toMatchObject({ what: "Credit bureau restored" })
  })
})

describe("users and roles (read-only)", () => {
  it("lists the directory", () => {
    setup("admin", "/config/users")
    renderWithToasts(<UsersPage />)
    expect(screen.getByText("Jonas Mercado")).toBeInTheDocument()
  })
})

describe("tenant settings and the AI module flag (PRD PLT-2)", () => {
  it("turns the module off: nav item gone, route refused, audited; and back on", async () => {
    setup("admin", "/config/tenant")
    renderWithToasts(<TenantPage />)
    await userEvent.click(screen.getByRole("switch", { name: "AI credit scoring" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Existing records are kept, not deleted.")
    await userEvent.click(screen.getByRole("button", { name: "Turn off" }))
    expect(getState().flags.ai).toBe(false)
    expect(lastAudit()).toMatchObject({ who: "Jonas Mercado", what: "Turned off module: AI credit scoring" })
    expect(document.cookie).toContain("wbl_admin_flags=")
    expect(allowed("models", getState().flags)).toBe(false)
    renderWithToasts(<ConsoleShell>x</ConsoleShell>)
    expect(screen.queryByRole("link", { name: "AI models" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("switch", { name: "AI credit scoring" }))
    await userEvent.click(screen.getByRole("button", { name: "Turn on" }))
    expect(lastAudit()).toMatchObject({ what: "Turned on module: AI credit scoring" })
    expect(allowed("models", getState().flags)).toBe(true)
  })
})

describe("audit log", () => {
  it("lists entries and filters by action type", async () => {
    setup("admin", "/compliance/audit")
    renderWithToasts(<AuditLogPage />)
    expect(screen.getByText(/Admin console provisioned/)).toBeInTheDocument()
  })
})

describe("reset demo data (5.7)", () => {
  it("restores the seed and keeps the administrator signed in", async () => {
    setup("admin", "/config/products")
    act(() => {
      update((s) => {
        s.cfg.killSwitch = true
        s.flags.ai = false
      })
    })
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    await userEvent.click(screen.getByRole("button", { name: "Reset demo data" }))
    await userEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(getState().cfg.killSwitch).toBe(false)
    expect(getState().flags.ai).toBe(true)
    expect(getState().pdraft).toMatchObject({ code: "PL", author: "Rafael Cruz", inReview: true })
    expect(nav.router.push).toHaveBeenCalledWith("/config/products")
  })
})
