"use client"

import { Button, Checkbox, ConfirmDialog, EmptyState, Input, Label, MoneyInput, NativeSelect, NativeSelectOption, PageHeader, StatusPill, cn, useToast } from "@aim-ready/ui"
import { fromCentavos, monthlyPayment, toCentavos } from "@aim-ready/core"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { CoreLabel, MessageChip, Note, Section, Split } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import {
  CUSTOMERS,
  blankAssisted,
  findApp,
  payslipMismatch,
  peso,
  products,
  saveAssistedDraft,
  submitAssisted,
  validateAssisted,
  type AssistedDraft,
  type AssistedErrors,
  type ProductCode,
} from "@/mock"

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 grid gap-[5px]">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {error && (
        <span id={`${id}-err`} className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  )
}

const money = (c: number | null) => (c == null ? null : fromCentavos(c))
const cents = (p: number | null) => (p == null ? null : toCentavos(p))

export function AssistedApplication() {
  const ctx = useConsole()
  const params = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const draftId = params.get("draft")
  const [n, setN] = React.useState<AssistedDraft | null>(null)
  const [errors, setErrors] = React.useState<AssistedErrors>({})
  const [running, setRunning] = React.useState(false)
  const [upload, setUpload] = React.useState(false)
  const [uploadPick, setUploadPick] = React.useState("ok")

  // Load the draft (or a blank form) once the simulated state is available.
  const s = ctx?.s
  if (s && !n) {
    const d = draftId ? findApp(s, draftId)?.naDraft : undefined
    setN(d ? structuredClone(d) : blankAssisted())
  }
  if (!ctx || !n) return null

  const P = products(ctx.s)[n.product]
  const cust = CUSTOMERS.find((c) => c.cif === n.cif)
  const est = monthlyPayment(Math.max(1, n.amount ?? 0), Math.max(1, n.tenor || 1), 1.5)
  const mis = payslipMismatch(n)
  const set = (patch: Partial<AssistedDraft>) => setN({ ...n, ...patch })
  const invalid = (k: keyof AssistedErrors) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `na-${k}-err` } : {})

  async function submit() {
    if (!n) return
    const e = validateAssisted(n)
    setErrors(e)
    if (Object.keys(e).length) {
      toast("Fix the highlighted fields", "bad")
      return
    }
    setRunning(true)
    await new Promise((r) => setTimeout(r, 1100))
    const res = await submitAssisted(n, draftId)
    setRunning(false)
    if (!res.ok) return toast(res.error, "bad")
    if (res.toast) toast(res.toast, res.tone)
    if (res.go) router.push(res.go)
  }

  async function saveDraft() {
    if (!n) return
    const res = await saveAssistedDraft(n, draftId)
    if (!res.ok) return setErrors({ name: res.error })
    if (res.toast) toast(res.toast)
    if (res.go) router.push(res.go)
  }

  if (running) {
    return (
      <>
        <PageHeader eyebrow="Applications" title="Running checks" />
        <Section>
          <EmptyState title={`Checking ${n.name}…`} hint="eKYC refresh, AML screening, fraud signals, bureau pull, OCR income check, policy rules and the AI score." />
        </Section>
      </>
    )
  }

  return (
    <>
      <div className="mb-2.5 text-[12.5px] text-muted-foreground">
        <Link href="/applications" className="text-muted-foreground no-underline hover:text-strong">
          Applications
        </Link>{" "}
        / New assisted application
      </div>
      <PageHeader eyebrow="Applications" title="New assisted application" description="For walk-in customers. Same form rules, consents and decision pipeline as Kalinaw Bank online." />
      <Split
        main={
          <>
            <Section title="1 · Customer">
              <Field id="na-cif" label="Existing customer" hint="Choosing a customer pre-fills their details from core banking.">
                <NativeSelect
                  id="na-cif"
                  value={n.cif}
                  onChange={(e) => {
                    const c = CUSTOMERS.find((x) => x.cif === e.target.value)
                    set(
                      c
                        ? { cif: c.cif, name: c.name, age: String(c.age), employer: c.employer, income: c.income, obligations: c.obligations, scans: {}, useVerified: null }
                        : { cif: "", name: "", age: "", employer: "", income: null, obligations: null, scans: {}, useVerified: null }
                    )
                  }}
                >
                  <NativeSelectOption value="">New to bank</NativeSelectOption>
                  {CUSTOMERS.map((c) => (
                    <NativeSelectOption key={c.cif} value={c.cif}>
                      {c.name} · {c.cif}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3">
                <Field id="na-name" label="Full name" error={errors.name}>
                  <Input id="na-name" value={n.name} onChange={(e) => set({ name: e.target.value })} {...invalid("name")} />
                </Field>
                <Field id="na-age" label="Age" error={errors.age}>
                  <Input id="na-age" type="number" value={n.age} onChange={(e) => set({ age: e.target.value })} {...invalid("age")} />
                </Field>
              </div>
              <Field id="na-employer" label="Employer">
                <Input id="na-employer" value={n.employer} onChange={(e) => set({ employer: e.target.value })} />
              </Field>
              {cust && (
                <p className="m-0">
                  <CoreLabel />{" "}
                  <span className="text-[12.5px] text-muted-foreground">
                    Customer since {cust.since} · deposits {peso(cust.balance)} · {cust.inflow}
                  </span>
                </p>
              )}
            </Section>
            <Section title="2 · Loan request">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3">
                <Field id="na-product" label="Product">
                  <NativeSelect id="na-product" value={n.product} onChange={(e) => set({ product: e.target.value as ProductCode })}>
                    {Object.values(products(ctx.s)).map((p) => (
                      <NativeSelectOption key={p.code} value={p.code}>
                        {p.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field id="na-purpose" label="Purpose">
                  <Input id="na-purpose" value={n.purpose} onChange={(e) => set({ purpose: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3">
                <Field id="na-amount" label="Amount" error={errors.amount} hint={`${peso(P.min)} to ${peso(P.max)}`}>
                  <MoneyInput id="na-amount" value={money(n.amount)} onValueChange={(v) => set({ amount: cents(v) })} {...invalid("amount")} />
                </Field>
                <Field id="na-tenor" label="Tenor (months)" error={errors.tenor} hint={`${P.tmin} to ${P.tmax} months`}>
                  <Input id="na-tenor" type="number" value={String(n.tenor)} onChange={(e) => set({ tenor: Number(e.target.value) })} {...invalid("tenor")} />
                </Field>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3">
                <Field id="na-income" label="Declared monthly income" error={errors.income}>
                  <MoneyInput id="na-income" value={money(n.income)} onValueChange={(v) => set({ income: cents(v) })} {...invalid("income")} />
                </Field>
                <Field id="na-obligations" label="Monthly obligations">
                  <MoneyInput id="na-obligations" value={money(n.obligations)} onValueChange={(v) => set({ obligations: cents(v) })} />
                </Field>
              </div>
              <MessageChip>
                Indicative monthly repayment <b className="tabular-nums">{peso(est, 2)}</b>
                <span className="text-muted-foreground">grade C pricing · calculated by core</span>
              </MessageChip>
            </Section>
            <Section title="3 · Documents">
              <DocRow tag="ID" label="Government ID">
                {n.scans.id ? (
                  <StatusPill tone="ok">Extracted</StatusPill>
                ) : (
                  <Button size="sm" onClick={() => (set({ scans: { ...n.scans, id: true } }), toast("ID extracted by OCR"))}>
                    Scan ID
                  </Button>
                )}
              </DocRow>
              <DocRow tag="PDF" label="Payslip, latest month">
                {n.scans.payslip ? (
                  <StatusPill tone="ok">Extracted</StatusPill>
                ) : (
                  <>
                    <Button size="sm" onClick={() => (set({ scans: { ...n.scans, payslip: true } }), toast("Payslip extracted by OCR"))}>
                      Scan payslip
                    </Button>{" "}
                    <Button size="sm" onClick={() => setUpload(true)}>
                      Upload file
                    </Button>
                  </>
                )}
              </DocRow>
              {n.scans.payslip && cust && mis > 0.15 ? (
                <Note tone="warn" className="mt-3 mb-0">
                  <b>Income mismatch.</b> Declared {peso(cust.income)} vs payslip {peso(cust.payslip)} ({Math.round(mis * 100)}% apart). Choose which figure to use; your choice is recorded on the case.
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Button size="sm" variant={n.useVerified === true ? "primary" : "default"} onClick={() => set({ useVerified: true })}>
                      {n.useVerified === true ? "✓ " : ""}Use verified {peso(cust.payslip)}
                    </Button>
                    <Button size="sm" variant={n.useVerified === false ? "primary" : "default"} onClick={() => set({ useVerified: false })}>
                      {n.useVerified === false ? "✓ " : ""}Keep declared, flag for review
                    </Button>
                  </div>
                  {errors.verify && <span className="mt-2 block text-xs font-medium text-danger">{errors.verify}</span>}
                </Note>
              ) : n.scans.payslip ? (
                <p className="mt-2.5 mb-0 text-[12.5px] text-muted-foreground">Payslip matches the declared income.</p>
              ) : null}
            </Section>
          </>
        }
        side={
          <>
            <Section title="Consent">
              <p className="mt-0 mb-1.5 text-[12.5px] text-muted-foreground">Captured on the customer’s behalf, each one timestamped separately with terms v3.2.</p>
              {(
                [
                  ["c1", "Credit bureau check"],
                  ["c2", "Data processing (Data Privacy Act)"],
                  ["c3", "Terms and conditions v3.2"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="flex items-start gap-2.5 py-1.5 text-sm">
                  <Checkbox id={`na-${k}`} checked={n[k]} onCheckedChange={(c) => set({ [k]: c === true } as Partial<AssistedDraft>)} />
                  <Label htmlFor={`na-${k}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
              {errors.consent && (
                <span role="alert" className="mt-2 block text-xs font-medium text-danger">
                  {errors.consent}
                </span>
              )}
            </Section>
            <Section title="Submit">
              <p className="mt-0 mb-3 text-[12.5px] text-muted-foreground">Submitting runs checks and the decision pipeline. Most cases decide in under a minute.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={submit}>
                  Submit application
                </Button>
                <Button onClick={saveDraft}>Save draft</Button>
              </div>
            </Section>
          </>
        }
      />
      <ConfirmDialog
        open={upload}
        onOpenChange={setUpload}
        title="Upload a document"
        description="PDF, JPG or PNG up to 10 MB. Files are virus-scanned before they’re accepted."
        okLabel="Upload"
        onConfirm={() => {
          if (uploadPick === "type") return "HEIC files aren’t accepted. Upload a PDF, JPG or PNG."
          if (uploadPick === "size") return "This file is 38 MB. The limit is 10 MB."
          set({ scans: { ...n.scans, payslip: true } })
          toast("Uploaded, virus scan passed, data extracted")
        }}
      >
        <Field id="up-f" label="File (simulated)">
          <NativeSelect id="up-f" value={uploadPick} onChange={(e) => setUploadPick(e.target.value)}>
            <NativeSelectOption value="ok">payslip_oct2026.pdf · 1.2 MB</NativeSelectOption>
            <NativeSelectOption value="type">payslip.heic · 2.1 MB</NativeSelectOption>
            <NativeSelectOption value="size">statement_scan.pdf · 38 MB</NativeSelectOption>
          </NativeSelect>
        </Field>
      </ConfirmDialog>
    </>
  )
}

function DocRow({ tag, label, children }: { tag: string; label: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-2.5 border-t border-border-soft py-[9px] text-sm first:border-t-0 first:pt-0.5")}>
      <span className="flex h-[30px] w-[26px] flex-none items-center justify-center rounded-[5px] border border-border-strong bg-g-50 font-mono text-[8.5px] font-semibold text-muted-foreground">{tag}</span>
      {label}
      <span className="ml-auto">{children}</span>
    </div>
  )
}
