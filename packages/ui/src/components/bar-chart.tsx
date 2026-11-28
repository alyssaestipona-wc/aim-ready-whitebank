import * as React from "react"
import { cn } from "cn"

export type BarDatum = { label: string; value: number; display?: string }

/**
 * Horizontal bars, all in the single accent colour. Widths are drawn to one
 * scale: the largest value (or `max`) fills the track.
 */
function BarChart({ data, max, className, label }: { data: readonly BarDatum[]; max?: number; className?: string; label?: string }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <div role="list" aria-label={label} data-slot="bar-chart" className={className}>
      {data.map((d) => {
        const pct = Math.max(0, Math.min(100, (d.value / top) * 100))
        return (
          <div
            role="listitem"
            key={d.label}
            className="grid grid-cols-[96px_1fr_60px] items-center gap-3 py-1.5 text-[12.5px] sm:grid-cols-[150px_1fr_74px]"
          >
            <span className="truncate">{d.label}</span>
            <span className="h-2.5 overflow-hidden rounded-[3px] bg-g-100">
              <Bar pct={pct} />
            </span>
            <span className="text-right font-mono text-xs font-medium text-strong">{d.display ?? d.value}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * The filled part of a track. The width is data, not design, so it is passed
 * as a CSS custom property; the colour and shape stay in utility classes.
 */
function Bar({ pct, className }: { pct: number; className?: string }) {
  return (
    <i
      data-slot="bar"
      data-pct={Math.round(pct)}
      className={cn("block h-full w-(--bar) rounded-[3px] bg-brand", className)}
      style={{ "--bar": `${pct}%` } as React.CSSProperties}
    />
  )
}

export { Bar, BarChart }
