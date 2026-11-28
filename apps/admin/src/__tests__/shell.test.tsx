import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ConsoleShell } from "@/components/console-shell"
import { NAV } from "@/lib/access"
import { getSessionRole } from "@/mock"

import { renderWithToasts, setup } from "./helpers"
import { nav } from "./nav-mock"

describe("console shell", () => {
  it("lists exactly the eleven sidebar routes", () => {
    setup("admin", "/config/products")
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    const sidebar = screen.getByRole("complementary", { name: "Main navigation" })
    const labels = within(sidebar).getAllByRole("link").map((a) => a.textContent?.trim())
    expect(labels).toEqual(NAV.map((i) => i.label))
  })

  it("links to both the staff console and the borrower web app", () => {
    setup("admin", "/config/products")
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    expect(screen.getByRole("link", { name: "Staff console" })).toHaveAttribute("href", "http://localhost:3001")
    expect(screen.getByRole("link", { name: "Borrower web app" })).toHaveAttribute("href", "http://localhost:3002")
  })

  it("signs out from the sidebar button and clears the cookie", async () => {
    setup("admin", "/config/products")
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    await userEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Sign out" }))
    expect(getSessionRole()).toBeNull()
    expect(document.cookie).not.toContain("wbl_admin_session=admin")
    expect(nav.hard).toHaveBeenCalledWith("/sign-in")
  })

  it("resets demo data with confirmation and keeps the admin signed in", async () => {
    setup("admin", "/config/products")
    renderWithToasts(<ConsoleShell>content</ConsoleShell>)
    await userEvent.click(screen.getByRole("button", { name: "Reset demo data" }))
    expect(screen.getByRole("dialog", { name: "Reset demo data?" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(getSessionRole()).toBe("admin")
    expect(nav.router.push).toHaveBeenCalledWith("/config/products")
  })
})
