import { vi } from "vitest"

/** Shared, resettable stand-in for next/navigation in tests. */
export const nav = {
  pathname: "/",
  searchParams: new URLSearchParams(),
  params: {} as Record<string, string>,
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  /** Full-page loads (sign-in and sign-out). */
  hard: vi.fn(),
}

export function resetNav(pathname = "/", search = "", params: Record<string, string> = {}) {
  nav.pathname = pathname
  nav.searchParams = new URLSearchParams(search)
  nav.params = params
  nav.router.push.mockReset()
  nav.router.replace.mockReset()
  nav.hard.mockReset()
}
