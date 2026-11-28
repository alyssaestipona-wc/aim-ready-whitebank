import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import SignInPage from "@/app/sign-in/page"
import { getSessionRole, getState, USERS, type RoleKey } from "@/mock"

import { setup } from "./helpers"
import { nav } from "./nav-mock"

async function credentials(email: string, password: string) {
  await userEvent.type(screen.getByLabelText("Email"), email)
  await userEvent.type(screen.getByLabelText("Password"), password)
  await userEvent.click(screen.getByRole("button", { name: "Continue" }))
}

describe("staff sign-in", () => {
  it("shows no demo accounts and no code field at first", () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    expect(screen.queryByLabelText("Authentication code")).not.toBeInTheDocument()
    expect(screen.queryByText(/approver@kalinawbank\.ph/)).not.toBeInTheDocument()
  })

  it("rejects a wrong password with a red inline error and no code field", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials("approver@kalinawbank.ph", "wrong")
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Email or password is incorrect.")
    expect(alert).toHaveClass("text-danger")
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true")
    expect(screen.queryByLabelText("Authentication code")).not.toBeInTheDocument()
  })

  it("reveals the code step only after valid credentials", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials("approver@kalinawbank.ph", "kalinaw2026")
    expect(screen.getByLabelText("Authentication code")).toBeInTheDocument()
    expect(screen.getByText("approver@kalinawbank.ph")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Verify and sign in" })).toBeInTheDocument()
  })

  it("rejects a code that is not six digits", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials("approver@kalinawbank.ph", "kalinaw2026")
    await userEvent.type(screen.getByLabelText("Authentication code"), "12a")
    await userEvent.click(screen.getByRole("button", { name: "Verify and sign in" }))
    expect(screen.getByRole("alert")).toHaveTextContent("That code is incorrect. Try again.")
    expect(getSessionRole()).toBeNull()
  })

  const LANDINGS: Array<[RoleKey, string]> = [
    ["branch", "/queues"], ["officer", "/queues"], ["approver", "/approvals"], ["ops", "/booking"], ["opssup", "/booking"], ["risk", "/reports/decisioning"], ["compliance", "/compliance/audit"],
  ]
  it.each(LANDINGS)("%s lands on %s and the sign-in is audited", async (role, path) => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials(USERS[role].email, "kalinaw2026")
    await userEvent.type(screen.getByLabelText("Authentication code"), "123456")
    await userEvent.click(screen.getByRole("button", { name: "Verify and sign in" }))
    expect(getSessionRole()).toBe(role)
    expect(nav.hard).toHaveBeenCalledWith(path)
    expect(getState().audit[0]).toMatchObject({ who: USERS[role].name, what: "Signed in (SSO + MFA)" })
  })

  it("refuses the tenant administrator's email before the code step, pointing at the admin console", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials(USERS.admin.email, "kalinaw2026")
    expect(screen.getByRole("alert")).toHaveTextContent("Tenant administrators sign in at the separate admin console.")
    expect(screen.queryByLabelText("Authentication code")).not.toBeInTheDocument()
    expect(getSessionRole()).toBeNull()
  })

  it("shows a distinct error, not the generic one, when the identity service is unreachable at the password step", async () => {
    setup(null, "/sign-in")
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"))
    render(<SignInPage />)
    await credentials("approver@kalinawbank.ph", "kalinaw2026")
    expect(screen.getByRole("alert")).toHaveTextContent("We can't sign you in right now. Try again shortly.")
  })

  it("shows a distinct error, not the generic one, when the identity service is unreachable at the code step", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials("approver@kalinawbank.ph", "kalinaw2026")
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"))
    await userEvent.type(screen.getByLabelText("Authentication code"), "123456")
    await userEvent.click(screen.getByRole("button", { name: "Verify and sign in" }))
    expect(screen.getByRole("alert")).toHaveTextContent("We can't sign you in right now. Try again shortly.")
  })
})
