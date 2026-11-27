"use client"

import { Button, Card, CardHeader, CardTitle, Checkbox, ConfirmDialog, Input, Label, ListView, MoneyInput, PageHeader, StatusPill, useToast } from "@aim-ready/ui"
import { fromCentavos, toCentavos } from "@aim-ready/core"
import Link from "next/link"
import * as React from "react"

import { Note } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { isReadOnly, peso, prodName, submitIntakeDraft, uploadEmailBundle, uploadPartnerSpreadsheet, type ActionResult, type IntakeDraft } from "@/mock"

export default function IntakePage() {
  const ctx = useConsole()
  const toast = useToast()
  const [reviewing, setReviewing] = React.useState<number | null>(null)
  if (!ctx) return null
  const { role, s } = ctx
  const ro = isReadOnly(role)
  const D = s.drafts
  const report = (r: ActionResult) => {
    if (!r.ok) return r.error
    if (r.toast) toast(r.toast, r.tone)
  }
  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Email and file intake"
        description="Upload an emailed document bundle or a partner’s spreadsheet. OCR extracts each application into a draft for staff to check and submit."
        actions={
          <>
            <Button variant="primary" disabled={ro} title={ro ? "Read-only access" : undefined} onClick={async () => report(await uploadPartnerSpreadsheet())}>
              Upload partner spreadsheet
            </Button>
            <Button disabled={ro} title={ro ? "Read-only access" : undefined} onClick={async () => report(await uploadEmailBundle())}>
              Upload email bundle
            </Button>
          </>
        }
      />
      {s.intakeFile && (
        <Note tone="info">
          <b>{s.intakeFile}</b> · {D.length} rows extracted · {D.filter((d) => d.flag && d.status === "Draft").length} need attention
        </Note>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Drafts</CardTitle>
        </CardHeader>
        <ListView
          label="Intake drafts"
          items={D}
          filters={[
            { key: "st", label: "Status", options: [["Draft", "Draft"], ["Submitted", "Submitted"]], test: (d, v) => d.status === v },
            { key: "fl", label: "Extraction", options: [["flag", "Needs attention"], ["ok", "Complete"]], test: (d, v) => (v === "flag" ? !!d.flag : !d.flag) },
          ]}
          searchPlaceholder="Search applicant or source"
          searchText={(d) => `${d.name} ${d.source} ${d.app || ""}`}
          rowKey={(d) => `${d.name}-${d.source}`}
          emptyMessage="No drafts yet. Upload a spreadsheet or an email bundle to start."
          columns={[
            { header: "Applicant", cell: (d) => <b className="font-semibold text-strong">{d.name}</b> },
            { header: "Product", cell: (d) => prodName(d.product) },
            { header: "Amount", cell: (d) => `${peso(d.amount)} / ${d.tenor} mo` },
            { header: "Source", cell: (d) => <small>{d.source}</small> },
            { header: "Extraction", cell: (d) => (d.flag ? <StatusPill tone="warn">{d.flag}</StatusPill> : <StatusPill tone="ok">Complete</StatusPill>) },
            {
              header: "Status",
              cell: (d) =>
                d.status === "Draft" ? (
                  <StatusPill>Draft</StatusPill>
                ) : (
                  <Link href={`/applications/${d.app}`} className="mono">
                    {d.app}
                  </Link>
                ),
            },
            {
              header: "",
              cell: (d) =>
                d.status === "Draft" ? (
                  <Button size="sm" variant="primary" disabled={ro} title={ro ? "Read-only access" : undefined} onClick={() => setReviewing(D.indexOf(d))}>
                    Review and submit
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>
      {reviewing !== null && D[reviewing] && <ReviewDialog d={D[reviewing]} onClose={() => setReviewing(null)} onSubmit={async (v) => report(await submitIntakeDraft(reviewing, v))} />}
    </>
  )
}

function ReviewDialog({ d, onClose, onSubmit }: { d: IntakeDraft; onClose: () => void; onSubmit: (v: { amount: number | null; tenor: number; govId: string; consent: boolean }) => Promise<string | void> }) {
  const [amount, setAmount] = React.useState<number | null>(fromCentavos(d.amount))
  const [tenor, setTenor] = React.useState(String(d.tenor))
  const [govId, setGovId] = React.useState(d.flag ? "" : "PSN-1234-5678-9012")
  const [consent, setConsent] = React.useState(false)
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Review draft · ${d.name}`}
      description={`Extracted from ${d.source}. Check the values, complete anything missing, then submit into the standard pipeline.`}
      okLabel="Submit application"
      onConfirm={() => onSubmit({ amount: amount == null ? null : toCentavos(amount), tenor: Number(tenor), govId, consent })}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3">
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="dr-amt">Amount</Label>
          <MoneyInput id="dr-amt" value={amount} onValueChange={setAmount} />
        </div>
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="dr-ten">Tenor (months)</Label>
          <Input id="dr-ten" type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} />
        </div>
      </div>
      <div className="mb-3 grid gap-[5px]">
        <Label htmlFor="dr-id">Government ID number</Label>
        <Input id="dr-id" value={govId} placeholder="Required" onChange={(e) => setGovId(e.target.value)} />
      </div>
      <div className="flex items-start gap-2.5 py-1.5 text-sm">
        <Checkbox id="dr-con" checked={consent} onCheckedChange={(c) => setConsent(c === true)} />
        <Label htmlFor="dr-con" className="font-normal">
          Signed consent form received from the partner
        </Label>
      </div>
    </ConfirmDialog>
  )
}
