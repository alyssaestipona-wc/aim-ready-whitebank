"use client"

import { Button, Card, ListView, PageHeader, StatusPill, type ListFilterDef } from "@aim-ready/ui"

import { CfgButton, useRun } from "@/components/admin/bits"
import { useConsole } from "@/components/use-console"
import { fixCic, generateCic, isReadOnly, submitCic, type CicRow } from "@/mock"

type Row = { r: CicRow; fresh: boolean }

const FILTERS: ListFilterDef<Row>[] = [
  { key: "type", label: "File type", options: [["CIC", "Credit bureau (CIC)"], ["BSP", "BSP report"]], test: (x, v) => x.r[0].startsWith(v) },
  { key: "st", label: "Status", options: [["Submitted", "Submitted"], ["Ready", "Ready to submit"]], test: (x, v) => x.r[4].startsWith(v) },
]

export default function RegulatoryPage() {
  const ctx = useConsole()
  const run = useRun()
  if (!ctx) return null
  const { role, s } = ctx
  const rows: Row[] = [...s.cic.map((r) => ({ r, fresh: true })), ...s.cicHist.map((r) => ({ r, fresh: false }))]
  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Regulatory extracts"
        description="Credit bureau submission files and regulatory data, validated before anything is sent. A file with errors can’t be marked submitted."
        actions={
          <CfgButton variant="primary" readOnly={isReadOnly(role)} onClick={() => run(generateCic())}>
            Generate CIC file for Nov 2026
          </CfgButton>
        }
      />
      <Card>
        <div className="border-b border-border-soft px-[18px] py-[13px]">
          <h3 className="text-base font-semibold">Submissions</h3>
        </div>
        <ListView
          label="Submissions"
          items={rows}
          filters={FILTERS}
          searchPlaceholder="Search file name or period"
          searchText={(x) => `${x.r[0]} ${x.r[1]}`}
          rowKey={(x) => `${x.fresh ? "new" : "old"}-${x.r[0]}`}
          emptyMessage="No files yet"
          columns={[
            { header: "File", cell: (x) => <span className="mono">{x.r[0]}</span> },
            { header: "Period", cell: (x) => x.r[1] },
            { header: "Records", headClassName: "text-right", className: "text-right", cell: (x) => <span className="num">{x.r[2]}</span> },
            { header: "Validation", cell: (x) => (x.r[3] ? <StatusPill tone="bad">{x.r[3]} errors</StatusPill> : <StatusPill tone="ok">{x.fresh ? "0 errors, 3 warnings" : "0 errors"}</StatusPill>) },
            { header: "Status", cell: (x) => x.r[4] },
            {
              header: "",
              cell: (x) =>
                x.fresh && x.r[4] === "Ready" ? (
                  x.r[3] ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" disabled={isReadOnly(role)} title={isReadOnly(role) ? "Read-only access" : undefined} onClick={() => run(fixCic())}>
                        Fix and regenerate
                      </Button>
                      <Button size="sm" disabled title="Resolve the validation errors first">
                        Mark submitted
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="primary" disabled={isReadOnly(role)} title={isReadOnly(role) ? "Read-only access" : undefined} onClick={() => run(submitCic())}>
                      Mark submitted
                    </Button>
                  )
                ) : null,
            },
          ]}
        />
      </Card>
    </>
  )
}
