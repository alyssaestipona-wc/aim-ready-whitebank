import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toCentavos } from "@aim-ready/core"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AccountPage from "@/app/account/page"
import ApplyPage from "@/app/apply/page"
import HomePage from "@/app/page"
import InboxPage from "@/app/inbox/page"
import LoanPage from "@/app/loan/page"
import OfferPage from "@/app/offer/page"
import SignInPage from "@/app/sign-in/page"
import SignPage from "@/app/sign/page"
import UploadPage from "@/app/upload/page"
import { actions, store } from "@/mock"
import { nav } from "@/test/nav"
import { bankStep, form, renderPage, resetAll, signInAs, submitInstant } from "@/test/utils"

beforeEach(() => resetAll())

async function toInfoRequested() {
  await signInAs("juan")
  await submitInstant(form({ amount: toCentavos(250000) }))
  bankStep()
}
async function toOffer() {
  await signInAs("juan")
  await submitInstant(form())
}
async function toSign() {
  await toOffer()
  await act(async () => {
    await actions.acceptOffer(true)
  })
  bankStep()
}
async function toDisbursed() {
  await toSign()
  await act(async () => {
    await actions.signDocuments("Juan Dela Cruz", true)
  })
  bankStep()
}

describe("sign-in", () => {
  it("shows the red inline error for a wrong password", async () => {
    renderPage(<SignInPage />, "/sign-in")
    await userEvent.type(screen.getByLabelText("Email"), "juan.delacruz@email.com")
    await userEvent.type(screen.getByLabelText("Password"), "wrong")
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.")
    expect(screen.getByRole("alert")).toHaveClass("text-danger")
  })

  it("signs in and goes home", async () => {
    renderPage(<SignInPage />, "/sign-in")
    await userEvent.type(screen.getByLabelText("Email"), "juan.delacruz@email.com")
    await userEvent.type(screen.getByLabelText("Password"), "kalinaw2026")
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
    await waitFor(() => expect(nav.hard).toHaveBeenCalledWith("/"))
    expect(store.getState().session).toBe("juan")
  })

  it("does not list demo accounts", () => {
    renderPage(<SignInPage />, "/sign-in")
    expect(screen.queryByText(/carmela|kalinaw2026/i)).not.toBeInTheDocument()
  })
})

describe("shell", () => {
  it("sends a signed-out browser to sign-in", async () => {
    renderPage(<HomePage />, "/")
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/sign-in"))
  })

  it("ends a remembered session whose cookie is gone instead of looping", async () => {
    await signInAs("juan")
    document.cookie = "wbl_borrower_session=; path=/; max-age=0"
    renderPage(<SignInPage />, "/sign-in")
    await waitFor(() => expect(store.getState().session).toBeNull())
    expect(nav.hard).not.toHaveBeenCalled()
  })

  it("has a staff console link and no guided demo", async () => {
    await signInAs("juan")
    renderPage(<HomePage />)
    expect(screen.getByRole("link", { name: "Staff console" })).toHaveAttribute("href", "http://localhost:3001")
    expect(screen.queryByText(/Guided demo/i)).not.toBeInTheDocument()
  })

  it("profile menu shows name, email, Account and Sign out, with no name beside the icon", async () => {
    await signInAs("juan")
    renderPage(<HomePage />)
    const profile = screen.getByRole("button", { name: "Profile" })
    expect(profile).not.toHaveTextContent("Juan")
    await userEvent.click(profile)
    const menu = await screen.findByRole("menu")
    expect(within(menu).getByText("Juan Dela Cruz")).toBeInTheDocument()
    expect(within(menu).getByText("juan.delacruz@email.com")).toBeInTheDocument()
    expect(within(menu).getByRole("menuitem", { name: "Account" })).toBeInTheDocument()
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Sign out" }))
    await waitFor(() => expect(nav.hard).toHaveBeenCalledWith("/sign-in"))
    expect(store.getState().session).toBeNull()
  })

  it("shows an inbox badge of 1 while waiting on the borrower", async () => {
    await toOffer()
    renderPage(<HomePage />)
    expect(screen.getByRole("link", { name: "Inbox, 1 new" })).toHaveTextContent("1")
  })
})

