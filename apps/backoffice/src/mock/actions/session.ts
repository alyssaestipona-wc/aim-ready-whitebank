"use client"

import { loginResponseSchema, verifyCodeResponseSchema } from "@aim-ready/contracts"

import type { SessionRole } from "../../lib/access"
import { isSessionRole } from "../../lib/access"
import { API_BASE_URL, USERS } from "../constants"
import { me, now } from "../engine"
import { getSessionRole, setFlagsCookie, setSessionToken } from "../session"
import { getState, resetState, update } from "../store"
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
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, appScope: "staff" }),
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
export async function verifyCode(pendingToken: string, code: string): Promise<{ ok: true; role: SessionRole } | { ok: false; error: string }> {
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
  if (!isSessionRole(result.role)) return { ok: false, error: SERVICE_UNAVAILABLE_ERROR }
  const role = result.role
  update((s) => {
    s.audit.unshift({ tenantId: s.tenantId, when: now(s), who: USERS[role].name, role: USERS[role].title, what: "Signed in (SSO + MFA)", target: "" })
  })
  setSessionToken(result.token)
  setFlagsCookie(getState().flags)
  return { ok: true, role }
}

export async function signOut(): Promise<ActionResult> {
  const role = getSessionRole()
  if (role) update((s) => s.audit.unshift({ tenantId: s.tenantId, when: now(s), who: me(role).name, role: me(role).title, what: "Signed out", target: "" }))
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
  update((s) => {
    s.audit.unshift({ tenantId: s.tenantId, when: now(s), who: me(role).name, role: me(role).title, what: `Refused: requested "${route}", outside this role. Blocked at the server, not just hidden in the menu.`, target: "" })
  })
  return ok()
}

export async function markNotificationsRead(ids: string[]): Promise<ActionResult> {
  const role = getSessionRole()
  if (!role) return ok()
  update((s) => {
    for (const id of ids) s.notifRead[`${role}:${id}`] = true
  })
  return ok()
}
