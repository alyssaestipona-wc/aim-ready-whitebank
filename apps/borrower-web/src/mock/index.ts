"use client"

import * as React from "react"

import { createActions } from "./actions"
import { createStore } from "./store"
import type { BorrowerState } from "./types"

/*
 * Public API of the borrower mock layer. Screens import only from "@/mock".
 * Replacing the simulation with apps/api means re-implementing this module
 * with the same names and signatures.
 */

export const store = createStore()
export const actions = createActions(store)

/** Live state on the client; null during server render and hydration. */
export function useBorrowerState(): BorrowerState | null {
  return React.useSyncExternalStore(store.subscribe, store.getState, () => null)
}

/** Runs the simulated bank progression: once now (catch-up), then every second. */
export function useBankSimulator(intervalMs = 1000) {
  React.useEffect(() => {
    actions.advanceBank()
    const t = setInterval(() => actions.advanceBank(), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
}

export { SESSION_COOKIE, SIMULATED_STEP, type ApplicationForm, type UploadChoice } from "./actions"
export { BANK_STEP_MS, BORROWERS, PRODUCTS, PURPOSES, TENOR_CHOICES, UPLOAD_LIMIT_MB } from "./config"
export {
  currentBorrower,
  estimateMonthly,
  inboxItems,
  myApp,
  myApps,
  pendingCount,
  plainStatus,
  productName,
  repaymentSchedule,
  termsOf,
  trackerSteps,
  type InboxItem,
  type PlainStatus,
} from "./selectors"
export type { Application, Borrower, ProductCode } from "./types"
