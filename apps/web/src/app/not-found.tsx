import Link from "next/link"
import { Button, EmptyState } from "@aim-ready/ui"

export default function NotFound() {
  return (
    <EmptyState className="pt-16" title="Not found" hint="That page doesn’t exist.">
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </EmptyState>
  )
}
