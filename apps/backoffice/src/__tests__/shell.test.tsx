import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ConsoleShell } from "@/components/console-shell"
import { navFor, type SessionRole } from "@/lib/access"
import { getSessionRole, getState } from "@/mock"
import { update } from "@/mock/store"

import { renderWithToasts, setup } from "./helpers"
import { nav } from "./nav-mock"

const ROLES: SessionRole[] = ["branch", "officer", "approver", "ops", "opssup", "risk", "compliance", "admin"]

describe("console shell", () => {
  it.each(ROLES)("%s sees exactly the routes the access map grants", (role) => {
    setup(role, "/queues")
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    const sidebar = screen.getByRole("complementary", { name: "Main navigation" })
    const labels = within(sidebar).getAllByRole("link").map((a) => a.textContent?.replace(/\d+$|View$/, "").trim())
    expect(labels).toEqual(navFor(role, { ai: true }).flatMap((g) => g.items.map((i) => i.label)))
  })

  it("has no header search bar and no Guided demo control", () => {
    setup("officer", "/queues")
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
    expect(screen.queryByText(/Guided demo/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Borrower web app" })).toBeInTheDocument()
  })

  it("signs out from the sidebar button and clears the cookie", async () => {
    setup("officer", "/queues")
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    await userEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Sign out" }))
    expect(getSessionRole()).toBeNull()
    expect(document.cookie).not.toContain("wbl_staff_session=officer")
    expect(nav.hard).toHaveBeenCalledWith("/sign-in")
  })

  it("shows the read-only banner for compliance", () => {
    setup("compliance", "/compliance/audit")
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    expect(screen.getByText(/Compliance can open every screen but cannot change anything/)).toBeInTheDocument()
  })

  it("resets demo data with confirmation and keeps the user signed in", async () => {
    setup("officer", "/queues")
    act(() => {
      update((s) => {
        s.apps = s.apps.slice(0, 3)
      })
    })
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    await userEvent.click(screen.getByRole("button", { name: "Reset demo data" }))
    expect(screen.getByRole("dialog", { name: "Reset demo data?" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(getState().apps.length).toBeGreaterThan(100)
    expect(getSessionRole()).toBe("officer")
    expect(nav.router.push).toHaveBeenCalledWith("/queues")
  })

  it("hides AI models from the sidebar when the flag is off", () => {
    setup("risk", "/config/decisioning")
    act(() => {
      update((s) => {
        s.flags.ai = false
      })
    })
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    expect(screen.queryByRole("link", { name: "AI models" })).not.toBeInTheDocument()
  })
})
