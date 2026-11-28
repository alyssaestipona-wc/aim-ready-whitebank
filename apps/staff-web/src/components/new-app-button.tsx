import { Button } from "@aim-ready/ui"
import { Plus } from "lucide-react"
import Link from "next/link"

export function NewAppButton() {
  return (
    <Button asChild variant="primary">
      <Link href="/applications/new">
        <Plus aria-hidden="true" />
        New assisted application
      </Link>
    </Button>
  )
}
