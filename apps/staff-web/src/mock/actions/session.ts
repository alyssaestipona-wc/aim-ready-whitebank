"use client"

import { DEMO_PASSWORD, USERS } from "../constants"
import { me, now } from "../engine"
import { getSessionRole, setFlagsCookie, setSessionRole } from "../session"
import { getState, resetState, update } from "../store"
import type { RoleKey } from "../types"
import { fail, ok, type ActionResult } from "./result"

/**
 * Step 1 of sign-in: email and password. On success returns the role whose
 * authentication code is now expected. The password is the shared demo
 * password for seeded accounts (sample data only).
 */
export async function checkCredentials(email: string, password: string): Promise<{ ok: true; role: RoleKey } | { ok: false; error: string }> {
  const e = email.trim().toLowerCase()
  const role = (Object.keys(USERS) as RoleKey[]).find((k) => USERS[k].email === e)
  if (!role || password !== DEMO_PASSWORD) return { ok: false, error: "Email or password is incorrect." }
  return { ok: true, role }
}

/**
 * Step 2: the six-digit authenticator code. Any six digits pass in this
 * simulation; the real check is the identity provider's.
 */
export async function verifyCode(role: RoleKey, code: string): Promise<ActionResult> {
  if (!/^\d{6}$/.test(code.trim())) return fail("That code is incorrect. Try again.")
  update((s) => {
    s.audit.unshift({ when: now(s), who: USERS[role].name, role: USERS[role].title, what: "Signed in (SSO + MFA)", target: "" })
  })
  setSessionRole(role)
  setFlagsCookie(getState().flags)
  return ok()
}

export async function signOut(): Promise<ActionResult> {
  const role = getSessionRole()
  if (role) update((s) => s.audit.unshift({ when: now(s), who: me(role).name, role: me(role).title, what: "Signed out", target: "" }))
  setSessionRole(null)
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
    s.audit.unshift({ when: now(s), who: me(role).name, role: me(role).title, what: `Refused: requested "${route}", outside this role. Blocked at the server, not just hidden in the menu.`, target: "" })
  })
  return ok()
}

export async function markNotificationsRead(ids: string[]): Promise<ActionResult> {
  const role = getSessionRole()
  update((s) => {
    for (const id of ids) s.notifRead[`${role}:${id}`] = true
  })
  return ok()
}
