import { Suspense } from "react"

import { ConsoleShell, ShellSkeleton } from "@/components/console-shell"
import { StaffStrip } from "@/components/staff-strip"

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  // The shell reads the URL (breadcrumbs, active nav), which is request-time
  // data for dynamic routes such as /applications/[id].
  return (
    <Suspense
      fallback={
        <>
          <StaffStrip />
          <ShellSkeleton />
        </>
      }
    >
      <ConsoleShell>{children}</ConsoleShell>
    </Suspense>
  )
}
