import { NextResponse, type NextRequest } from "next/server"

import { verifySessionToken } from "@/lib/session-token"

/** Must match SESSION_COOKIE in src/mock/actions.ts. */
const SESSION_COOKIE = "wbl_borrower_session"
const PUBLIC_PATHS = new Set(["/sign-in"])

/**
 * Sends signed-out requests to the sign-in page before anything renders.
 *
 * The cookie carries a real session token issued by apps/api's identity
 * service and signed with HMAC-SHA256; it is verified here, not just
 * checked for presence (real-identity-service).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifySessionToken(token)) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[a-zA-Z0-9]+$).*)"],
}
