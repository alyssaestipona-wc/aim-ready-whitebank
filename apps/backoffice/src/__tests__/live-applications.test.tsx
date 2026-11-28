import { screen, waitFor, within } from "@testing-library/react"
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
  slaHoursLeft: null,
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
  slaHoursLeft: null,
  infoRequestItems: null,
  infoRequestMessage: null,
  recommendation: null,
  aiRecommendation: null,
  reviewerId: null,
  declineReasonCode: null,
  decidedAt: null,
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

const REVIEW_DETAIL = { ...DETAIL, stage: "Review", assigneeId: "officer", aiRecommendation: { decision: "approve", amount: 15_000_000, tenor: 24 } }

const APPROVAL_DETAIL = {
  ...DETAIL,
  stage: "Approval",
  aiRecommendation: { decision: "approve", amount: 15_000_000, tenor: 24 },
  recommendation: {
    by: "officer",
    decision: "approve",
    amount: 15_000_000,
    tenor: 24,
    reasonCode: null,
    overrideLevel: null,
    note: null,
    recommendedAt: "2026-11-28T06:00:00.000Z",
  },
}

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

describe("approve/decline/return on a recommended application", () => {
  it("shows Approve/Decline/Return to an approver while the application is in Approval", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, APPROVAL_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Return to officer" })).toBeInTheDocument()
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
    mockFetchOnce(200, APPROVAL_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByText("Application app-1")).toBeInTheDocument())
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument()
  })

  it("hides the actions while the application has no recommendation yet (Review stage)", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByText("Application app-1")).toBeInTheDocument())
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument()
  })

  it("shows the officer's recommendation before deciding", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, APPROVAL_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByText("Officer recommendation")).toBeInTheDocument())
    const card = screen.getByText("Officer recommendation").closest("div")!
    expect(within(card).getByText(/Approve ₱150,000 \/ 24 months/)).toBeInTheDocument()
  })

  it("approves and refetches the application, now showing Offer", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, APPROVAL_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument())

    mockFetchOnce(200, { ok: true, stage: "Offer", monthlyPayment: 712_000 })
    mockFetchOnce(200, { ...DETAIL, stage: "Offer" })
    await userEvent.click(screen.getByRole("button", { name: "Approve" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument())
  })

  it("requires a reason before declining", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, APPROVAL_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument())
    await userEvent.click(screen.getByRole("button", { name: "Decline" }))
    expect(screen.getByText("Choose a reason before declining.")).toBeInTheDocument()
  })

  it("declines with a chosen reason and refetches, now showing Declined", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, APPROVAL_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument())

    await userEvent.selectOptions(screen.getByLabelText("Decline reason"), "Insufficient verified income")
    mockFetchOnce(200, { ok: true, stage: "Declined" })
    mockFetchOnce(200, { ...DETAIL, stage: "Declined" })
    await userEvent.click(screen.getByRole("button", { name: "Decline" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Decline" })).not.toBeInTheDocument())
  })

  it("refuses to approve own recommendation inline, without a network call", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, { ...APPROVAL_DETAIL, recommendation: { ...APPROVAL_DETAIL.recommendation, by: "approver" } })
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument())
    const callsBefore = vi.mocked(fetch).mock.calls.length
    await userEvent.click(screen.getByRole("button", { name: "Approve" }))
    expect(screen.getByText("You recommended this case. A different approver must decide it.")).toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
  })

  it("shows the server's refusal when the decide request is above authority", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, APPROVAL_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument())

    mockFetchOnce(200, { ok: false, error: "This application is above your delegated authority (limit ₱1,000,000.00, grades A–C)." })
    await userEvent.click(screen.getByRole("button", { name: "Approve" }))
    await waitFor(() => expect(screen.getByText(/above your delegated authority/)).toBeInTheDocument())
  })

  it("returns the application to the officer and refetches, now showing Review", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, APPROVAL_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Return to officer" })).toBeInTheDocument())

    mockFetchOnce(200, { ok: true })
    mockFetchOnce(200, REVIEW_DETAIL)
    await userEvent.click(screen.getByRole("button", { name: "Return to officer" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Return to officer" })).not.toBeInTheDocument())
  })
})

