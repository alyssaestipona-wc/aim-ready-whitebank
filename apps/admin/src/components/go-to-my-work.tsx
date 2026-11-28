"use client"

import { Button } from "@aim-ready/ui"
import Link from "next/link"

import { LANDING, pathOf } from "@/lib/access"

/** Button back to the landing screen (Products — there is only one role here). */
export function GoToMyWork({ primary }: { primary?: boolean }) {
  return (
    <Button asChild variant={primary ? "primary" : "default"}>
      <Link href={pathOf(LANDING.admin)}>Go to my work</Link>
    </Button>
  )
}
