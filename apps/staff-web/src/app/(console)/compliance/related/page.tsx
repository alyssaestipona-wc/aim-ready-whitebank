"use client"

import { Card, ListView, PageHeader, type ListFilterDef } from "@aim-ready/ui"

import { useConsole } from "@/components/use-console"

export default function RelatedPartyPage() {
  const ctx = useConsole()
  if (!ctx) return null
  const rows = ctx.s.related
  const filters: ListFilterDef<string[]>[] = [
    { key: "auth", label: "Approving authority", options: [...new Set(rows.map((r) => r[3] ?? ""))].sort().map((v) => [v, v] as const), test: (r, v) => r[3] === v },
  ]
  return (
    <>
      <PageHeader eyebrow="Compliance" title="Related-party lending" description="Loans to directors, officers and their relatives. Always referred, and approved under special authority from the matrix." />
      <Card>
        <ListView
          label="Related-party lending"
          items={rows}
          filters={filters}
          searchPlaceholder="Search borrower, relationship or loan"
          searchText={(r) => r.join(" ")}
          rowKey={(r) => r.join("|")}
          emptyMessage="No related-party loans"
          columns={["Borrower", "Relationship", "Loan", "Approving authority", "Board notified"].map((h, i) => ({ header: h, cell: (r: string[]) => r[i] }))}
        />
      </Card>
    </>
  )
}
