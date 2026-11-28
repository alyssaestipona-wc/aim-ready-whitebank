"use client"

import { DEMO_PASSWORD, USERS } from "../constants"
import { log } from "../engine"
import { getSessionRole, setFlagsCookie, setSessionRole } from "../session"
import { getState, resetState, update } from "../store"
import type { RoleKey } from "../types"
import { fail, ok, type ActionResult } from "./result"

/**
 * Step 1 of sign-in: email and password. On success returns the role whose
 * authentication code is now expected. The password is the shared demo
 * password for the seeded account (sample data only). There is only one
 * seeded account here, so a staff or borrower email already fails this
 * lookup and gets the same generic message.
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
  update((s) => log(s, role, "Signed in (SSO + MFA)"))
  setSessionRole(role)
  setFlagsCookie(getState().flags)
  return ok()
}

export async function signOut(): Promise<ActionResult> {
  const role = getSessionRole()
  if (role) update((s) => log(s, role, "Signed out"))
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
  update((s) => log(s, role, `Refused: requested "${route}", outside this role. Blocked at the server, not just hidden in the menu.`))
  return ok()
}
