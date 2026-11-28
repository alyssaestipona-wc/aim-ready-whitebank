import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

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
    ["branch", "/queues"], ["officer", "/queues"], ["approver", "/approvals"], ["ops", "/booking"], ["opssup", "/booking"], ["risk", "/reports/decisioning"], ["compliance", "/compliance/audit"], ["admin", "/config/products"],
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
})
