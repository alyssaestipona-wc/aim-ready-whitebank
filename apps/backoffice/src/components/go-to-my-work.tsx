"use client"

import { Button } from "@aim-ready/ui"
import Link from "next/link"

import { LANDING, pathOf } from "@/lib/access"
import { useSessionRole } from "@/mock"

/** Button back to the signed-in role's landing screen. */
export function GoToMyWork({ primary }: { primary?: boolean }) {
  const role = useSessionRole()
  return (
    <Button asChild variant={primary ? "primary" : "default"}>
      <Link href={role ? pathOf(LANDING[role]) : "/"}>Go to my work</Link>
    </Button>
  )
}
