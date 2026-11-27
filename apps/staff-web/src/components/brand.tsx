import { cn } from "@aim-ready/ui"

/** "W" wordmark with the product and bank name, on ink. */
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-[26px] flex-none items-center justify-center rounded-[7px] bg-white text-[13px] font-bold tracking-[-0.04em] text-ink">W</span>
      <div>
        <b className="block text-base font-semibold tracking-[-0.01em] text-white">WhiteBank Lending</b>
        <small className="block text-[11px] text-white/50">WhiteBank</small>
      </div>
    </div>
  )
}
