import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import MyApplicationsPage from "@/app/my-applications/page"
import { renderPage, resetAll } from "@/test/utils"

const SESSION_COOKIE = "wbl_borrower_session"

function base64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url")
}

/** A real-shaped (unsigned) session token `decodeSessionToken` can parse - the browser never checks the signature. */
function fakeToken(email = "juan.delacruz@email.com") {
  const payload = {
    typ: "session",
    sub: "borrower-1",
    tenantId: "kalinaw",
    appScope: "borrower",
    role: "borrower",
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  return `h.${base64url(payload)}.s`
}

function signIn(email?: string) {
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(fakeToken(email))}; path=/`
}

const ITEM = {
  id: "app-1",
  productCode: "PL",
  amount: 15_000_000,
  tenor: 24,
  stage: "Review",
  outcome: "pending",
  declineReasonCode: null,
  createdAt: "2026-11-28T06:00:00.000Z",
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

function mockFetchOnce(status: number, body: unknown) {
  vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse(status, body))
}

describe("my-applications (real)", () => {
  beforeEach(() => resetAll())

  it("renders real applications from apps/api", async () => {
    signIn()
    mockFetchOnce(200, [ITEM])
    renderPage(<MyApplicationsPage />, "/my-applications")
    await waitFor(() => expect(screen.getByText(/We're reviewing your application/)).toBeInTheDocument())
    expect(screen.getByText("Signed in as juan.delacruz@email.com")).toBeInTheDocument()
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toContain("/applications/mine")
    expect((init.headers as Record<string, string>)["Authorization"]).toContain("Bearer ")
  })

  it("keeps showing a declined application with its final status", async () => {
    signIn()
    mockFetchOnce(200, [{ ...ITEM, stage: "Declined", outcome: "decline", declineReasonCode: "Insufficient verified income" }])
    renderPage(<MyApplicationsPage />, "/my-applications")
    await waitFor(() => expect(screen.getByText("Not approved")).toBeInTheDocument())
    expect(screen.getByText(/verify enough income/)).toBeInTheDocument()
  })

  it("reads an Approval-stage application as in review, never showing the word Approval", async () => {
    signIn()
    mockFetchOnce(200, [{ ...ITEM, stage: "Approval" }])
    renderPage(<MyApplicationsPage />, "/my-applications")
    await waitFor(() => expect(screen.getByText("In review")).toBeInTheDocument())
    expect(screen.queryByText(/Approval/)).not.toBeInTheDocument()
  })

  it("shows a distinct error when the session cookie is missing", async () => {
    renderPage(<MyApplicationsPage />, "/my-applications")
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(screen.getByRole("alert")).toHaveTextContent("Your session has ended. Sign in again.")
  })

  it("refetches on window focus", async () => {
    signIn()
    mockFetchOnce(200, [ITEM])
    renderPage(<MyApplicationsPage />, "/my-applications")
    await waitFor(() => expect(screen.getByText(/We're reviewing your application/)).toBeInTheDocument())

    mockFetchOnce(200, [{ ...ITEM, stage: "Offer" }])
    fireEvent(window, new Event("focus"))
    await waitFor(() => expect(screen.getByText("Approved")).toBeInTheDocument())
  })

  it("refetches on a 30s interval", async () => {
    signIn()
    vi.useFakeTimers({ shouldAdvanceTime: false })
    try {
      mockFetchOnce(200, [ITEM])
      renderPage(<MyApplicationsPage />, "/my-applications")
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(screen.getByText(/We're reviewing your application/)).toBeInTheDocument()

      mockFetchOnce(200, [{ ...ITEM, stage: "Disbursed" }])
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000)
      })
      expect(screen.getByText("Funds released")).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it("drops a stale in-flight response once a newer request has started", async () => {
    signIn()
    let resolveFirst!: (res: Response) => void
    const first = new Promise<Response>((resolve) => {
      resolveFirst = resolve
    })
    vi.mocked(fetch).mockImplementationOnce(() => first)
    renderPage(<MyApplicationsPage />, "/my-applications")
    await waitFor(() => expect(screen.getByLabelText("Loading")).toBeInTheDocument())

    mockFetchOnce(200, [{ ...ITEM, stage: "Offer" }])
    fireEvent(window, new Event("focus"))
    await waitFor(() => expect(screen.getByText("Approved")).toBeInTheDocument())

    await act(async () => {
      resolveFirst(jsonResponse(200, [{ ...ITEM, stage: "Withdrawn" }]))
    })
    expect(screen.getByText("Approved")).toBeInTheDocument()
    expect(screen.queryByText("Closed")).not.toBeInTheDocument()
  })
})