describe("home", () => {
  it("offers Apply for a loan with no application", async () => {
    await signInAs("juan")
    renderPage(<HomePage />)
    expect(screen.getByText("Good morning,")).toBeInTheDocument()
    expect(screen.getByText("Juan")).toBeInTheDocument()
    expect(screen.getByText("₱184,200.00")).toBeInTheDocument()
    expect(screen.getByText("Need extra funds?")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Apply for a loan" })).toHaveAttribute("href", "/apply")
  })

  it("asks for documents when information is requested, with the tracker", async () => {
    await toInfoRequested()
    renderPage(<HomePage />)
    expect(screen.getByText("We need a few more documents")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Upload documents" })).toHaveAttribute("href", "/upload")
    const steps = within(screen.getByRole("list", { name: "Application progress" })).getAllByRole("listitem")
    expect(steps.map((s) => s.textContent?.replace(/(Done|In progress|27 Nov.*)$/, ""))).toEqual(["Submitted", "Checks", "Decision", "Offer accepted", "Documents signed", "Funds released"])
    expect(steps[2]).toHaveAttribute("aria-current", "step")
  })

  it("shows a declined application under Apply", async () => {
    await toOffer()
    act(() =>
      store.update((s) => {
        s.apps[0]!.stage = "Declined"
      })
    )
    renderPage(<HomePage />)
    expect(screen.getByText("Not approved")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Apply for a loan" })).toBeInTheDocument()
  })
})

describe("apply", () => {
  it("rejects an amount out of range on step 1", async () => {
    await signInAs("juan")
    renderPage(<ApplyPage />, "/apply")
    const amount = screen.getByLabelText("How much do you need?")
    expect(amount).toHaveValue("150,000.00")
    fireEvent.focus(amount)
    fireEvent.change(amount, { target: { value: "5000" } })
    fireEvent.blur(amount)
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount between ₱20,000 and ₱500,000.")
    expect(screen.getByText("Step 1 of 3 · saved automatically, resume within 30 days")).toBeInTheDocument()
  })

  it("requires income on step 2 and keeps Back and Continue equal width", async () => {
    await signInAs("juan")
    renderPage(<ApplyPage />, "/apply")
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    const income = screen.getByLabelText("Monthly income")
    expect(income).toHaveValue("68,000.00")
    fireEvent.focus(income)
    fireEvent.change(income, { target: { value: "" } })
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your monthly income.")
    const back = screen.getByRole("button", { name: "Back" })
    expect(back.parentElement).toHaveClass("auto-cols-fr")
  })

  it("names missing consents, then submits and shows the approval", async () => {
    await signInAs("juan")
    renderPage(<ApplyPage />, "/apply")
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Please tick the credit check consent, data processing consent, terms and conditions to submit.")
    for (const box of screen.getAllByRole("checkbox")) await userEvent.click(box)
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await userEvent.click(screen.getByRole("button", { name: "Submit application" }))
      expect(await screen.findByText("Just a moment…")).toBeInTheDocument()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1300)
      })
    } finally {
      vi.useRealTimers()
    }
    expect(await screen.findByText("Application sent")).toBeInTheDocument()
    expect(screen.getByText("You’re approved for ₱150,000")).toBeInTheDocument()
    expect(screen.getByText(/Reference APP-4301/)).toBeInTheDocument()
  })

  it("blocks a duplicate open application", async () => {
    await toOffer()
    renderPage(<ApplyPage />, "/apply")
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    for (const box of screen.getAllByRole("checkbox")) await userEvent.click(box)
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have an open personal loan application (APP-4301). We’ll update you on that one first.")
  })
})

describe("inbox", () => {
  it("pages messages 8 at a time", async () => {
    await signInAs("juan")
    renderPage(<InboxPage />, "/inbox")
    const list = () => within(screen.getAllByRole("list")[0]!).getAllByRole("link")
    expect(list()).toHaveLength(8)
    expect(screen.getByText("Showing 1–8 of 12")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "2" }))
    expect(list()).toHaveLength(4)
  })

  it("puts the action item first", async () => {
    await toOffer()
    renderPage(<InboxPage />, "/inbox")
    const first = within(screen.getAllByRole("list")[0]!).getAllByRole("link")[0]!
    expect(first).toHaveTextContent("Your loan offer is ready")
    expect(first).toHaveAttribute("href", "/offer")
  })
})

describe("upload", () => {
  it("shows Nothing to upload without a request", async () => {
    await signInAs("juan")
    renderPage(<UploadPage />, "/upload")
    expect(screen.getByText("Nothing to upload")).toBeInTheDocument()
  })

  it("shows each inline error, then accepts a PDF", async () => {
    await toInfoRequested()
    renderPage(<UploadPage />, "/upload")
    const submit = screen.getByRole("button", { name: "Submit documents" })
    await userEvent.click(submit)
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a file to upload.")
    await userEvent.selectOptions(screen.getByLabelText("Choose file (simulated picker)"), "type")
    await userEvent.click(submit)
    expect(await screen.findByRole("alert")).toHaveTextContent("HEIC files aren’t accepted. Upload a PDF, JPG or PNG.")
    await userEvent.selectOptions(screen.getByLabelText("Choose file (simulated picker)"), "size")
    await userEvent.click(submit)
    expect(await screen.findByRole("alert")).toHaveTextContent("This file is 41 MB. The limit is 10 MB.")
    await userEvent.selectOptions(screen.getByLabelText("Choose file (simulated picker)"), "ok")
    await userEvent.click(submit)
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/"))
    expect(screen.getAllByText("Documents received. Virus scan passed.").length).toBeGreaterThan(0)
    expect(store.getState().apps[0]!.stage).toBe("Review")
  })
})

