import { screen, waitFor } from "@testing-library/react"
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
