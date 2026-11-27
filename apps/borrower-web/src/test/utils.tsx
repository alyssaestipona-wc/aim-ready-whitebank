import { act, render } from "@testing-library/react"
import { toCentavos } from "@aim-ready/core"
import { ToastProvider } from "@aim-ready/ui"
import * as React from "react"
import { vi } from "vitest"

import { PortalShell } from "@/components/shell"
import { actions, store } from "@/mock"
import type { ApplicationForm } from "@/mock"
import { nav } from "./nav"

/** Fresh seed, signed out, router spies cleared. */
export function resetAll() {
  store.reset()
  try {
    window.localStorage.clear()
  } catch {
    // ignore
  }
  document.cookie = "wbl_borrower_session=; path=/; max-age=0"
  nav.pathname = "/"
  nav.push.mockReset()
  nav.replace.mockReset()
  nav.hard.mockReset()
}

export async function signInAs(who: "juan" | "carmela") {
  const email = who === "juan" ? "juan.delacruz@email.com" : "carmela.bautista@email.com"
  await act(async () => {
    await actions.signIn(email, "kalinaw2026")
  })
}

export function form(over: Partial<ApplicationForm> = {}): ApplicationForm {
  return {
    product: "PL",
    amount: toCentavos(150000),
    tenor: 24,
    income: toCentavos(68000),
    obligations: toCentavos(7500),
    purpose: "Home improvement",
    consentCredit: true,
    consentData: true,
    consentTerms: true,
    ...over,
  }
}

/** Submits, fast-forwarding the 1.2 s simulated checks. */
export async function submitInstant(f: ApplicationForm) {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  try {
    let r: Awaited<ReturnType<typeof actions.submitApplication>> | undefined
    await act(async () => {
      const p = actions.submitApplication(f)
      await vi.advanceTimersByTimeAsync(1300)
      r = await p
    })
    return r!
  } finally {
    vi.useRealTimers()
  }
}

/** Moves every waiting application past its simulated bank step. */
export function bankStep() {
  act(() => {
    actions.advanceBank(Date.now() + 60_000)
  })
}

export function renderPage(ui: React.ReactElement, path = "/") {
  nav.pathname = path
  return render(
    <ToastProvider>
      <PortalShell>{ui}</PortalShell>
    </ToastProvider>
  )
}
