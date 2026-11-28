"use client"

import { sessionTokenPayloadSchema, type SessionTokenPayload } from "@aim-ready/contracts"

/**
 * Reads the `role`/`appScope` claims out of the session cookie for UI
 * purposes (which nav to render) — no signature check, since the browser
 * never has `AUTH_JWT_SECRET`. This is never the access-control boundary:
 * `src/proxy.ts` verifies the signature server-side on every request, so a
 * tampered cookie only misleads this app's own rendering, never what it's
 * allowed to do.
 */
function base64urlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(input.length + ((4 - (input.length % 4)) % 4), "=")
  return atob(base64)
}

export function decodeSessionToken(token: string): SessionTokenPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  let payload: unknown
  try {
    payload = JSON.parse(base64urlDecode(parts[1] as string))
  } catch {
    return null
  }
  if (typeof payload !== "object" || payload === null || (payload as Record<string, unknown>)["typ"] !== "session") return null
  const parsed = sessionTokenPayloadSchema.safeParse(payload)
  if (!parsed.success || parsed.data.appScope !== "staff") return null
  if (Math.floor(Date.now() / 1000) >= parsed.data.exp) return null
  return parsed.data
}
