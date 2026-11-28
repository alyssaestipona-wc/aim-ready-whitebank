"use client"

import { Button, EmptyState } from "@aim-ready/ui"

/** Shown when a screen throws; the shell stays usable. */
export default function ConsoleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState title="Something went wrong on this screen" hint="Your sample data is safe. Try again, or reset the demo data from the sidebar.">
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </EmptyState>
  )
}
