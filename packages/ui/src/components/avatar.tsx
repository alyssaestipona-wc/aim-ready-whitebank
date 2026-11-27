import * as React from "react"
import { cn } from "cn"

/** Two-letter initials from a full name, e.g. "Juan Dela Cruz" → "JC". */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

const tones = {
  light: "bg-g-150 text-ink",
  ink: "bg-ink text-white",
  sidebar: "bg-ink-3 text-white",
} as const

function Avatar({
  name,
  tone = "light",
  size = "md",
  className,
}: {
  name: string
  tone?: keyof typeof tones
  size?: "sm" | "md"
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="avatar"
      className={cn(
        "flex flex-none items-center justify-center rounded-full font-semibold",
        size === "sm" ? "size-[26px] text-[10px]" : "size-[30px] text-[11px]",
        tones[tone],
        className
      )}
    >
      {initialsOf(name)}
    </span>
  )
}

export { Avatar, initialsOf }
