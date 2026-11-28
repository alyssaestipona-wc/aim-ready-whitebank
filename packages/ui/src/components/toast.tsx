"use client"

import * as React from "react"
import { cn } from "cn"
import { Toast as ToastPrimitive } from "radix-ui"

export type ToastTone = "ok" | "warn" | "bad"
type ToastItem = { id: number; message: string; tone: ToastTone }

const ToastContext = React.createContext<((message: string, tone?: ToastTone) => void) | null>(null)

const dot: Record<ToastTone, string> = {
  ok: "bg-brand-on-ink",
  warn: "bg-g-400",
  bad: "bg-white",
}

/** Transient ink toasts, bottom-centre, announced politely to screen readers. */
function ToastProvider({ children, duration = 3200 }: { children: React.ReactNode; duration?: number }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const seq = React.useRef(0)
  const push = React.useCallback((message: string, tone: ToastTone = "ok") => {
    seq.current += 1
    const id = seq.current
    setItems((list) => [...list.slice(-2), { id, message, tone }])
  }, [])

  return (
    <ToastContext.Provider value={push}>
      <ToastPrimitive.Provider duration={duration} swipeDirection="down">
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            data-tone={t.tone}
            onOpenChange={(open) => {
              if (!open) setItems((list) => list.filter((x) => x.id !== t.id))
            }}
            className="flex items-center gap-[9px] rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-pop data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=open]:fade-in-0"
          >
            <i aria-hidden="true" className={cn("size-[7px] flex-none rounded-full", dot[t.tone])} />
            <ToastPrimitive.Description>{t.message}</ToastPrimitive.Description>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-[max(22px,env(safe-area-inset-bottom,0px))] left-1/2 z-[1000] grid w-max max-w-[calc(100vw-32px)] -translate-x-1/2 justify-items-center gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

/** Returns `toast(message, tone?)`. Must be used inside ToastProvider. */
function useToast() {
  const push = React.useContext(ToastContext)
  if (!push) throw new Error("useToast must be used inside <ToastProvider>")
  return push
}

export { ToastProvider, useToast }
