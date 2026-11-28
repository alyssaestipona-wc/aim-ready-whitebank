import { NextResponse, type NextRequest } from "next/server"

import { allowed, flagsFromCookie, FLAGS_COOKIE, isSessionRole, LANDING, matchRoute, pathOf, SESSION_COOKIE } from "./lib/access"

/**
 * Server-side route check, run before any page renders.
 *
 * PLACEHOLDER SESSION: the role comes from an unsigned cookie set by the mock
 * sign-in. This keeps access control on the server, as AGENTS.md requires,
 * but it is not authentication. Replace with the `apps/api` session.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const raw = request.cookies.get(SESSION_COOKIE)?.value
  const signedIn = isSessionRole(raw)

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
