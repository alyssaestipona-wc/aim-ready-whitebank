"use client"

import { Button, EmptyState } from "@aim-ready/ui"

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState className="pt-16" title="Something went wrong" hint="This page couldn’t load. Your application is safe.">
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </EmptyState>
  )
}
