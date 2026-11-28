import { NextResponse, type NextRequest } from "next/server"

import { allowed, flagsFromCookie, FLAGS_COOKIE, isSessionRole, LANDING, matchRoute, pathOf, SESSION_COOKIE } from "./lib/access"
import { verifySessionToken } from "./lib/session-token"

/**
 * Server-side route check, run before any page renders.
 *
 * The cookie carries a real session token issued by apps/api's identity
 * service and signed with HMAC-SHA256; it is verified here, not just
 * checked for presence (real-identity-service).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const payload = token ? verifySessionToken(token) : null
  const role = payload && isSessionRole(payload.role) ? payload.role : null

  if (pathname === "/sign-in") {
    return role ? NextResponse.redirect(new URL(pathOf(LANDING[role]), request.url)) : NextResponse.next()
  }
  if (!role) return NextResponse.redirect(new URL("/sign-in", request.url))
  if (pathname === "/") return NextResponse.redirect(new URL(pathOf(LANDING[role]), request.url))

  const route = matchRoute(pathname)
  if (!route) return NextResponse.next() // not-found.tsx renders
  const flags = flagsFromCookie(request.cookies.get(FLAGS_COOKIE)?.value)
  if (!allowed(role, route.key, flags)) {
    const url = new URL("/denied", request.url)
    url.searchParams.set("route", route.key)
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
