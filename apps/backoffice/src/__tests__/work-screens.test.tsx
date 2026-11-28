import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import NewApplicationPage from "@/app/(console)/applications/new/page"
import ApplicationsPage from "@/app/(console)/applications/page"
import CasePage from "@/app/(console)/applications/[id]/page"
import BookingPage from "@/app/(console)/booking/page"
import QueuesPage from "@/app/(console)/queues/page"
import SigningPage from "@/app/(console)/signing/page"
import { findApp, getState } from "@/mock"
import { update } from "@/mock/store"

import { renderWithToasts, setup } from "./helpers"

const rows = () => within(screen.getAllByRole("table")[0]!).getAllByRole("row").slice(1)

describe("applications list", () => {
  it("pages and filters", async () => {
    setup("officer", "/applications")
    renderWithToasts(<ApplicationsPage />)
    expect(rows()).toHaveLength(10)
    await userEvent.click(screen.getByRole("button", { name: "2" }))
    expect(screen.getByText(/^Showing 11–20 of \d+$/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("tab", { name: /^All/ }))
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Decision" }), "decline")
    expect(screen.getByText(/^Showing 1–\d+ of \d+$|^\d+ results?$/)).toBeInTheDocument()
    expect(rows().every((r) => r.textContent?.includes("Auto-decline"))).toBe(true)
  })
})

describe("queues", () => {
  it("shows the unassigned tab with Pick for officers", async () => {
    setup("officer", "/queues")
    renderWithToasts(<QueuesPage />)
    await userEvent.click(screen.getByRole("tab", { name: /Unassigned/ }))
    expect(screen.getAllByRole("button", { name: "Pick" }).length).toBeGreaterThan(0)
  })
})

describe("case detail", () => {
  it("reveals the government ID after confirming and records it", async () => {
    setup("officer", "/applications/APP-2041", "", { id: "APP-2041" })
    renderWithToasts(<CasePage />)
    expect(screen.getByText(/PSN-••••-••••-/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Reveal" }))
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reveal" }))
    expect(screen.getByText(findApp(getState(), "APP-2041")!.govId!)).toBeInTheDocument()
    expect(findApp(getState(), "APP-2041")!.hist.at(-1)!.what).toBe("Revealed masked government ID")
  })

  it("opens documents in the viewer; missing documents are not clickable", async () => {
    setup("officer", "/applications/APP-2050", "", { id: "APP-2050" })
    renderWithToasts(<CasePage />)
    await userEvent.click(screen.getByRole("button", { name: "View Government ID" }))
    const dlg = screen.getByRole("dialog", { name: "Government ID" })
    expect(within(dlg).getByText("gov_id_scan.jpg")).toBeInTheDocument()
    expect(within(dlg).getByText("v1")).toBeInTheDocument()
    expect(dlg.querySelector("[data-doc-kind=id]")).toBeInTheDocument()
  })

  it("does not make missing documents clickable", () => {
    setup("officer", "/applications/APP-2047", "", { id: "APP-2047" })
    renderWithToasts(<CasePage />)
    expect(screen.getByText("Payslip")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "View Payslip" })).not.toBeInTheDocument()
  })

  it("pages the activity history 8 at a time with an actor filter", async () => {
    setup("officer", "/applications/APP-2041", "", { id: "APP-2041" })
    renderWithToasts(<CasePage />)
    const hist = screen.getByRole("list", { name: "Activity history" })
    expect(within(hist).getAllByRole("listitem")).toHaveLength(8)
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Actor" }), "borrower")
    expect(within(screen.getByRole("list", { name: "Activity history" })).getAllByRole("listitem")).toHaveLength(1)
  })

  it("labels a knockout decline as a simulated decision", () => {
    setup("officer", "/applications/APP-2050", "", { id: "APP-2050" })
    renderWithToasts(<CasePage />)
    expect(screen.getByText(/Not scored: a policy knockout/)).toBeInTheDocument()
    expect(screen.getByText(/^Simulated decision pipeline/)).toBeInTheDocument()
  })

  it("throws not-found for an unknown case", () => {
    setup("officer", "/applications/APP-0000", "", { id: "APP-0000" })
    expect(() => renderWithToasts(<CasePage />)).toThrow("NEXT_NOT_FOUND")
  })

  it("gives compliance no enabled actions", () => {
    setup("compliance", "/applications/APP-2041", "", { id: "APP-2041" })
    renderWithToasts(<CasePage />)
    expect(screen.getByRole("button", { name: "Request information" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Recommend decision" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Recommend decision" })).toHaveAttribute("title", "Read-only access")
  })

  it("request-info dialog shows a red inline error with no items", async () => {
    setup("officer", "/applications/APP-2041", "", { id: "APP-2041" })
    renderWithToasts(<CasePage />)
    await userEvent.click(screen.getByRole("button", { name: "Request information" }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Bank statements, last 3 months" }))
    await userEvent.click(screen.getByRole("button", { name: "Send request" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Pick at least one item to request.")
    expect(findApp(getState(), "APP-2041")!.stage).toBe("Review")
  })

  it("recommend dialog flags an override and requires a reason", async () => {
    setup("officer", "/applications/APP-2056", "", { id: "APP-2056" })
    renderWithToasts(<CasePage />)
    await userEvent.click(screen.getByRole("button", { name: "Recommend decision" }))
    const amount = screen.getByLabelText("Amount")
    await userEvent.clear(amount)
    await userEvent.type(amount, "120000")
    expect(screen.getByText(/Override above threshold \(₱60,000 from AI\)\./)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Send to approver" }))
    expect(screen.getByRole("alert")).toHaveTextContent("This differs from the AI recommendation. Choose a reason code.")
    await userEvent.selectOptions(screen.getByLabelText("Reason code"), "Lower amount keeps repayments affordable")
    await userEvent.click(screen.getByRole("button", { name: "Send to approver" }))
    expect(findApp(getState(), "APP-2056")!.stage).toBe("Approval")
  })

  it("approver confirms an approval with the monthly repayment", async () => {
    setup("approver", "/applications/APP-2043", "", { id: "APP-2043" })
    renderWithToasts(<CasePage />)
    await userEvent.click(screen.getByRole("button", { name: "Approve" }))
    const dlg = screen.getByRole("dialog", { name: "Approve ₱120,000 over 24 months?" })
    expect(within(dlg).getByText(/Monthly repayment ₱6,800\.00 at grade C/)).toBeInTheDocument()
    await userEvent.click(within(dlg).getByRole("button", { name: "Approve and send offer" }))
    expect(findApp(getState(), "APP-2043")!.stage).toBe("Offer")
  })
})

describe("assisted application", () => {
  it("marks a missing amount red and creates nothing", async () => {
    setup("branch", "/applications/new")
    renderWithToasts(<NewApplicationPage />)
    const count = getState().apps.length
    const amount = screen.getByLabelText("Amount")
    await userEvent.clear(amount)
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))
    expect(screen.getByText("Amount must be between ₱20,000 and ₱500,000.")).toHaveClass("text-danger")
    expect(screen.getByLabelText("Amount")).toHaveAttribute("aria-invalid", "true")
    expect(getState().apps.length).toBe(count)
  })

  it("formats money on blur with a peso prefix", async () => {
    setup("branch", "/applications/new")
    renderWithToasts(<NewApplicationPage />)
    const amount = screen.getByLabelText("Amount") as HTMLInputElement
    await userEvent.clear(amount)
    await userEvent.type(amount, "250000")
    await userEvent.tab()
    expect(amount.value).toBe("250,000.00")
  })
})

describe("signing and booking screens", () => {
  it("generate and send moves a case to awaiting signature", async () => {
    setup("ops", "/signing")
    renderWithToasts(<SigningPage />)
    const btn = screen.getAllByRole("button", { name: "Generate and send" })[0]!
    await userEvent.click(btn)
    expect(screen.getAllByText("Sent · awaiting signature").length).toBeGreaterThan(1)
  })

  it("shows the simulated maker-checker notice and blocks compliance", () => {
    setup("compliance", "/booking", "case=APP-2054")
    renderWithToasts(<BookingPage />)
    expect(screen.getByText("Maker-checker is simulated in this prototype until the API enforces it.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Approve and book" })).toBeDisabled()
  })

  it("supervisor books from the booking screen", async () => {
    setup("opssup", "/booking", "case=APP-2054")
    renderWithToasts(<BookingPage />)
    await userEvent.click(screen.getByRole("button", { name: "Approve and book" }))
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve and book" }))
    expect(findApp(getState(), "APP-2054")!.stage).toBe("Disbursed")
  })

  it("maker submits a ready case", async () => {
    setup("ops", "/booking")
    const first = getState().apps.find((a) => a.stage === "Booking" && a.booking?.status !== "failed")!
    act(() => update(() => undefined))
    renderWithToasts(<BookingPage />)
    await userEvent.click(screen.getByRole("button", { name: "Submit booking for checker" }))
    expect(findApp(getState(), first.id)!.stage).toBe("Pending checker")
  })
})
