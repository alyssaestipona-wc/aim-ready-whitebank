"use client"

import * as React from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { formatPeso, fromCentavos, toCentavos } from "@aim-ready/core"
import { Button, Checkbox, EmptyState, Label, MoneyInput, NativeSelect, NativeSelectOption, cn } from "@aim-ready/ui"

import { BwCard, BwList, CheckRow, ErrorNote, PageSkeleton, PageTitle, SectionLabel, usePortal } from "@/components/portal"
import { CtaLink, StatusPillFor } from "@/components/status-view"
import { actions, estimateMonthly, plainStatus, PRODUCTS, PURPOSES, TENOR_CHOICES, useBorrowerState, type ApplicationForm, type Borrower, type ProductCode } from "@/mock"
import { applySchema, type ApplyValues } from "@/mock/schemas"

const CONSENTS = [
  ["consentCredit", "I allow Kalinaw Bank to check my credit history with a credit bureau."],
  ["consentData", "I agree to the processing of my personal data under the Data Privacy Act."],
  ["consentTerms", "I accept the loan terms and conditions (version 3.2)."],
] as const

function toForm(v: ApplyValues): ApplicationForm {
  const c = (n: number | null) => (n === null || Number.isNaN(n) ? null : toCentavos(n))
  return { ...v, amount: c(v.amount), income: c(v.income), obligations: c(v.obligations) }
}

