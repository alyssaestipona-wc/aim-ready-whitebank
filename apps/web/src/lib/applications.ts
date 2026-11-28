"use client"

import { borrowerApplicationListResponseSchema, type BorrowerApplicationListItem } from "@aim-ready/contracts"

import { SESSION_COOKIE } from "@/mock"
import { API_BASE_URL } from "@/mock/config"

/*
 * Reads the borrower's own real applications from apps/api
 * (borrower-real-application-status) - distinct from `mock/actions.ts`,
 * which drives the fully-simulated post-apply experience. Kept in `lib/`,
 * apps/web's existing home for non-simulated, infrastructure-level code
 * (`session-token.ts`, `env.ts`), rather than mixed into that monolithic
 * simulated module.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

const UNAVAILABLE_ERROR = "We can't load your applications right now. Try again shortly."
const SESSION_ERROR = "Your session has ended. Sign in again."

export function getSessionToken(): string | null {
  if (typeof document === "undefined") return null
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  return hit ? decodeURIComponent(hit.slice(SESSION_COOKIE.length + 1)) : null
}

export async function listMyApplications(): Promise<Result<BorrowerApplicationListItem[]>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }

  const parsed = borrowerApplicationListResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  return { ok: true, data: parsed.data }
}
