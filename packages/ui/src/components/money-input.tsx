"use client"

import * as React from "react"
import { cn } from "cn"

import { caretAfterFormat, formatMoneyFixed, formatMoneyLive } from "../lib/money-input-format"
import { fieldControl } from "./ui/input"

type MoneyInputProps = Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "type"> & {
  /** Peso amount, or null when empty. */
  value: number | null
  onValueChange: (value: number | null) => void
}

/**
 * Peso amount field with a ₱ prefix. Inserts thousands separators while
 * typing, allows at most two decimals, keeps the caret in place and shows
 * two decimals on blur.
 */
function MoneyInput({ value, onValueChange, className, onBlur, onFocus, ...props }: MoneyInputProps) {
  const [focused, setFocused] = React.useState(false)
  const [text, setText] = React.useState(() => formatMoneyFixed(value))
  const ref = React.useRef<HTMLInputElement>(null)
  const pendingCaret = React.useRef<number | null>(null)

  // Follow outside changes (e.g. a product switch clamps the amount) while not typing.
  React.useEffect(() => {
    if (!focused) setText(formatMoneyFixed(value))
  }, [value, focused])

  React.useLayoutEffect(() => {
    if (pendingCaret.current !== null && ref.current) {
      try {
        ref.current.setSelectionRange(pendingCaret.current, pendingCaret.current)
      } catch {
        // Some input types refuse selection ranges; the caret then stays at the end.
      }
      pendingCaret.current = null
    }
  })

  return (
    <div className="relative" data-slot="money-input">
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13.5px] text-muted-foreground">
        ₱
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn(fieldControl, "pl-7 tabular-nums", className)}
        value={text}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onChange={(e) => {
          const raw = e.target.value
          const live = formatMoneyLive(raw)
          pendingCaret.current = caretAfterFormat(raw, e.target.selectionStart ?? raw.length, live.text)
          setText(live.text)
          onValueChange(live.value)
        }}
        onBlur={(e) => {
          setFocused(false)
          setText(formatMoneyFixed(value))
          onBlur?.(e)
        }}
        {...props}
      />
    </div>
  )
}

export { MoneyInput }
