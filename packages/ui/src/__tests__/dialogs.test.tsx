import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { ConfirmDialog } from "../components/confirm-dialog"
import { ToastProvider, useToast } from "../components/toast"
import { Button } from "../components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu"

function DialogHarness({ fail }: { fail: boolean }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Request information</Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="Request information from the borrower" okLabel="Send request" onConfirm={() => (fail ? "Pick at least one item to request." : undefined)}>
        <p>Body</p>
      </ConfirmDialog>
    </>
  )
}

describe("ConfirmDialog", () => {
  it("stays open and shows the error in red when confirm fails", async () => {
    render(<DialogHarness fail />)
    await userEvent.click(screen.getByRole("button", { name: "Request information" }))
    await userEvent.click(screen.getByRole("button", { name: "Send request" }))
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Pick at least one item to request.")
    expect(alert).toHaveClass("text-danger")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("closes on success", async () => {
    render(<DialogHarness fail={false} />)
    await userEvent.click(screen.getByRole("button", { name: "Request information" }))
    await userEvent.click(screen.getByRole("button", { name: "Send request" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("closes on Escape and returns focus to the opener", async () => {
    render(<DialogHarness fail />)
    const opener = screen.getByRole("button", { name: "Request information" })
    await userEvent.click(opener)
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
})

describe("DropdownMenu", () => {
  it("closes on Escape and returns focus to the trigger", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Profile</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Account</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    const trigger = screen.getByRole("button", { name: "Profile" })
    await userEvent.click(trigger)
    expect(screen.getByRole("menuitem", { name: "Account" })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})

function ToastHarness() {
  const toast = useToast()
  return <Button onClick={() => toast("Offer accepted. We’ll send your documents to sign.")}>Go</Button>
}

describe("Toast", () => {
  it("announces a message", async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    )
    await userEvent.click(screen.getByRole("button", { name: "Go" }))
    expect(screen.getAllByText("Offer accepted. We’ll send your documents to sign.").length).toBeGreaterThan(0)
  })
})
