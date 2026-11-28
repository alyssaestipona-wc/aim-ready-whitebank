"use client"

import { CfgButton, CheckRow, ConfirmDialog, Input, Label, PageHeader, StaticTable, VersionBadge, useRun } from "@aim-ready/ui"
import * as React from "react"

import { Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { OVERRIDE_THRESHOLD, peso, updateMatrixLevel, type AuthorityLevel } from "@/mock"

/** Each level is directly editable (no draft/submit/review — PC-4 never asks for maker-checker here). */
export default function MatrixPage() {
  const ctx = useConsole()
  const run = useRun()
  const [editing, setEditing] = React.useState<AuthorityLevel | null>(null)
  const [fields, setFields] = React.useState({ amount: "", grades: "", exceptions: "" })
  if (!ctx) return null
  const { s } = ctx

  function openEdit(row: AuthorityLevel) {
    setEditing(row)
    setFields({ amount: row.amount, grades: row.grades, exceptions: row.exceptions })
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Approval matrix"
        description="Delegated authority by amount, product, grade and exception type, independent of the staff console's own version of this matrix."
        actions={<VersionBadge status="Published" version={s.cfg.matrixVersion} />}
      />
      <Section flush>
        <StaticTable
          head={["Level", "Who", "Amount", "Products", "Grades", "Exceptions", ""]}
          rows={s.cfg.matrix.map((row) => [
            <b key="l" className="font-semibold text-strong">{row.level}</b>,
            row.who,
            row.amount,
            row.products,
            row.grades,
            row.exceptions,
            <CfgButton key="e" size="sm" onClick={() => openEdit(row)}>Edit</CfgButton>,
          ])}
        />
      </Section>
      <Section title="Override threshold" className="mt-3.5">
        <CheckRow label={`Recommendation changes the decision, or differs from the AI amount by ${peso(OVERRIDE_THRESHOLD)} or more`} value="Second sign-off required" />
        <CheckRow label="Smaller differences" value="Reason code recorded" />
      </Section>
      <ConfirmDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit authority level ${editing?.level ?? ""}`}
        description="Takes effect for cases not yet routed; a case already sitting with an approver keeps the limit that applied when it was routed to them."
        okLabel="Save and publish"
        onConfirm={async () => {
          if (!editing) return
          const r = await run(updateMatrixLevel(editing.level, fields))
          if (!r.ok) return r.error
        }}
      >
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="mx-amt">Amount limit</Label>
          <Input id="mx-amt" value={fields.amount} onChange={(e) => setFields({ ...fields, amount: e.target.value })} />
        </div>
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="mx-grd">Grades</Label>
          <Input id="mx-grd" value={fields.grades} onChange={(e) => setFields({ ...fields, grades: e.target.value })} />
        </div>
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="mx-exc">Exceptions</Label>
          <Input id="mx-exc" value={fields.exceptions} onChange={(e) => setFields({ ...fields, exceptions: e.target.value })} />
        </div>
      </ConfirmDialog>
    </>
  )
}
