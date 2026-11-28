import { Suspense } from "react"

import { AdminStrip } from "@/components/admin-strip"
import { ConsoleShell, ShellSkeleton } from "@/components/console-shell"

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  // The shell reads the URL (breadcrumbs, active nav), which is request-time
  // data for dynamic routes such as /config/templates/[id].
  return (
    <Suspense
      fallback={
        <>
          <AdminStrip />
          <ShellSkeleton />
        </>
      }
    >
      <ConsoleShell>{children}</ConsoleShell>
    </Suspense>
  )
}
