"use client"

import * as React from "react"
import { formatPeso } from "@aim-ready/core"
import { DocPaper, DocSignatures, DocTable, DocumentViewer, type DocumentMeta } from "@aim-ready/ui"

import { productName, termsOf, type Application } from "@/mock"

function fileOf(name: string): string {
  if (/Loan agreement/i.test(name)) return "loan_agreement_v5.pdf"
  if (/Promissory/i.test(name)) return "promissory_note_v2.pdf"
  if (/Disclosure/i.test(name)) return "disclosure_statement_v3.pdf"
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf`
}

/** Metadata row for a document, as the prototype's `openDoc()`. */
export function documentMeta(name: string, status: string): DocumentMeta {
  const signed = /Signed|Acknowledged/.test(status)
  return {
    file: fileOf(name),
    version: signed ? 2 : 1,
    addedBy: /Signed|Acknowledged|Sent/.test(status) ? "Paolo Reyes" : "Kalinaw Bank",
    retainUntil: /agreement|note|Disclosure/i.test(name) ? "Closure + 10 years" : "Closure + 5 years",
    status,
    statusTone: /Verified|Signed|Acknowledged/.test(status) ? "ok" : "info",
  }
}

/** Rendered preview of a closing document, ported from `docRender()`. */
export function DocumentPreview({ app: a, name, status }: { app: Application; name: string; status: string }) {
  const signed = /Signed|Acknowledged/.test(status)
  const tm = termsOf(a)
  const signedAt = a.hist.find((h) => /E-signed/.test(h.what))
  const sigs = (
    <DocSignatures
      borrower={a.name}
      borrowerSigned={signed}
      borrowerNote={signed && signedAt ? `Signed electronically ${signedAt.when} · certificate SC-${a.id.slice(4)}-7Q` : undefined}
      bankSigner={signed ? "P. Reyes" : undefined}
      bankLine="Paolo Reyes, credit administration"
    />
  )
  if (/Loan agreement/i.test(name))
    return (
      <DocPaper title="Loan agreement" sub={`Template v5 · ${a.id}`} stamp={signed ? "Signed" : undefined}>
        <p>
          This agreement is between <b>Kalinaw Bank</b> (the Lender) and <b>{a.name}</b> (the Borrower).
        </p>
        <p>
          <b>1. Loan.</b> The Lender agrees to lend {formatPeso(tm.principal)} ({productName(a.product).toLowerCase()}), released to the Borrower’s own Kalinaw account net of a {formatPeso(tm.fee)} processing fee.
        </p>
        <p>
          <b>2. Repayment.</b> {tm.months} equal monthly payments of {formatPeso(tm.monthlyPayment, { decimals: 2 })}, starting one month after release. Effective interest rate {tm.effectiveRatePct.toFixed(2)}% a year.
        </p>
        <p>
          <b>3. Late payment.</b> 3% of the amount due for each month it remains unpaid.
        </p>
        <p>
          <b>4. Prepayment.</b> The Borrower may repay early at any time; the payoff amount is calculated by the Lender’s core banking system.
        </p>
        {sigs}
      </DocPaper>
    )
  if (/Promissory/i.test(name))
    return (
      <DocPaper title="Promissory note" sub={`Template v2 · ${a.id}`} stamp={signed ? "Signed" : undefined}>
        <p>
          For value received, I, <b>{a.name}</b>, promise to pay <b>Kalinaw Bank</b> the sum of <b>{formatPeso(tm.principal)}</b> in {tm.months} monthly instalments of{" "}
          {formatPeso(tm.monthlyPayment, { decimals: 2 })}, under the loan agreement of the same reference.
        </p>
        <p>If any instalment is not paid when due, the whole unpaid balance may become due at once, at the Lender’s option.</p>
        {sigs}
      </DocPaper>
    )
  if (/Disclosure/i.test(name))
    return (
      <DocPaper title="Disclosure statement" sub={`Truth in Lending Act · template v3 · ${a.id}`} stamp={signed ? "Acknowledged" : undefined}>
        <DocTable
          rows={[
            { label: "Amount financed", value: formatPeso(tm.principal) },
            { label: "Processing fee", value: formatPeso(tm.fee) },
            { label: "Net proceeds", value: formatPeso(tm.netProceeds) },
            { label: "Term", value: `${tm.months} months` },
            { label: "Monthly amortisation", value: formatPeso(tm.monthlyPayment, { decimals: 2 }) },
            { label: "Total of payments", value: formatPeso(tm.totalOfPayments, { decimals: 2 }) },
            { label: "Finance charge", value: formatPeso(tm.financeCharge, { decimals: 2 }) },
            { label: "Effective interest rate", value: `${tm.effectiveRatePct.toFixed(2)}% per year`, total: true },
            { label: "Late payment penalty", value: "3% of amount due per month" },
          ]}
        />
        <p className="mt-3 mb-0 text-[11px] text-muted-foreground">Figures calculated by Kalinaw core banking.{signed ? " Acknowledged by the borrower before signing." : ""}</p>
      </DocPaper>
    )
  return (
    <DocPaper title={name} sub={a.id}>
      <p>
        {name} for {a.name}.
      </p>
    </DocPaper>
  )
}

/** Opens one document in the kit's document viewer. */
export function DocumentDialog({ app, name, onClose }: { app: Application; name: string | null; onClose: () => void }) {
  if (!name) return null
  const status = app.docs.find((d) => d[0] === name)?.[1] ?? "Sent for signature"
  return (
    <DocumentViewer
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={name}
      meta={documentMeta(name, status)}
      footnote="Sample document generated for the prototype."
    >
      <DocumentPreview app={app} name={name} status={status} />
    </DocumentViewer>
  )
}
