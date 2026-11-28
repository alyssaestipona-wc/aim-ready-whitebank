"use client"

import { Button, Card, ListView, PageHeader, StatusPill, cn, type ListFilterDef } from "@aim-ready/ui"
import { useRouter } from "next/navigation"

import { useConsole } from "@/components/use-console"
import { hrefFor } from "@/lib/access"
import { markNotificationsRead, staffNotifs, type StaffNotification } from "@/mock"

export default function NotificationsPage() {
  const ctx = useConsole()
  const router = useRouter()
  if (!ctx) return null
  const { role, s } = ctx
  const all = staffNotifs(s, role)
  const unread = all.filter((n) => !n.read).length
  const types = [...new Set(all.map((n) => n.type))].sort()
  const filters: ListFilterDef<StaffNotification>[] = [
    { key: "st", label: "Status", options: [["unread", "Unread"], ["read", "Read"]], test: (n, v) => (v === "unread" ? !n.read : n.read) },
    { key: "type", label: "Type", options: types.map((t) => [t, t] as const), test: (n, v) => n.type === v },
  ]

  async function open(n: StaffNotification) {
    await markNotificationsRead([n.id])
    const href = n.go ? hrefFor(n.go, role, s.flags) : null
    if (href) router.push(href)
  }

  return (
    <>
      <PageHeader
        eyebrow="My work"
        title="Notifications"
        description="Everything that needed your attention, newest first. Open one to go straight to the case or screen it’s about."
        actions={
          <>
            {unread ? <StatusPill tone="info">{unread} unread</StatusPill> : <StatusPill>All read</StatusPill>}
            {unread > 0 && <Button onClick={() => markNotificationsRead(all.map((n) => n.id))}>Mark all as read</Button>}
          </>
        }
      />
      <Card>
        <ListView
          label="Notifications"
          items={all}
          filters={filters}
          searchPlaceholder="Search notifications"
          searchText={(n) => `${n.text} ${n.type}`}
          rowKey={(n) => n.id}
          onRowActivate={open}
          emptyMessage="No notifications"
          columns={[
            {
              header: "",
              cell: (n) => <span aria-label={n.read ? "Read" : "Unread"} className={cn("inline-block size-2 rounded-full", n.read ? "border border-g-300" : "bg-brand")} />,
            },
            { header: "Notification", cell: (n) => (n.read ? n.text : <b className="font-semibold text-strong">{n.text}</b>) },
            { header: "Type", cell: (n) => <StatusPill>{n.type}</StatusPill> },
            { header: "When", cell: (n) => <span className="mono">{n.when}</span> },
          ]}
        />
      </Card>
    </>
  )
}
