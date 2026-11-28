import { createHmac, timingSafeEqual } from "node:crypto"

import { sessionTokenPayloadSchema, type SessionTokenPayload } from "@aim-ready/contracts"

/**
 * Verifies the session token apps/api's identity service issued, without
 * calling it — `src/proxy.ts` always runs on Next.js 16's Node.js runtime
 * (never Edge, not configurable), so `node:crypto` is safe here. Never
 * import this from a client component; `src/lib/decode-session-token.ts`
 * is the browser-safe, signature-unchecked counterpart used for UI only.
 */

function secret(): string {
  const value = process.env.AUTH_JWT_SECRET
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_JWT_SECRET must be set in production; refusing to verify sessions with the insecure local default.")
  }
  return value ?? "dev-only-insecure-secret-change-me"
}

function sign(data: string, key: string): string {
  return createHmac("sha256", key).update(data).digest("base64url")
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [header, body, signature] = parts as [string, string, string]
  const expected = sign(`${header}.${body}`, secret())
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  } catch {
    return null
  }
  if (typeof payload !== "object" || payload === null || (payload as Record<string, unknown>)["typ"] !== "session") return null
  const exp = (payload as Record<string, unknown>)["exp"]
  if (typeof exp !== "number" || Math.floor(Date.now() / 1000) >= exp) return null

  const parsed = sessionTokenPayloadSchema.safeParse(payload)
  if (!parsed.success || parsed.data.appScope !== "staff") return null
  return parsed.data
}
