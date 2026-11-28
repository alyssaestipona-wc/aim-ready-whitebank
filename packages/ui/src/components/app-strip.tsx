import * as React from "react"
import { cn } from "cn"

/**
 * The slim ink strip at the top of every page: the app's name, a short
 * caption, and links or controls on the right (e.g. the other app).
 */
function AppStrip({
  name,
  caption,
  children,
  full = false,
  className,
}: {
  name: string
  caption?: string
  children?: React.ReactNode
  /** Full-width (staff console) instead of the borrower's centered column. */
  full?: boolean
  className?: string
}) {
  return (
    <div data-slot="app-strip" className={cn("sticky top-0 z-70 border-b border-white/10 bg-ink text-xs text-white/70", className)}>
      <div className={cn("mx-auto flex h-[38px] items-center gap-3", full ? "max-w-none px-4 md:px-7" : "max-w-[760px] px-6 md:px-8")}>
        <b className="min-w-0 truncate font-semibold text-white">{name}</b>
        {caption && <span className="hidden truncate sm:inline">· {caption}</span>}
        <span className="flex-1" />
        {children}
      </div>
    </div>
  )
}

/** A bordered link or button for the strip. */
function AppStripLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      className={cn(
        "inline-flex flex-none items-center gap-1.5 rounded-sm border border-white/25 px-2.5 py-[3px] text-xs font-medium whitespace-nowrap text-white no-underline hover:bg-white/10",
        className
      )}
      {...props}
    />
  )
}

export { AppStrip, AppStripLink }
