import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

import { nav } from "./src/__tests__/nav-mock"

vi.mock("next/navigation", () => ({
  useRouter: () => nav.router,
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.searchParams,
  useParams: () => nav.params,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

vi.mock("@/lib/navigation", () => ({ navigateHard: (path: string) => nav.hard(path) }))

afterEach(() => cleanup())

// jsdom has no matchMedia; tests run at desktop width.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({ matches: true, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as typeof window.matchMedia
}
