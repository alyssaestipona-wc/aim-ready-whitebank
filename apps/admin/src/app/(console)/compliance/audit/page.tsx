"use client"

import { Card, ListView, PageHeader, type ListFilterDef } from "@aim-ready/ui"

import { useConsole } from "@/components/use-console"
import type { AuditEntry } from "@/mock"

const distinct = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort().map((v) => [v, v] as const)

const KIND: Record<string, (w: string) => boolean> = {
  approval: (w) => /Approved|published/i.test(w),
  config: (w) => /rule set|draft|automation|kill switch|module|drill|calendar|template|matrix/i.test(w),
  access: (w) => /Signed in|Signed out|Refused/.test(w),
}

export default function AuditLogPage() {
  const ctx = useConsole()
  if (!ctx) return null
  const { s } = ctx
  const list = s.audit
  const day = (a: AuditEntry) => (a.when || "").split(",")[0] ?? ""
  const filters: ListFilterDef<AuditEntry>[] = [
    { key: "role", label: "Role", options: distinct(list.map((a) => a.role)), test: (a, v) => a.role === v },
    { key: "kind", label: "Action type", options: [["approval", "Approvals"], ["config", "Configuration"], ["access", "Sign-in and access"]], test: (a, v) => !!KIND[v]?.(a.what) },
    { key: "day", label: "Date", options: distinct(list.map(day)), test: (a, v) => day(a) === v },
  ]
  return (
    <>
      <PageHeader eyebrow="Compliance" title="Audit log" description="Every configuration and access action in this app. Entries can’t be edited or deleted, and stay complete under any filter." />
      <Card>
        <ListView
          label="Audit log"
          items={list}
          filters={filters}
          searchPlaceholder="Search person, action or role"
          searchText={(a) => `${a.who} ${a.what} ${a.role}`}
          rowKey={(a) => `${a.when}|${a.who}|${a.what}|${list.indexOf(a)}`}
          emptyMessage="No entries"
          columns={[
            { header: "When", cell: (a) => <span className="mono">{a.when}</span> },
            { header: "Who", cell: (a) => <b className="font-semibold text-strong">{a.who}</b> },
            { header: "Role", cell: (a) => <small className="text-muted-foreground">{a.role}</small> },
            { header: "Action", cell: (a) => a.what },
          ]}
        />
      </Card>
    </>
  )
}
