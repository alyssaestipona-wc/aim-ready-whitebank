import {
  decideApplicationRequestSchema,
  decideApplicationResponseSchema,
  staffApplicationDetailSchema,
  staffApplicationListResponseSchema,
  type DecideApplicationRequest,
  type DecideApplicationResponse,
  type StaffApplicationDetail,
  type StaffApplicationListItem,
} from "@aim-ready/contracts"

import { API_BASE_URL } from "../constants"
import { getSessionToken } from "../session"

/*
 * Reads real applications from apps/api (real-application-intake) for the
 * new read-only "live applications" screen - not the console's simulated
 * work queues/case detail, which keep driving the in-memory mock store.
 * This is the one place in apps/backoffice that calls fetch() with a real
 * session token, mirroring apps/web's submitApplication()/getSessionToken().
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

const UNAVAILABLE_ERROR = "We can't load applications right now. Try again shortly."
const SESSION_ERROR = "Your session has ended. Sign in again."

export async function listApplications(
  filters: { stage?: string; product?: string } = {},
): Promise<Result<StaffApplicationListItem[]>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }
  const params = new URLSearchParams()
  if (filters.stage) params.set("stage", filters.stage)
  if (filters.product) params.set("product", filters.product)
  const qs = params.toString()

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = staffApplicationListResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  return { ok: true, data: parsed.data }
}

export async function getApplication(id: string): Promise<Result<StaffApplicationDetail>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = staffApplicationDetailSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  return { ok: true, data: parsed.data }
}

export async function decideApplication(
  id: string,
  dto: DecideApplicationRequest,
): Promise<Result<DecideApplicationResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }
  const requestParsed = decideApplicationRequestSchema.safeParse(dto)
  if (!requestParsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  const request = requestParsed.data

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(id)}/decide`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(request),
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = decideApplicationResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  // A business refusal (e.g. above authority, bad reason code) isn't a
  // fetch/schema failure - surface its own message, not the generic one.
  if (!parsed.data.ok) return { ok: false, error: parsed.data.error }
  return { ok: true, data: parsed.data }
}
