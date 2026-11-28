import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import NotFound from "@/app/not-found"

import { renderWithToasts, setup } from "./helpers"

describe("unknown route", () => {
  it("shows a Not found page with a Go to my work button", () => {
    setup("officer", "/nowhere")
    renderWithToasts(<NotFound />)
    expect(screen.getByRole("heading", { name: "Not found" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to my work" })).toHaveAttribute("href", "/queues")
  })
})