describe("recommend a decision", () => {
  it("shows the recommend form to the owning officer on a Review-stage application", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Send recommendation" })).toBeInTheDocument())
    expect(screen.getByText(/AI recommendation: approve ₱150,000 \/ 24 months/)).toBeInTheDocument()
  })

  it("does not show the recommend form to a non-owning staff user", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, { ...REVIEW_DETAIL, assigneeId: "someone-else" })
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByText("Application app-1")).toBeInTheDocument())
    expect(screen.queryByRole("button", { name: "Send recommendation" })).not.toBeInTheDocument()
  })

  it("refuses a differing recommendation with no reason code, inline, without a network call", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Send recommendation" })).toBeInTheDocument())

    await userEvent.selectOptions(screen.getByLabelText("Recommendation"), "counter")
    const amountInput = screen.getByLabelText("Recommended amount")
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, "90000")

    const callsBefore = vi.mocked(fetch).mock.calls.length
    await userEvent.click(screen.getByRole("button", { name: "Send recommendation" }))
    expect(screen.getByText("This differs from the AI recommendation. Choose a reason code.")).toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
  })

  it("sends a recommendation and refetches, now showing Approval", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Send recommendation" })).toBeInTheDocument())

    mockFetchOnce(200, { ok: true, stage: "Approval", overrideLevel: null })
    mockFetchOnce(200, APPROVAL_DETAIL)
    await userEvent.click(screen.getByRole("button", { name: "Send recommendation" }))
    await waitFor(() => expect(screen.getByText("Officer recommendation")).toBeInTheDocument())
  })
})

describe("SLA display", () => {
  it("flags a breached application in the list", async () => {
    setup("officer", "/live-applications")
    mockFetchOnce(200, [{ ...LIST_ITEM, slaHoursLeft: -3 }])
    renderWithToasts(<LiveApplicationsPage />)
    await waitFor(() => expect(screen.getByText(/breached/)).toBeInTheDocument())
  })

  it("shows hours left on the detail screen", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, { ...DETAIL, slaHoursLeft: 36 })
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByText(/36h left/)).toBeInTheDocument())
  })
})

describe("request and resolve information", () => {
  it("shows the request-information form to an officer on a Review-stage application", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Send request" })).toBeInTheDocument())
  })

  it("refuses to send with no items chosen", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Send request" })).toBeInTheDocument())
    await userEvent.click(screen.getByRole("button", { name: "Send request" }))
    expect(screen.getByText("Choose at least one item to request.")).toBeInTheDocument()
  })

  it("sends a request with at least one item and a message, then refetches", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, REVIEW_DETAIL)
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Send request" })).toBeInTheDocument())

    await userEvent.click(screen.getByText("Bank statements, last 3 months"))
    await userEvent.type(screen.getByLabelText("Message to borrower"), "Please upload your statements.")

    mockFetchOnce(200, { ok: true })
    mockFetchOnce(200, { ...REVIEW_DETAIL, stage: "Info requested" })
    await userEvent.click(screen.getByRole("button", { name: "Send request" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Mark resolved" })).toBeInTheDocument())
  })

  it("shows Mark resolved to an officer on an Info-requested application, and resolves it", async () => {
    setup("officer", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, {
      ...REVIEW_DETAIL,
      stage: "Info requested",
      infoRequestItems: ["ri1"],
      infoRequestMessage: "Please upload your statements.",
    })
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Mark resolved" })).toBeInTheDocument())
    expect(screen.getByText("Please upload your statements.")).toBeInTheDocument()
    expect(screen.getByText("Bank statements, last 3 months")).toBeInTheDocument()

    mockFetchOnce(200, { ok: true })
    mockFetchOnce(200, REVIEW_DETAIL)
    await userEvent.click(screen.getByRole("button", { name: "Mark resolved" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mark resolved" })).not.toBeInTheDocument())
  })

  it("does not show request/resolve actions to a non-officer role", async () => {
    setup("approver", "/live-applications/app-1", "", { id: "app-1" })
    mockFetchOnce(200, { ...REVIEW_DETAIL, stage: "Info requested" })
    renderWithToasts(<LiveApplicationDetailPage />)
    await waitFor(() => expect(screen.getByText("Application app-1")).toBeInTheDocument())
    expect(screen.queryByRole("button", { name: "Send request" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Mark resolved" })).not.toBeInTheDocument()
  })
})
