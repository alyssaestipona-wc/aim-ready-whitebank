import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import LiveApplicationsPage from "@/app/(console)/live-applications/page"
import LiveApplicationDetailPage from "@/app/(console)/live-applications/[id]/page"

import { renderWithToasts, setup } from "./helpers"

const LIST_ITEM = {
  id: "app-1",
  productCode: "PL",
  amount: 15_000_000,
  tenor: 24,
  stage: "Offer",
  outcome: "approve",
  grade: "A",
  assigneeId: null,
}

const DETAIL = {
  id: "app-1",
  tenantId: "kalinaw",
  borrowerId: "borrower-1",
  productCode: "PL",
  amount: 15_000_000,
  tenor: 24,
  income: 6_800_000,
  obligations: 750_000,
  purpose: "Home improvement",
  stage: "Offer",
  assigneeId: null,
  decision: {
    outcome: "approve",
    score: 720,
    grade: "A",
    pd: 0.03,
    rules: [{ id: "age", name: "Age within range", res: "p", val: "36" }],
    bands: { approve: 650, decline: 500 },
    trigger: "",
    reasons: [{ t: "Strong bureau file", pos: true }],
    ruleSetVersion: "2026.1",
    modelVersion: "sim-1",
  },
  createdAt: "2026-11-28T06:00:00.000Z",
  consents: [
    { kind: "credit_check", capturedAt: "2026-11-28T06:00:00.000Z", termsVersion: "v3.2" },
    { kind: "data_processing", capturedAt: "2026-11-28T06:00:00.000Z", termsVersion: "v3.2" },
    { kind: "terms", capturedAt: "2026-11-28T06:00:00.000Z", termsVersion: "v3.2" },
  ],
}

const REVIEW_DETAIL = { ...DETAIL, stage: "Review" }

function mockFetchOnce(status: number, body: unknown) {
  vi.mocked(fetch).mockImplementationOnce(
    async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  )
}

describe("real applications list", () => {
  it("renders real rows from apps/api", async () => {
    setup("officer", "/live-applications")
    mockFetchOnce(200, [LIST_ITEM])
    renderWithToasts(<LiveApplicationsPage />)
    await waitFor(() => expect(screen.getByText("app-1")).toBeInTheDocument())
    expect(screen.getByText("approve")).toBeInTheDocument()
  })

  it("shows a distinct error when the service is unreachable", async () => {
    setup("officer", "/live-applications")
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"))
    renderWithToasts(<LiveApplicationsPage />)
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
  })

  it("defaults to the My queue tab, requesting queue=mine", async () => {
    setup("officer", "/live-applications")
    mockFetchOnce(200, [LIST_ITEM])
    renderWithToasts(<LiveApplicationsPage />)
    await waitFor(() => expect(screen.getByText("app-1")).toBeInTheDocument())
    const [url] = vi.mocked(fetch).mock.calls[0] as [string]
    expect(url).toContain("queue=mine")
  })

  it("requests queue=unassigned on the Unassigned tab and shows a Pick button for an officer", async () => {
    setup("officer", "/live-applications")
    mockFetchOnce(200, [LIST_ITEM])
    renderWithToasts(<LiveApplicationsPage />)
    await waitFor(() => expect(screen.getByText("app-1")).toBeInTheDocument())

    mockFetchOnce(200, [{ ...LIST_ITEM, stage: "Review" }])
    await userEvent.click(screen.getByRole("tab", { name: "Unassigned" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Pick" })).toBeInTheDocument())
    const lastCall = vi.mocked(fetch).mock.calls.at(-1) as [string]
    expect(lastCall[0]).toContain("queue=unassigned")
  })

  it("does not show a Pick button for a non-officer role", async () => {
    setup("approver", "/live-applications")
    mockFetchOnce(200, [])
    renderWithToasts(<LiveApplicationsPage />)
    await waitFor(() => expect(screen.getByText("No real applications here")).toBeInTheDocument())

    mockFetchOnce(200, [{ ...LIST_ITEM, stage: "Review" }])
    await userEvent.click(screen.getByRole("tab", { name: "Unassigned" }))
    await waitFor(() => expect(screen.getByText("app-1")).toBeInTheDocument())
    expect(screen.queryByRole("button", { name: "Pick" })).not.toBeInTheDocument()
  })

  it("picks an application and refetches the Unassigned tab", async () => {
    setup("officer", "/live-applications")
    mockFetchOnce(200, [])
    renderWithToasts(<LiveApplicationsPage />)
    await waitFor(() => expect(screen.getByText("No real applications here")).toBeInTheDocument())

    mockFetchOnce(200, [{ ...LIST_ITEM, stage: "Review" }])
    await userEvent.click(screen.getByRole("tab", { name: "Unassigned" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Pick" })).toBeInTheDocument())

    mockFetchOnce(200, { ok: true })
    mockFetchOnce(200, [])
    await userEvent.click(screen.getByRole("button", { name: "Pick" }))
    await waitFor(() => expect(screen.getByText("No real applications here")).toBeInTheDocument())
  })
})

describe("real application detail", () => {
  it("renders the decision summary and consent records", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByText("Application app-1")).toBeInTheDocument())
    expect(screen.getByText("approve")).toBeInTheDocument()
    expect(screen.getByText(/Strong bureau file/)).toBeInTheDocument()
    expect(screen.getByText("credit_check")).toBeInTheDocument()
  })

  it("shows a distinct error when the token is missing", async () => {
    setup(null, "/live-applications/app-1", "", { id: "app-1" })
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
  })
})

describe("approve/decline on a referred application", () => {
  it("shows Approve/Decline to an approver while the application is in Review", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument()
  })

  it("hides the actions once the application is already decided", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, DETAIL) // stage: "Offer"
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByText("Application app-1")).toBeInTheDocument())
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Decline" })).not.toBeInTheDocument()
  })

  it("hides the actions from a non-approver role", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByText("Application app-1")).toBeInTheDocument())
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument()
  })

  it("approves and refetches the application, now showing Offer", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument())

    mockFetchOnce(200, { ok: true, stage: "Offer", monthlyPayment: 712_000 })
    mockFetchOnce(200, { ...DETAIL, stage: "Offer" })
    await userEvent.click(screen.getByRole("button", { name: "Approve" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument())
  })

  it("requires a reason before declining", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument())
    await userEvent.click(screen.getByRole("button", { name: "Decline" }))
    expect(screen.getByText("Choose a reason before declining.")).toBeInTheDocument()
  })

  it("declines with a chosen reason and refetches, now showing Declined", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument())

    await userEvent.selectOptions(screen.getByLabelText("Decline reason"), "Insufficient verified income")
    mockFetchOnce(200, { ok: true, stage: "Declined" })
    mockFetchOnce(200, { ...DETAIL, stage: "Declined" })
    await userEvent.click(screen.getByRole("button", { name: "Decline" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Decline" })).not.toBeInTheDocument())
  })

  it("shows the server's refusal when the decide request is above authority", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument())

    mockFetchOnce(200, { ok: false, error: "This application is above your delegated authority (limit ₱1,000,000.00, grades A–C)." })
    await userEvent.click(screen.getByRole("button", { name: "Approve" }))
    await waitFor(() => expect(screen.getByText(/above your delegated authority/)).toBeInTheDocument())
  })
})
