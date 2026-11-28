import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import DecisioningControlsPage from "@/app/(console)/decisioning-controls/page"

import { renderWithToasts, setup } from "./helpers"

function mockFetchOnce(status: number, body: unknown) {
  vi.mocked(fetch).mockImplementationOnce(
    async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  )
}

describe("decisioning controls", () => {
  it("shows a distinct error when the token is missing", async () => {
    setup(null, "/decisioning-controls")
    renderWithToasts(<DecisioningControlsPage />)
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
  })

  it("shows the current kill switch and bureau-down state", async () => {
    setup("admin", "/decisioning-controls")
    mockFetchOnce(200, { killSwitch: false, bureauDown: false })
    renderWithToasts(<DecisioningControlsPage />)
    await waitFor(() => expect(screen.getByText(/Off — automation runs normally/)).toBeInTheDocument())
    expect(screen.getByText(/the credit bureau is treated as available/)).toBeInTheDocument()
  })

  it("asks for confirmation before toggling the kill switch on", async () => {
    setup("admin", "/decisioning-controls")
    mockFetchOnce(200, { killSwitch: false, bureauDown: false })
    renderWithToasts(<DecisioningControlsPage />)
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Turn on" })[0]).toBeInTheDocument())

    await userEvent.click(screen.getAllByRole("button", { name: "Turn on" })[0]!)
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/Turn on the kill switch\?/)).toBeInTheDocument()

    // Clicking the trigger does not toggle by itself - no fetch happens until confirmed.
    expect(screen.getByText(/Off — automation runs normally/)).toBeInTheDocument()
  })

  it("toggles the kill switch on once confirmed, and reflects the updated state", async () => {
    setup("admin", "/decisioning-controls")
    mockFetchOnce(200, { killSwitch: false, bureauDown: false })
    renderWithToasts(<DecisioningControlsPage />)
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Turn on" })[0]).toBeInTheDocument())
    await userEvent.click(screen.getAllByRole("button", { name: "Turn on" })[0]!)
    const dialog = await screen.findByRole("dialog")

    mockFetchOnce(200, { killSwitch: true, bureauDown: false })
    await userEvent.click(within(dialog).getByRole("button", { name: "Turn on" }))
    await waitFor(() => expect(screen.getByText(/every new application is routed to manual review\./)).toBeInTheDocument())
  })

  it("toggles the bureau-down flag independently, once confirmed", async () => {
    setup("admin", "/decisioning-controls")
    mockFetchOnce(200, { killSwitch: false, bureauDown: false })
    renderWithToasts(<DecisioningControlsPage />)
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Turn on" })).toHaveLength(2))
    await userEvent.click(screen.getAllByRole("button", { name: "Turn on" })[1]!)
    const dialog = await screen.findByRole("dialog")

    mockFetchOnce(200, { killSwitch: false, bureauDown: true })
    await userEvent.click(within(dialog).getByRole("button", { name: "Turn on" }))
    await waitFor(() => expect(screen.getByText(/routed to manual review as a bureau outage/)).toBeInTheDocument())
  })

  it("leaves the flag unchanged when the toggle is cancelled", async () => {
    setup("admin", "/decisioning-controls")
    mockFetchOnce(200, { killSwitch: false, bureauDown: false })
    renderWithToasts(<DecisioningControlsPage />)
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Turn on" })[0]).toBeInTheDocument())
    await userEvent.click(screen.getAllByRole("button", { name: "Turn on" })[0]!)
    const dialog = await screen.findByRole("dialog")

    const callsBefore = vi.mocked(fetch).mock.calls.length
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
    expect(screen.getByText(/Off — automation runs normally/)).toBeInTheDocument()
  })
})
