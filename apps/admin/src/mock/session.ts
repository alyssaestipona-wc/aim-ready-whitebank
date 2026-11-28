"use client"

/**
 * PLACEHOLDER SESSION — not authentication. Signing in writes the role key
 * to an unsigned cookie that `src/proxy.ts` reads to enforce route access on
 * the server. Replace with the real session from `apps/api` auth.
 */
import { useSyncExternalStore } from "react"

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
  document.cookie = value === null ? `${name}=; Path=/; Max-Age=0; SameSite=Lax` : `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`
}

export function getSessionRole(): RoleKey | null {
  return readCookie(SESSION_COOKIE) === "admin" ? "admin" : null
}

export function setSessionRole(role: RoleKey | null): void {
  writeCookie(SESSION_COOKIE, role)
  for (const l of listeners) l()
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
