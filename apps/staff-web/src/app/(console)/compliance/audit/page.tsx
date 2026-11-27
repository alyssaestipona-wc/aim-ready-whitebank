"use client"

import { Card, ListView, PageHeader, type ListFilterDef } from "@aim-ready/ui"
import { useRouter } from "next/navigation"

import { useConsole } from "@/components/use-console"
import { hrefFor } from "@/lib/access"
import type { AuditEntry } from "@/mock"

const distinct = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort().map((v) => [v, v] as const)

const KIND: Record<string, (w: string) => boolean> = {
  decision: (w) => /Auto-|Referred|Recommended/.test(w),
  approval: (w) => /Approved|override|Declined|Returned/i.test(w) && !/booking|rule set|published/i.test(w),
  booking: (w) => /book|disburs|core/i.test(w),
  config: (w) => /rule set|draft|published|automation|kill switch|module|drill|calendar/i.test(w),
  access: (w) => /Signed in|Signed out|Refused|Revealed/.test(w),
}

export default function AuditLogPage() {
  const ctx = useConsole()
  const router = useRouter()
  if (!ctx) return null
  const { role, s } = ctx
  const list = s.audit
  const day = (a: AuditEntry) => (a.when || "").split(",")[0] ?? ""
  const filters: ListFilterDef<AuditEntry>[] = [
    { key: "role", label: "Role", options: distinct(list.map((a) => a.role)), test: (a, v) => a.role === v },
    { key: "kind", label: "Action type", options: [["decision", "Decisions"], ["approval", "Approvals and overrides"], ["booking", "Booking"], ["config", "Configuration"], ["access", "Sign-in and access"]], test: (a, v) => !!KIND[v]?.(a.what) },
    { key: "day", label: "Date", options: distinct(list.map(day)), test: (a, v) => day(a) === v },
  ]
  const target = (a: AuditEntry) => (a.target && s.apps.some((x) => x.id === a.target) ? hrefFor(`case:${a.target}`, role, s.flags) : null)
  return (
    <>
      <PageHeader eyebrow="Compliance" title="Audit log" description="Every user, system and configuration action. Entries can’t be edited or deleted, and stay complete under any filter." />
      <Card>
        <ListView
          label="Audit log"
          items={list}
          filters={filters}
          searchPlaceholder="Search person, action or case ID"
          searchText={(a) => `${a.who} ${a.what} ${a.target} ${a.role}`}
          rowKey={(a) => `${a.when}|${a.who}|${a.what}|${a.target}|${list.indexOf(a)}`}
          onRowActivate={(a) => {
            const href = target(a)
            if (href) router.push(href)
          }}
          emptyMessage="No entries"
          columns={[
            { header: "When", cell: (a) => <span className="mono">{a.when}</span> },
            { header: "Who", cell: (a) => <b className="font-semibold text-strong">{a.who}</b> },
            { header: "Role", cell: (a) => <small className="text-muted-foreground">{a.role}</small> },
            { header: "Action", cell: (a) => a.what },
            { header: "Target", cell: (a) => <span className="mono">{a.target}</span> },
          ]}
        />
      </Card>
    </>
  )
}
