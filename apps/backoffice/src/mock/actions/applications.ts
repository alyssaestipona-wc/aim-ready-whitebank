import {
  approvalsSummarySchema,
  approvePreviewResponseSchema,
  decideApplicationRequestSchema,
  decideApplicationResponseSchema,
  pickApplicationResponseSchema,
  recommendApplicationRequestSchema,
  recommendApplicationResponseSchema,
  requestInfoRequestSchema,
  requestInfoResponseSchema,
  resolveInfoResponseSchema,
  returnToOfficerResponseSchema,
  staffApplicationDetailSchema,
  staffApplicationListResponseSchema,
  type ApprovalsSummaryResponse,
  type ApprovePreviewResponse,
  type DecideApplicationRequest,
  type DecideApplicationResponse,
  type PickApplicationResponse,
  type RecommendApplicationRequest,
  type RecommendApplicationResponse,
  type RequestInfoRequest,
  type RequestInfoResponse,
  type ResolveInfoResponse,
  type ReturnToOfficerResponse,
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
  filters: { stage?: string; product?: string; queue?: "mine" | "unassigned" } = {},
): Promise<Result<StaffApplicationListItem[]>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }
  const params = new URLSearchParams()
  if (filters.stage) params.set("stage", filters.stage)
  if (filters.product) params.set("product", filters.product)
  if (filters.queue) params.set("queue", filters.queue)
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

export async function pickApplication(id: string): Promise<Result<PickApplicationResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(id)}/pick`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = pickApplicationResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  if (!parsed.data.ok) return { ok: false, error: parsed.data.error }
  return { ok: true, data: parsed.data }
}

export async function requestInfo(
  id: string,
  dto: RequestInfoRequest,
): Promise<Result<RequestInfoResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }
  const requestParsed = requestInfoRequestSchema.safeParse(dto)
  if (!requestParsed.success) return { ok: false, error: UNAVAILABLE_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(id)}/request-info`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(requestParsed.data),
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = requestInfoResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  if (!parsed.data.ok) return { ok: false, error: parsed.data.error }
  return { ok: true, data: parsed.data }
}

export async function recommendApplication(
  id: string,
  dto: RecommendApplicationRequest,
): Promise<Result<RecommendApplicationResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }
  const requestParsed = recommendApplicationRequestSchema.safeParse(dto)
  if (!requestParsed.success) return { ok: false, error: UNAVAILABLE_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(id)}/recommend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(requestParsed.data),
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = recommendApplicationResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  if (!parsed.data.ok) return { ok: false, error: parsed.data.error }
  return { ok: true, data: parsed.data }
}

export async function returnToOfficer(id: string): Promise<Result<ReturnToOfficerResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(id)}/return`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = returnToOfficerResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  if (!parsed.data.ok) return { ok: false, error: parsed.data.error }
  return { ok: true, data: parsed.data }
}

export async function getApprovalsSummary(): Promise<Result<ApprovalsSummaryResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/approvals-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = approvalsSummarySchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  return { ok: true, data: parsed.data }
}

export async function previewApproval(id: string): Promise<Result<ApprovePreviewResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(id)}/approve-preview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = approvePreviewResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  if (!parsed.data.ok) return { ok: false, error: parsed.data.error }
  return { ok: true, data: parsed.data }
}

export async function resolveInfo(id: string): Promise<Result<ResolveInfoResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(id)}/resolve-info`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = resolveInfoResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  if (!parsed.data.ok) return { ok: false, error: parsed.data.error }
  return { ok: true, data: parsed.data }
}
