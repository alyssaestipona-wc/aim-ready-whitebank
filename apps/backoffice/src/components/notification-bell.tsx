"use client"

import { Button, Popover, PopoverContent, PopoverTrigger, StatusPill, cn } from "@aim-ready/ui"
import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { hrefFor } from "@/lib/access"
import { markNotificationsRead, staffNotifs } from "@/mock"

import { useConsole } from "./use-console"

const STEP = 10

/**
 * Bell with an unread count. The dropdown loads 10 more notifications each
 * time its list is scrolled to the end, and links to the notifications page.
 */
export function NotificationBell() {
  const ctx = useConsole()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [shown, setShown] = React.useState(STEP)
  if (!ctx) return null
  const { role, s } = ctx
  const notes = staffNotifs(s, role)
  const unread = notes.filter((n) => !n.read).length
  const rows = notes.slice(0, shown)

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const t = e.currentTarget
    if (shown < notes.length && t.scrollTop + t.clientHeight >= t.scrollHeight - 40) setShown((n) => n + STEP)
  }

  async function openOne(id: string, go: string | null) {
    await markNotificationsRead([id])
    setOpen(false)
    const href = go ? hrefFor(go, role, s.flags) : null
    if (href) router.push(href)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setShown(STEP)
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" aria-label="Notifications" className="relative flex size-[34px] items-center justify-center rounded-md border border-border bg-paper text-ink-4">
          <Bell className="size-4" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -top-[5px] -right-[5px] h-[17px] min-w-[17px] rounded-full bg-brand px-1 text-center text-[10px] leading-[17px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" data-testid="notification-popover">
        <div className="flex items-center gap-2 border-b border-border-soft px-3.5 py-3">
          <b className="text-[13.5px] text-strong">Notifications</b>
          {unread > 0 && (
            <StatusPill tone="info" plain>
              {unread} new
            </StatusPill>
          )}
          <span className="flex-1" />
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={() => markNotificationsRead(notes.map((n) => n.id))}>
              Mark all as read
            </Button>
          )}
        </div>
        <div data-slot="notification-list" onScroll={onScroll} className="max-h-[420px] overflow-y-auto border-b border-border-soft">
          {rows.length ? (
            <>
              {rows.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  data-unread={!n.read || undefined}
                  onClick={() => openOne(n.id, n.go)}
                  className="flex w-full items-start gap-2.5 border-0 border-b border-border-soft bg-transparent px-3.5 py-2.5 text-left text-sm text-text hover:bg-g-50"
                >
                  <i aria-hidden="true" className={cn("mt-1.5 size-[7px] flex-none rounded-full", n.read ? "bg-transparent" : "bg-brand")} />
                  <span>
                    <span className={cn(!n.read && "font-semibold text-strong")}>{n.text}</span>
                    <small className="mt-0.5 block text-xs text-subtle">
                      {n.type} · {n.when}
                    </small>
                  </span>
                </button>
              ))}
              <div className="px-3.5 py-2.5 text-center text-xs text-subtle">{shown < notes.length ? "Loading more…" : "You’ve reached the end"}</div>
            </>
          ) : (
            <div className="px-2.5 py-2.5 text-sm">You’re all caught up.</div>
          )}
        </div>
        <button
          type="button"
          className="w-full rounded-b-xl border-0 bg-transparent p-[11px] text-sm font-semibold text-brand-700 hover:bg-brand-50"
          onClick={() => {
            setOpen(false)
            router.push("/notifications")
          }}
        >
          View all notifications
        </button>
      </PopoverContent>
    </Popover>
  )
}
