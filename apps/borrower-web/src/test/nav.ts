import { vi } from "vitest"

/** Recorded router calls for tests (see vitest.setup.ts). */
export const nav = {
  pathname: "/",
  push: vi.fn(),
  replace: vi.fn(),
  hard: vi.fn(),
}
