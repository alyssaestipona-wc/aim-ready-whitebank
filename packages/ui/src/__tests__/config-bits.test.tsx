import { act, render, screen } from "@testing-library/react"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { useRun, type ConfigActionResult } from "../components/config-bits"
import { ToastProvider } from "../components/toast"

function Harness({ result }: { result: ConfigActionResult }) {
  const run = useRun()
  return (
    <button
      type="button"
      onClick={() => {
        void run(Promise.resolve(result))
      }}
    >
      Go
    </button>
  )
}

describe("useRun", () => {
  it("shows the toast on success", async () => {
    render(
      <ToastProvider>
        <Harness result={{ ok: true, toast: "Saved" }} />
      </ToastProvider>
    )
    await act(async () => {
      screen.getByRole("button", { name: "Go" }).click()
    })
    expect(await screen.findByText("Saved")).toBeInTheDocument()
  })

  it("shows the error as a toast on failure", async () => {
    render(
      <ToastProvider>
        <Harness result={{ ok: false, error: "Read-only access" }} />
      </ToastProvider>
    )
    await act(async () => {
      screen.getByRole("button", { name: "Go" }).click()
    })
    expect(await screen.findByText("Read-only access")).toBeInTheDocument()
  })
})
