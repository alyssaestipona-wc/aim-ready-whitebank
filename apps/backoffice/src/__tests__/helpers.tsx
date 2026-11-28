import { ToastProvider } from "@aim-ready/ui"
import { render } from "@testing-library/react"
import type * as React from "react"

import type { SessionRole } from "@/lib/access"
import { getState, setSessionRole } from "@/mock"
import { __dropMemoryForTests, resetState } from "@/mock/store"

import { resetNav } from "./nav-mock"

/** Fresh seed state, the given role signed in, and the router at `path`. */
export function setup(role: SessionRole | null, path = "/", search = "", params: Record<string, string> = {}) {
  window.localStorage.clear()
  __dropMemoryForTests()
  resetState()
  setSessionRole(role)
  resetNav(path, search, params)
  return getState()
}

export function renderWithToasts(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}
