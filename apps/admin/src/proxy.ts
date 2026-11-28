import { NextResponse, type NextRequest } from "next/server"

import { allowed, flagsFromCookie, FLAGS_COOKIE, LANDING, matchRoute, pathOf, SESSION_COOKIE } from "./lib/access"
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
  const signedIn = !!token && !!verifySessionToken(token)

  if (pathname === "/sign-in") {
    return signedIn ? NextResponse.redirect(new URL(pathOf(LANDING.admin), request.url)) : NextResponse.next()
  }
  if (!signedIn) return NextResponse.redirect(new URL("/sign-in", request.url))
  if (pathname === "/") return NextResponse.redirect(new URL(pathOf(LANDING.admin), request.url))

  const route = matchRoute(pathname)
  if (!route) return NextResponse.next() // not-found.tsx renders
  const flags = flagsFromCookie(request.cookies.get(FLAGS_COOKIE)?.value)
  if (!allowed(route.key, flags)) {
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