function ApplyForm({ borrower }: { borrower: Borrower }) {
  const state = useBorrowerState()
  const [step, setStep] = React.useState<1 | 2 | 3>(1)
  const [error, setError] = React.useState("")
  const [running, setRunning] = React.useState(false)
  const [resultId, setResultId] = React.useState<string | null>(null)
  const form = useForm<ApplyValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      product: "PL",
      amount: 150000,
      tenor: 24,
      income: fromCentavos(borrower.income),
      obligations: fromCentavos(borrower.obligations),
      purpose: "Home improvement",
      consentCredit: false,
      consentData: false,
      consentTerms: false,
    },
  })
  const v = useWatch({ control: form.control }) as ApplyValues
  const P = PRODUCTS[v.product]

  if (running) {
    return (
      <div>
        <PageTitle title="Checking your application" />
        <EmptyState className="pt-20" title="Just a moment…" hint="We’re verifying your identity, checking your credit history and applying our lending rules." />
      </div>
    )
  }

  const result = resultId ? state?.apps.find((a) => a.id === resultId) : null
  if (result) {
    const st = plainStatus(result)
    return (
      <div>
        <PageTitle title="Application sent" />
        <BwCard>
          <StatusPillFor status={st} />
          <h3 className="mt-2.5 text-base tracking-[-0.02em]">{st.h}</h3>
          <p className="mt-1.5 mb-3.5 text-sm text-muted-foreground">{st.p}</p>
          {st.cta ? <CtaLink href={st.cta[1]}>{st.cta[0]}</CtaLink> : <CtaLink href="/" variant="default">Back to home</CtaLink>}
        </BwCard>
        <p className="text-xs text-muted-foreground">Reference {result.id}. We’ll update you here at every step.</p>
      </div>
    )
  }

  const pickProduct = (code: ProductCode) => {
    const next = PRODUCTS[code]
    const amt = toCentavos(v.amount ?? 0)
    form.setValue("product", code)
    form.setValue("amount", fromCentavos(Math.min(Math.max(amt, next.min), next.max)))
    if (v.tenor > next.tenorMax) form.setValue("tenor", next.tenorMax)
  }

  const next = () => {
    if (step === 3) return
    const err = actions.validateStep(step, toForm(v))
    if (err) {
      setError(err)
      return
    }
    setError("")
    setStep((s) => (s + 1) as 2 | 3)
  }

  const submit = form.handleSubmit(async (values) => {
    const pre = actions.precheckSubmission(toForm(values))
    if (pre) return setError(pre)
    setRunning(true)
    const r = await actions.submitApplication(toForm(values))
    setRunning(false)
    if (!r.ok) return setError(r.error)
    setResultId(r.id)
  })

  const amountC = v.amount === null ? 0 : toCentavos(v.amount)
  return (
    <div>
      <PageTitle title="Apply for a loan" back={step === 1 ? "/" : undefined} />
      <div className="-mt-1 mb-3.5 text-xs text-muted-foreground">Step {step} of 3 · saved automatically, resume within 30 days</div>
      <form noValidate onSubmit={(e) => e.preventDefault()} onChange={() => error && setError("")}>
        {step === 1 && (
          <>
            <div role="group" aria-label="Loan type" className="mb-3.5 flex gap-[3px] rounded-lg bg-g-100 p-[3px]">
              {(Object.keys(PRODUCTS) as ProductCode[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={k === v.product}
                  onClick={() => pickProduct(k)}
                  className={cn(
                    "flex-1 rounded-md px-1.5 py-2 text-[12.5px] font-medium",
                    k === v.product ? "bg-paper font-semibold text-strong shadow-[0_1px_3px_rgb(0_0_0/0.1)]" : "text-muted-foreground"
                  )}
                >
                  {PRODUCTS[k].name}
                </button>
              ))}
            </div>
            <div className="mb-3 grid gap-[5px]">
              <Label htmlFor="ap-amount">How much do you need?</Label>
              <Controller
                control={form.control}
                name="amount"
                render={({ field }) => <MoneyInput id="ap-amount" value={field.value} onValueChange={field.onChange} aria-invalid={!!error || undefined} aria-describedby="ap-amount-h" />}
              />
              <span id="ap-amount-h" className="text-xs text-muted-foreground">
                {formatPeso(P.min)} to {formatPeso(P.max)}
              </span>
            </div>
            <div className="mb-3 grid gap-[5px]">
              <Label htmlFor="ap-tenor">Pay back over</Label>
              <NativeSelect id="ap-tenor" value={String(v.tenor)} onChange={(e) => form.setValue("tenor", Number(e.target.value))}>
                {TENOR_CHOICES.filter((t) => t >= P.tenorMin && t <= P.tenorMax).map((t) => (
                  <NativeSelectOption key={t} value={t}>
                    {t} months
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <BwCard className="bg-g-50">
              <div className="text-xs text-muted-foreground">Estimated monthly payment</div>
              <div data-testid="estimate" className="text-2xl leading-[1.1] font-semibold tracking-[-0.03em] text-strong tabular-nums">
                {formatPeso(estimateMonthly(v.product, amountC, v.tenor), { decimals: 2 })}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">Indicative, calculated by Kalinaw core banking. Your final rate depends on your application.</div>
            </BwCard>
          </>
        )}
        {step === 2 && (
          <>
            <BwList
              rows={[
                ["Name", borrower.name],
                ["Employer", borrower.employer],
                ["Customer since", borrower.since],
              ]}
            />
            <div className="mb-3 grid gap-[5px]">
              <Label htmlFor="ap-income">Monthly income</Label>
              <Controller control={form.control} name="income" render={({ field }) => <MoneyInput id="ap-income" value={field.value} onValueChange={field.onChange} aria-invalid={!!error || undefined} />} />
            </div>
            <div className="mb-3 grid gap-[5px]">
              <Label htmlFor="ap-obligations">Monthly loan payments elsewhere</Label>
              <Controller control={form.control} name="obligations" render={({ field }) => <MoneyInput id="ap-obligations" value={field.value} onValueChange={field.onChange} />} />
            </div>
            <div className="mb-3 grid gap-[5px]">
              <Label htmlFor="ap-purpose">What is it for?</Label>
              <NativeSelect id="ap-purpose" {...form.register("purpose")}>
                {PURPOSES.map((p) => (
                  <NativeSelectOption key={p}>{p}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <BwList
              rows={[
                ["Loan", P.name],
                ["Amount", formatPeso(amountC, { decimals: 2 })],
                ["Term", `${v.tenor} months`],
                ["Monthly income", formatPeso(v.income === null ? 0 : toCentavos(v.income), { decimals: 2 })],
              ]}
            />
            <SectionLabel className="mt-1.5">Your consent</SectionLabel>
            {CONSENTS.map(([name, text]) => (
              <CheckRow
                key={name}
                id={`ap-${name}`}
                control={
                  <Controller
                    control={form.control}
                    name={name}
                    render={({ field }) => <Checkbox id={`ap-${name}`} checked={field.value} aria-invalid={(!!error?.startsWith("Please tick") && !field.value) || undefined} onCheckedChange={(c) => field.onChange(c === true)} />}
                  />
                }
              >
                {text}
              </CheckRow>
            ))}
          </>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="mt-4 grid auto-cols-fr grid-flow-col gap-2">
          {step > 1 && (
            <Button
              onClick={() => {
                setError("")
                setStep((s) => (s - 1) as 1 | 2)
              }}
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button variant="primary" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" onClick={submit}>
              Submit application
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

export default function ApplyPage() {
  const portal = usePortal()
  if (!portal) return <PageSkeleton />
  return <ApplyForm key={portal.borrower.id} borrower={portal.borrower} />
}
