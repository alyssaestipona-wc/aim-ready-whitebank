import { NextResponse, type NextRequest } from "next/server"

/** Must match SESSION_COOKIE in src/mock/actions.ts. */
const SESSION_COOKIE = "wbl_borrower_session"
const PUBLIC_PATHS = new Set(["/sign-in"])

/**
 * Sends signed-out requests to the sign-in page before anything renders.
 *
 * PLACEHOLDER SESSION: the cookie is set by the client-side mock sign-in and
 * is unsigned. This is not authentication; it is replaced by the real session
 * when apps/api auth lands (ADR-0003).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[a-zA-Z0-9]+$).*)"],
}
