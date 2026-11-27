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

afterEach(() => cleanup())
