import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import * as React from "react"
import { afterEach, vi } from "vitest"

import { nav } from "./src/test/nav"

// Next's router is not mounted in unit tests: record navigations instead.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => nav.pathname,
}))

vi.mock("@/lib/navigation", () => ({ navigateHard: nav.hard }))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => React.createElement("a", { href, ...props }, children),
}))

// jsdom has no ResizeObserver; Radix checkboxes measure themselves with it.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

afterEach(() => cleanup())
