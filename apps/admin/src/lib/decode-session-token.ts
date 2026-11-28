"use client"

import { sessionTokenPayloadSchema, type SessionTokenPayload } from "@aim-ready/contracts"

/**
 * Reads the `role`/`appScope` claims out of the session cookie for UI
 * purposes — no signature check, since the browser never has
 * `AUTH_JWT_SECRET`. This is never the access-control boundary:
 * `src/proxy.ts` verifies the signature server-side on every request, so a
 * tampered cookie only misleads this app's own rendering, never what it's
 * allowed to do.
 */
export function decodeSessionToken(token: string): SessionTokenPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const base64 = (parts[1] as string).replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
  let payload: unknown
  try {
    payload = JSON.parse(atob(padded))
  } catch {
    return null
  }
  if (typeof payload !== "object" || payload === null || (payload as Record<string, unknown>)["typ"] !== "session") return null
  const parsed = sessionTokenPayloadSchema.safeParse(payload)
  if (!parsed.success || parsed.data.appScope !== "admin") return null
  if (Math.floor(Date.now() / 1000) >= parsed.data.exp) return null
  return parsed.data
}
