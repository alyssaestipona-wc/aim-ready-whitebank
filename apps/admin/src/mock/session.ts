"use client"

/**
 * The session cookie carries a real signed session token issued by
 * apps/api's identity service. `src/proxy.ts` verifies its signature
 * server-side on every request; this module only decodes it (no signature
 * check — the browser never has the signing secret) to drive UI rendering.
 */
import { useSyncExternalStore } from "react"

import { decodeSessionToken } from "../lib/decode-session-token"
import { FLAGS_COOKIE, SESSION_COOKIE } from "../lib/access"
import type { RoleKey } from "./types"

export { FLAGS_COOKIE, SESSION_COOKIE }

const listeners = new Set<() => void>()

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null
}

function writeCookie(name: string, value: string | null): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  document.cookie = value === null ? `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}` : `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${secure}`
}

export function getSessionRole(): RoleKey | null {
  const token = readCookie(SESSION_COOKIE)
  if (!token) return null
  return decodeSessionToken(token) ? "admin" : null
}

/** Stores the real session token apps/api's identity service issued, or clears it on sign-out. */
export function setSessionToken(token: string | null): void {
  writeCookie(SESSION_COOKIE, token)
  for (const l of listeners) l()
}

function base64url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Test-only: signs in directly, without the real identity service, by
 * writing a token-shaped (but unsigned) cookie value that
 * `decodeSessionToken` accepts — it never checks the signature. A no-op
 * outside `NODE_ENV=test` so it can never substitute for the real sign-in
 * path in a running app.
 */
export function setSessionRole(role: RoleKey | null): void {
  if (process.env.NODE_ENV !== "test") return
  if (!role) return setSessionToken(null)
  const iat = Math.floor(Date.now() / 1000)
  const payload = { sub: "admin", tenantId: "kalinaw", appScope: "admin", role: "admin", email: "admin@kalinawbank.ph", typ: "session", iat, exp: iat + 4 * 60 * 60 }
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = base64url(JSON.stringify(payload))
  setSessionToken(`${header}.${body}.test-only-unsigned`)
}

/** Mirrors module flags into a cookie so the server-side route check can see them. */
export function setFlagsCookie(flags: { ai: boolean }): void {
  writeCookie(FLAGS_COOKIE, flags.ai ? "ai" : "")
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useSessionRole(): RoleKey | null {
  return useSyncExternalStore(subscribe, getSessionRole, () => null)
}
