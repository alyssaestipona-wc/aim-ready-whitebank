import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DeniedNotice } from "@/app/(console)/denied/denied-notice"
import { getState } from "@/mock"

import { renderWithToasts, setup } from "./helpers"

describe("denied screen", () => {
  it("explains the refusal and records it in the audit log", async () => {
    setup("branch", "/compliance/audit")
    renderWithToasts(<DeniedNotice />)
    expect(screen.getByRole("heading", { name: "You don’t have access to this" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to my work" })).toHaveAttribute("href", "/queues")
    await waitFor(() => expect(getState().audit[0]?.what).toContain('Refused: requested "audit"'))
    expect(getState().audit[0]?.who).toBe("Bea Santiago")
  })
})
