"use client"

import { loginResponseSchema, verifyCodeResponseSchema } from "@aim-ready/contracts"

import { API_BASE_URL } from "../constants"
import { log } from "../engine"
import { getSessionRole, setFlagsCookie, setSessionToken } from "../session"
import { getState, resetState, update } from "../store"
import type { RoleKey } from "../types"
import { ok, type ActionResult } from "./result"

const SERVICE_UNAVAILABLE_ERROR = "We can't sign you in right now. Try again shortly."

/**
 * Step 1 of sign-in: email and password, checked against the real identity
 * service (apps/api). On success returns the pending token binding this
 * attempt to the six-digit code step below.
 */
export async function checkCredentials(email: string, password: string): Promise<{ ok: true; pendingToken: string } | { ok: false; error: string }> {
  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, appScope: "admin" }),
    })
    if (!res.ok) return { ok: false, error: SERVICE_UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: SERVICE_UNAVAILABLE_ERROR }
  }
  const parsed = loginResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: SERVICE_UNAVAILABLE_ERROR }
  const result = parsed.data
  if (!result.ok) return { ok: false, error: result.error }
  if (result.kind !== "code-required") return { ok: false, error: SERVICE_UNAVAILABLE_ERROR }
  return { ok: true, pendingToken: result.pendingToken }
}

/**
 * Step 2: the six-digit authenticator code, checked against the real
 * identity service (apps/api), which issues the real session on success.
 */
export async function verifyCode(pendingToken: string, code: string): Promise<{ ok: true; role: RoleKey } | { ok: false; error: string }> {
  let body: unknown
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingToken, code: code.trim() }),
    })
    if (!res.ok) return { ok: false, error: SERVICE_UNAVAILABLE_ERROR }
    body = await res.json()
  } catch {
    return { ok: false, error: SERVICE_UNAVAILABLE_ERROR }
  }
  const parsed = verifyCodeResponseSchema.safeParse(body)
  if (!parsed.success) return { ok: false, error: SERVICE_UNAVAILABLE_ERROR }
  const result = parsed.data
  if (!result.ok) return { ok: false, error: result.error }
  if (result.role !== "admin") return { ok: false, error: SERVICE_UNAVAILABLE_ERROR }
  const role: RoleKey = "admin"
  update((s) => log(s, role, "Signed in (SSO + MFA)"))
  setSessionToken(result.token)
  setFlagsCookie(getState().flags)
  return { ok: true, role }
}

export async function signOut(): Promise<ActionResult> {
  const role = getSessionRole()
  if (role) update((s) => log(s, role, "Signed out"))
  setSessionToken(null)
  return ok()
}

/** Restores the seed data; the user stays signed in. */
export async function resetDemoData(): Promise<ActionResult> {
  resetState()
  setFlagsCookie(getState().flags)
  return ok("Demo data reset")
}

/** Writes the refusal of a forbidden route to the audit log (once per visit). */
export async function logRefusal(route: string): Promise<ActionResult> {
  const role = getSessionRole()
  if (!role) return ok()
  update((s) => log(s, role, `Refused: requested "${route}", outside this role. Blocked at the server, not just hidden in the menu.`))
  return ok()
}
