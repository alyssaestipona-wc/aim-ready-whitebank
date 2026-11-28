"use client"

import { PageHeader } from "@aim-ready/ui"
import { usePathname, useSearchParams } from "next/navigation"
import * as React from "react"

import { GoToMyWork } from "@/components/go-to-my-work"
import { matchRoute } from "@/lib/access"
import { logRefusal } from "@/mock"

/**
 * The server refused the route (see src/proxy.ts) and rewrote the request
 * here; this records the refusal in the audit log once per visit. After a
 * rewrite the browser still shows the refused path, so read the route from
 * it, falling back to the query the proxy adds.
 */
export function DeniedNotice() {
  const pathname = usePathname()
  const query = useSearchParams().get("route")
  const route = (pathname !== "/denied" && matchRoute(pathname)?.key) || query || "unknown"
  const logged = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (logged.current === route) return
    logged.current = route
    void logRefusal(route)
  }, [route])
  return (
    <PageHeader
      title="You don’t have access to this"
      description="This module is off for the tenant right now. The request was refused by the server, not just hidden from the menu, and the attempt is in the audit log."
      actions={<GoToMyWork primary />}
    />
  )
}
