"use client"

import { DocPaper, DocSheet, DocSignatures, DocTable, DocumentViewer, IdCard, type BadgeVariant } from "@aim-ready/ui"
import { formatPeso } from "@aim-ready/core"

import { prodName, termsOf, type Application, type StaffState } from "@/mock"

import { DisclosureRows } from "./disclosure"

/** File kind and sample file name for a document, as the prototype's docKind(). */
export function docKind(name: string): { tag: string; type: string; file: string } {
  if (/Government ID|PhilSys/i.test(name)) return { tag: "IMG", type: "id", file: "gov_id_scan.jpg" }
  if (/Payslip/i.test(name)) return { tag: "IMG", type: "payslip", file: "payslip_oct2026.jpg" }
  if (/statements/i.test(name)) return { tag: "PDF", type: "statements", file: "bank_statements_aug-oct.pdf" }
  if (/Loan agreement/i.test(name)) return { tag: "PDF", type: "agreement", file: "loan_agreement_v5.pdf" }
  if (/Promissory/i.test(name)) return { tag: "PDF", type: "note", file: "promissory_note_v2.pdf" }
  if (/Disclosure/i.test(name)) return { tag: "PDF", type: "disclosure", file: "disclosure_statement_v3.pdf" }
  if (/spreadsheet/i.test(name)) return { tag: "XLS", type: "sheet", file: "cordillera_salary_loans_nov2026.xlsx" }
  if (/consent/i.test(name)) return { tag: "PDF", type: "consent", file: "signed_consent_form.pdf" }
  if (/permit/i.test(name)) return { tag: "IMG", type: "permit", file: "business_permit_2026.jpg" }
  return { tag: "PDF", type: "generic", file: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf` }
}

const p2 = (c: number) => formatPeso(c, { decimals: 2 })
const p0 = (c: number) => formatPeso(c)

function initials(n: string) {
  return n.split(" ").map((x) => x.charAt(0)).slice(0, 2).join("")
}

function Signatures({ a, signed, bankLine }: { a: Application; signed: boolean; bankLine?: string }) {
  const t = a.hist.find((h) => /E-signed/.test(h.what))
  return (
    <DocSignatures
      borrower={a.name}
      borrowerSigned={signed}
      borrowerNote={signed && t ? `Signed electronically ${t.when} · certificate SC-${a.id.slice(4)}-7Q` : undefined}
      bankSigner={signed ? "P. Reyes" : undefined}
      bankLine={bankLine ?? "Paolo Reyes, credit administration"}
    />
  )
}

/** Sample rendering of a case document, ported from docRender(). */
function Preview({ s, a, name, status, revealed }: { s: StaffState; a: Application; name: string; status: string; revealed: boolean }) {
  const k = docKind(name)
  const signed = /Signed|Acknowledged/.test(status)
  const tm = termsOf(s, a)
  const gov = a.govId || "PSN-0000-0000-0000"
  const emp = a.employer || "—"
  const inc = a.verified || a.income || 0
  switch (k.type) {
    case "id": {
      const parts = a.name.split(" ")
      return (
        <IdCard
          heading="Republic of the Philippines · Philippine identification card"
          initials={initials(a.name)}
          fields={[
            { label: "Last name, first name", value: `${(parts.slice(-1)[0] ?? "").toUpperCase()}, ${parts.slice(0, -1).join(" ").toUpperCase()}` },
            { label: "PSN", value: revealed ? gov : `PSN-••••-••••-${gov.slice(-4)}`, mono: true },
            { label: "Date of birth", value: `${2026 - (a.age || 30)}-03-14` },
            { label: "Address", value: "Makati City, Metro Manila" },
          ]}
        />
      )
    }
    case "payslip": {
      const basic = Math.round(inc * 0.88)
      const allow = inc - basic
      const sss = Math.round(inc * 0.045)
      const ph = Math.round(inc * 0.025)
      const pg = 20000
      const tax = Math.round(inc * 0.09)
      const net = inc - sss - ph - pg - tax
      return (
        <DocPaper title={emp} sub={`Payslip · 16–31 October 2026 · employee ${a.name}`}>
          <DocTable
            rows={[
              { label: "Basic pay", value: p2(basic) }, { label: "Allowances", value: p2(allow) }, { label: "Gross pay (monthly)", value: p2(inc), total: true },
              { label: "SSS", value: `−${p2(sss)}` }, { label: "PhilHealth", value: `−${p2(ph)}` }, { label: "Pag-IBIG", value: `−${p2(pg)}` }, { label: "Withholding tax", value: `−${p2(tax)}` }, { label: "Net pay", value: p2(net), total: true },
            ]}
          />
          <p className="m-0 text-[11px] text-muted-foreground">OCR extracted gross pay {p0(inc)} with 98% confidence.</p>
        </DocPaper>
      )
    }
    case "statements": {
      const sal = a.stmt ? a.stmt.salary : inc
      const rows: Array<[string, string, string, string]> = [
        ["01 Aug", "Opening balance", "", p2(sal * 0.7)], ["15 Aug", "Credit · deposits", p2(sal * 0.52), ""], ["31 Aug", "Credit · deposits", p2(sal * 0.48), ""], ["15 Sep", "Credit · deposits", p2(sal * 0.5), ""],
        ["30 Sep", "Credit · deposits", p2(sal * 0.5), ""], ["15 Oct", "Credit · deposits", p2(sal * 0.49), ""], ["31 Oct", "Credit · deposits", p2(sal * 0.51), ""], ["31 Oct", "Closing balance", "", p2(sal * 0.9)],
      ]
      return (
        <DocPaper title="Statement of account" sub={`${a.name} · savings ••${a.id.slice(-4)} · August – October 2026`}>
          <DocTable rows={rows.map((r) => ({ label: `${r[0]}  ${r[1]}`, extra: r[2], value: r[3] }))} />
          <p className="m-0 text-[11px] text-muted-foreground">3 statements · analysed on upload: {p0(sal)} a month in credits, no returned items.</p>
        </DocPaper>
      )
    }
    case "agreement":
      return (
        <DocPaper title="Loan agreement" sub={`Template v5 · ${a.id}`} stamp={signed ? "Signed" : undefined}>
          <p>
            This agreement is between <b>Kalinaw Bank</b> (the Lender) and <b>{a.name}</b> (the Borrower).
          </p>
          <p>
            <b>1. Loan.</b> The Lender agrees to lend {p0(tm.principal)} ({prodName(a.product).toLowerCase()}), released to the Borrower’s own Kalinaw account net of a {p0(tm.fee)} processing fee.
          </p>
          <p>
            <b>2. Repayment.</b> {tm.months} equal monthly payments of {p2(tm.monthlyPayment)}, starting one month after release. Effective interest rate {tm.effectiveRatePct.toFixed(2)}% a year.
          </p>
          <p>
            <b>3. Late payment.</b> 3% of the amount due for each month it remains unpaid.
          </p>
          <p>
            <b>4. Prepayment.</b> The Borrower may repay early at any time; the payoff amount is calculated by the Lender’s core banking system.
          </p>
          <Signatures a={a} signed={signed} />
        </DocPaper>
      )
    case "note":
      return (
        <DocPaper title="Promissory note" sub={`Template v2 · ${a.id}`} stamp={signed ? "Signed" : undefined}>
          <p>
            For value received, I, <b>{a.name}</b>, promise to pay <b>Kalinaw Bank</b> the sum of <b>{p0(tm.principal)}</b> in {tm.months} monthly instalments of {p2(tm.monthlyPayment)}, under the loan agreement of the same reference.
          </p>
          <p>If any instalment is not paid when due, the whole unpaid balance may become due at once, at the Lender’s option.</p>
          <Signatures a={a} signed={signed} />
        </DocPaper>
      )
    case "disclosure":
      return (
        <DocPaper title="Disclosure statement" sub={`Truth in Lending Act · template v3 · ${a.id}`} stamp={signed ? "Acknowledged" : undefined}>
          <DisclosureRows terms={tm} />
          <p className="mt-3 mb-0 text-[11px] text-muted-foreground">Figures calculated by Kalinaw core banking.{signed ? " Acknowledged by the borrower before signing." : ""}</p>
        </DocPaper>
      )
    case "sheet":
      return (
        <DocSheet
          header={["", "A · Name", "B · Product", "C · Amount", "D · Tenor", "E · Monthly income", "F · Gov ID"]}
          rows={[
            { cells: ["1", "Cordillera Foods HR · salary loan requests · Nov 2026"], caption: true },
            { cells: ["2", a.name, "Salary loan", String(a.amount / 100), String(a.tenor), a.income ? String(a.income / 100) : "", gov], highlight: true },
          ]}
        />
      )
    case "consent":
      return (
        <DocPaper title="Consent form" sub={`Terms v3.2 · ${a.id}`}>
          <p>
            I, <b>{a.name}</b>, give my consent to:
          </p>
          <p>
            ☑ a credit check with a credit bureau
            <br />☑ the processing of my personal data under the Data Privacy Act
            <br />☑ the loan terms and conditions, version 3.2
          </p>
          <Signatures a={a} signed bankLine="branch officer" />
        </DocPaper>
      )
    case "permit":
      return (
        <DocPaper title="Business permit" sub="City of Makati · 2026">
          <p>
            This certifies that <b>{emp}</b>, owned by <b>{a.name}</b>, is permitted to operate within the city for calendar year 2026.
          </p>
          <p className="text-muted-foreground">Permit no. BP-2026-{a.id.slice(4)}07 · valid until 31 December 2026</p>
        </DocPaper>
      )
    default:
      return (
        <DocPaper title={name} sub={a.id}>
          <p>
            {name} for {a.name}.
          </p>
        </DocPaper>
      )
  }
}

/** The case document viewer (prototype openDoc). */
export function CaseDocumentViewer({ s, a, doc, revealed, onClose }: { s: StaffState; a: Application; doc: { name: string; status: string } | null; revealed: boolean; onClose: () => void }) {
  if (!doc) return null
  const k = docKind(doc.name)
  const signedish = /Signed|Acknowledged/.test(doc.status)
  const by = /Signed|Acknowledged|Sent/.test(doc.status) ? "Paolo Reyes" : a.channel === "Branch" ? "Branch officer" : a.name
  const tone: BadgeVariant = /Verified|Signed|Acknowledged/.test(doc.status) ? "ok" : /mismatch/.test(doc.status) ? "warn" : "info"
  return (
    <DocumentViewer
      open
      onOpenChange={(o) => !o && onClose()}
      title={doc.name}
      meta={{ file: k.file, version: signedish ? 2 : 1, addedBy: by, retainUntil: /agreement|note|Disclosure/i.test(doc.name) ? "Closure + 10 years" : "Closure + 5 years", status: doc.status, statusTone: tone }}
      footnote={`Sample document generated for the prototype.${k.type === "id" && !revealed ? " ID number stays masked until revealed on the case." : ""}`}
    >
      <Preview s={s} a={a} name={doc.name} status={doc.status} revealed={revealed} />
    </DocumentViewer>
  )
}
