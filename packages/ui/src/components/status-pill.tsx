import * as React from "react"

import { Badge, type BadgeVariant } from "./ui/badge"

/** A Badge with a status dot. Tones are the accent and neutrals only. */
function StatusPill({
  tone = "neutral",
  plain = false,
  children,
  className,
}: {
  tone?: BadgeVariant
  plain?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <Badge variant={tone} plain={plain} className={className}>
      {children}
    </Badge>
  )
}

export { StatusPill }
