"use client"

import { PageHeader } from "@aim-ready/ui"
import { useSearchParams } from "next/navigation"
import * as React from "react"

import { GoToMyWork } from "@/components/go-to-my-work"
import { logRefusal } from "@/mock"

/**
 * The server refused the route (see src/proxy.ts) and rewrote the request
 * here; this records the refusal in the audit log once per visit.
 */
export function DeniedNotice() {
  const route = useSearchParams().get("route") ?? "unknown"
  const logged = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (logged.current === route) return
    logged.current = route
    void logRefusal(route)
  }, [route])
  return (
    <PageHeader
      title="You don’t have access to this"
      description="Your role can’t open this screen. The request was refused by the server, not just hidden from the menu, and the attempt is in the audit log."
      actions={<GoToMyWork primary />}
    />
  )
}