describe("offer", () => {
  it("shows No offer right now without one", async () => {
    await signInAs("juan")
    renderPage(<OfferPage />, "/offer")
    expect(screen.getByText("No offer right now")).toBeInTheDocument()
  })

  it("marks a counter-offer", async () => {
    await toInfoRequested()
    await act(async () => {
      await actions.uploadDocuments("ok")
    })
    bankStep()
    renderPage(<OfferPage />, "/offer")
    expect(screen.getByText("Counter-offer.")).toBeInTheDocument()
    expect(screen.getByText(/You asked for ₱250,000; this is what we can offer\./)).toBeInTheDocument()
  })

  it("keeps Accept disabled until the disclosure is acknowledged", async () => {
    await toOffer()
    renderPage(<OfferPage />, "/offer")
    expect(screen.getByText("Effective interest rate")).toBeInTheDocument()
    const accept = screen.getByRole("button", { name: "Accept offer" })
    expect(accept).toBeDisabled()
    await userEvent.click(screen.getByRole("checkbox", { name: "I’ve read and understood the disclosure statement." }))
    expect(accept).toBeEnabled()
    await userEvent.click(accept)
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/"))
    expect(screen.getAllByText("Offer accepted. We’ll send your documents to sign.").length).toBeGreaterThan(0)
    expect(store.getState().apps[0]!.stage).toBe("Documentation")
  })
})

describe("sign", () => {
  it("shows Nothing to sign before documents are ready", async () => {
    await toOffer()
    renderPage(<SignPage />, "/sign")
    expect(screen.getByText("Nothing to sign")).toBeInTheDocument()
  })

  it("opens documents, checks the name and agreement, then signs", async () => {
    await toSign()
    renderPage(<SignPage />, "/sign")
    await userEvent.click(screen.getByRole("button", { name: "Read Loan agreement" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("loan_agreement_v5.pdf")).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }))

    await userEvent.type(screen.getByLabelText("Type your full name to sign"), "Juan Cruz")
    expect(screen.getByTestId("signature")).toHaveTextContent("Juan Cruz")
    await userEvent.click(screen.getByRole("button", { name: "Sign documents" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Type your name exactly as it appears on your account: Juan Dela Cruz.")
    await userEvent.clear(screen.getByLabelText("Type your full name to sign"))
    await userEvent.type(screen.getByLabelText("Type your full name to sign"), "Juan Dela Cruz")
    await userEvent.click(screen.getByRole("button", { name: "Sign documents" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Tick the box to agree to sign electronically.")
    await userEvent.click(screen.getByRole("checkbox", { name: "I agree to sign these documents electronically." }))
    await userEvent.click(screen.getByRole("button", { name: "Sign documents" }))
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/"))
    expect(screen.getAllByText("Signed. We’re setting up your loan.").length).toBeGreaterThan(0)
    expect(store.getState().apps[0]!.stage).toBe("Booking")
  })
})

describe("loan", () => {
  it("shows No active loan before release", async () => {
    await signInAs("juan")
    renderPage(<LoanPage />, "/loan")
    expect(screen.getByText("No active loan")).toBeInTheDocument()
  })

  it("labels core figures and pages the schedule 12 at a time", async () => {
    await toDisbursed()
    renderPage(<LoanPage />, "/loan")
    expect(screen.getByText("Read live from core banking (simulated)")).toBeInTheDocument()
    expect(screen.getByText(/Outstanding balance · LN-2026-1302/)).toBeInTheDocument()
    const rows = () => within(screen.getByRole("list", { name: "Repayment schedule" })).getAllByRole("listitem")
    expect(rows()).toHaveLength(12)
    expect(screen.getByText("Showing 1–12 of 24")).toBeInTheDocument()
    expect(rows()[0]).toHaveTextContent("1 · 27 Dec 2026")
    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByText("Showing 13–24 of 24")).toBeInTheDocument()
    expect(rows()[11]).toHaveTextContent("24 · 27 Nov 2028")
  })
})

describe("account", () => {
  it("shows the borrower's details and signs out", async () => {
    await signInAs("juan")
    renderPage(<AccountPage />, "/account")
    expect(screen.getByText("juan.delacruz@email.com · CIF-0061420")).toBeInTheDocument()
    expect(screen.getByText("Northgate Energy Corp.")).toBeInTheDocument()
    expect(screen.getByText("Kalinaw Savings ••4471")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }))
    await waitFor(() => expect(nav.hard).toHaveBeenCalledWith("/sign-in"))
  })
})

describe("simulated bank progression in the app", () => {
  it("moves an accepted offer to signing about 4 seconds later", async () => {
    await toOffer()
    vi.useFakeTimers({ shouldAdvanceTime: false })
    try {
      await act(async () => {
        await actions.acceptOffer(true)
      })
      renderPage(<HomePage />)
      expect(screen.getByText("Preparing your loan documents")).toBeInTheDocument()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      expect(screen.getByText("Preparing your loan documents")).toBeInTheDocument()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      expect(screen.getByText("Sign your loan documents")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Sign documents" })).toHaveAttribute("href", "/sign")
      expect(store.getState().apps[0]!.hist.at(-1)!.what).toMatch(/\(simulated bank step\)$/)
    } finally {
      vi.useRealTimers()
    }
  })
})
