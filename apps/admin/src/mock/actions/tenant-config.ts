import {
  tenantConfigResponseSchema,
  updateTenantConfigRequestSchema,
  type TenantConfigResponse,
  type UpdateTenantConfigRequest,
} from "@aim-ready/contracts"

import { API_BASE_URL } from "../constants"
import { getSessionToken } from "../session"

/*
 * Reads and toggles the real, tenant-scoped kill switch / bureau-down flags
 * from apps/api (decisioning-recommendation-and-overrides) - the first real
 * (non-simulated) admin-console screen beyond sign-in, kept separate from
 * the existing simulated /config/decisioning screen.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

const UNAVAILABLE_ERROR = "We can't load decisioning controls right now. Try again shortly."
const SESSION_ERROR = "Your session has ended. Sign in again."

export async function getTenantConfig(): Promise<Result<TenantConfigResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/tenant-config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = tenantConfigResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  return { ok: true, data: parsed.data }
}

export async function updateTenantConfig(
  patch: UpdateTenantConfigRequest,
): Promise<Result<TenantConfigResponse>> {
  const token = getSessionToken()
  if (!token) return { ok: false, error: SESSION_ERROR }
  const requestParsed = updateTenantConfigRequestSchema.safeParse(patch)
  if (!requestParsed.success) return { ok: false, error: UNAVAILABLE_ERROR }

  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/tenant-config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(requestParsed.data),
    })
    if (!res.ok) return { ok: false, error: UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: UNAVAILABLE_ERROR }
  }
  const parsed = tenantConfigResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: UNAVAILABLE_ERROR }
  return { ok: true, data: parsed.data }
}
