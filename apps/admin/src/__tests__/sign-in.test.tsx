import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import SignInPage from "@/app/sign-in/page"
import { getSessionRole, getState, USERS } from "@/mock"

import { setup } from "./helpers"
import { nav } from "./nav-mock"

async function credentials(email: string, password: string) {
  await userEvent.type(screen.getByLabelText("Email"), email)
  await userEvent.type(screen.getByLabelText("Password"), password)
  await userEvent.click(screen.getByRole("button", { name: "Continue" }))
}

describe("admin sign-in", () => {
  it("shows no code field at first", () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    expect(screen.queryByLabelText("Authentication code")).not.toBeInTheDocument()
  })

  it("rejects a wrong password with a red inline error and no code field", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials("admin@kalinawbank.ph", "wrong")
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Email or password is incorrect.")
    expect(alert).toHaveClass("text-danger")
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true")
    expect(screen.queryByLabelText("Authentication code")).not.toBeInTheDocument()
  })

  it("refuses a staff email with the same generic message", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials("creditrisk@kalinawbank.ph", "kalinaw2026")
    expect(screen.getByRole("alert")).toHaveTextContent("Email or password is incorrect.")
    expect(screen.queryByLabelText("Authentication code")).not.toBeInTheDocument()
  })

  it("refuses a borrower email with the same generic message", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials("juan.delacruz@example.com", "kalinaw2026")
    expect(screen.getByRole("alert")).toHaveTextContent("Email or password is incorrect.")
  })

  it("reveals the code step only after valid credentials", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials(USERS.admin.email, "kalinaw2026")
    expect(screen.getByLabelText("Authentication code")).toBeInTheDocument()
    expect(screen.getByText(USERS.admin.email)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Verify and sign in" })).toBeInTheDocument()
  })

  it("rejects a code that is not six digits", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials(USERS.admin.email, "kalinaw2026")
    await userEvent.type(screen.getByLabelText("Authentication code"), "12a")
    await userEvent.click(screen.getByRole("button", { name: "Verify and sign in" }))
    expect(screen.getByRole("alert")).toHaveTextContent("That code is incorrect. Try again.")
    expect(getSessionRole()).toBeNull()
  })

  it("lands on Products and the sign-in is audited", async () => {
    setup(null, "/sign-in")
    render(<SignInPage />)
    await credentials(USERS.admin.email, "kalinaw2026")
    await userEvent.type(screen.getByLabelText("Authentication code"), "123456")
    await userEvent.click(screen.getByRole("button", { name: "Verify and sign in" }))
    expect(getSessionRole()).toBe("admin")
    expect(nav.hard).toHaveBeenCalledWith("/config/products")
    expect(getState().audit[0]).toMatchObject({ who: USERS.admin.name, what: "Signed in (SSO + MFA)" })
  })
})
