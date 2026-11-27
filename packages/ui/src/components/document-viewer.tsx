"use client"

import * as React from "react"
import { cn } from "cn"

import { StatusPill } from "./status-pill"
import type { BadgeVariant } from "./ui/badge"
import { ConfirmDialog } from "./confirm-dialog"

export type DocumentMeta = {
  file: string
  version: number
  addedBy: string
  retainUntil: string
  status: string
  statusTone: BadgeVariant
}

/**
 * Wide dialog previewing one document: file name, version, who added it,
 * retention and status, then the rendered preview on a gray stage.
 */
function DocumentViewer({
  open,
  onOpenChange,
  title,
  meta,
  footnote,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  meta: DocumentMeta
  footnote?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <ConfirmDialog open={open} onOpenChange={onOpenChange} title={title} okLabel="Close" noCancel wide onConfirm={() => undefined}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="mono">{meta.file}</span>
        <span>
          Version <b className="font-semibold text-strong">v{meta.version}</b>
        </span>
        <span>
          Added by <b className="font-semibold text-strong">{meta.addedBy}</b>
        </span>
        <span>
          Retain until <b className="font-semibold text-strong">{meta.retainUntil}</b>
        </span>
        <StatusPill tone={meta.statusTone}>{meta.status}</StatusPill>
      </div>
      <div data-slot="document-stage" className="flex max-h-[62vh] justify-center overflow-auto rounded-xl bg-g-100 p-5">
        {children}
      </div>
      {footnote && <p className="mt-2.5 mb-0 text-xs text-muted-foreground">{footnote}</p>}
    </ConfirmDialog>
  )
}

/** A white A4-like page for agreements, statements, payslips and forms. */
function DocPaper({
  title,
  sub,
  stamp,
  children,
}: {
  title: string
  sub: React.ReactNode
  /** "Signed" / "Acknowledged" stamp beside the subtitle. */
  stamp?: string
  children: React.ReactNode
}) {
  return (
    <div data-doc-kind="paper" className="w-full max-w-[560px] rounded-[4px] border border-border bg-paper px-[34px] py-[30px] text-[12.5px] leading-relaxed text-text shadow-[0_6px_20px_-10px_rgb(11_11_12/0.2)] [&_p]:mt-0 [&_p]:mb-2.5">
      <h4 className="mb-1 text-center text-base tracking-[0.06em] uppercase">{title}</h4>
      <p className="mb-[18px]! text-center text-xs text-muted-foreground">
        {sub}
        {stamp && (
          <>
            {" · "}
            <span className="inline-block -rotate-[4deg] rounded-xs border-[1.5px] border-brand px-2 py-0.5 text-2xs font-semibold tracking-[0.06em] text-brand-700 uppercase">
              {stamp}
            </span>
          </>
        )}
      </p>
      {children}
    </div>
  )
}

export type DocRow = { label: React.ReactNode; value?: React.ReactNode; extra?: React.ReactNode; total?: boolean }

/** Label/value rows inside a DocPaper; `total` rows are bold with a rule above. */
function DocTable({ rows }: { rows: readonly DocRow[] }) {
  return (
    <table className="my-1.5 mb-3 w-full border-collapse text-xs">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={cn(r.total && "font-semibold text-strong")}>
            <td className={cn("border-b border-border-soft py-[5px]", r.total && "border-t border-b-0 border-t-border")}>{r.label}</td>
            {r.extra !== undefined && <td className={cn("border-b border-border-soft py-[5px] text-right tabular-nums", r.total && "border-t border-b-0 border-t-border")}>{r.extra}</td>}
            <td className={cn("border-b border-border-soft py-[5px] text-right tabular-nums", r.total && "border-t border-b-0 border-t-border")}>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Borrower and bank signature lines; a name renders in a script face when signed. */
function DocSignatures({
  borrower,
  borrowerSigned,
  borrowerNote,
  bankSigner,
  bankLine,
}: {
  borrower: string
  borrowerSigned: boolean
  borrowerNote?: string
  bankSigner?: string
  bankLine: string
}) {
  return (
    <div className="mt-[22px] grid grid-cols-2 gap-6">
      <div>
        <div className="flex h-[38px] items-end font-script text-2xl text-ink">{borrowerSigned ? borrower : ""}</div>
        <div className="border-t border-ink-4 pt-1 text-[11px] text-muted-foreground">
          Borrower: {borrower}
          {borrowerNote && (
            <>
              <br />
              {borrowerNote}
            </>
          )}
        </div>
      </div>
      <div>
        <div className="flex h-[38px] items-end font-script text-2xl text-ink">{bankSigner ?? ""}</div>
        <div className="border-t border-ink-4 pt-1 text-[11px] text-muted-foreground">For WhiteBank: {bankLine}</div>
      </div>
    </div>
  )
}

/** A Philippine ID card preview. */
function IdCard({ initials, fields, heading }: { initials: string; heading: string; fields: ReadonlyArray<{ label: string; value: React.ReactNode; mono?: boolean }> }) {
  return (
    <div
      data-doc-kind="id"
      className="grid aspect-[1.586] w-[360px] max-w-full grid-cols-[92px_1fr] gap-x-4 gap-y-1.5 rounded-2xl border border-border-strong bg-linear-160 from-paper to-g-100 px-[18px] py-4 text-[11px] shadow-[0_10px_24px_-12px_rgb(11_11_12/0.3)]"
    >
      <div className="col-span-full mb-1 border-b border-border pb-1.5 text-[9.5px] font-semibold tracking-[0.08em] text-ink-4 uppercase">{heading}</div>
      <div className="flex h-[110px] w-[92px] items-center justify-center rounded-md bg-g-200 text-[26px] font-semibold text-g-500">{initials}</div>
      <dl className="m-0 grid gap-1">
        {fields.map((f) => (
          <div key={f.label}>
            <dt className="text-[8.5px] tracking-[0.06em] text-muted-foreground uppercase">{f.label}</dt>
            <dd className={cn("m-0 text-xs font-semibold text-strong", f.mono && "mono")}>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** A spreadsheet preview; `highlight` rows are tinted in the accent. */
function DocSheet({ header, rows }: { header: readonly string[]; rows: ReadonlyArray<{ cells: readonly React.ReactNode[]; highlight?: boolean; caption?: boolean }> }) {
  return (
    <div data-doc-kind="sheet" className="w-full max-w-[620px] overflow-x-auto rounded-[4px] border border-border bg-paper font-mono text-[11.5px] font-medium">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} className="border border-border-soft bg-g-50 px-2 py-[5px] text-left font-semibold whitespace-nowrap text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn(r.highlight && "[&>td]:bg-brand-50", r.caption && "text-muted-foreground")}>
              {r.cells.map((c, j) => (
                <td key={j} colSpan={r.caption && j === 1 ? header.length - 1 : undefined} className="border border-border-soft px-2 py-[5px] text-left whitespace-nowrap">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { DocPaper, DocSheet, DocSignatures, DocTable, DocumentViewer, IdCard }
