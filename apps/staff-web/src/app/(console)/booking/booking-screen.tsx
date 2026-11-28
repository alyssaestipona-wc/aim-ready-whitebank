"use client"

import { Button, Card, CardHeader, CardTitle, ConfirmDialog, EmptyState, ListView, PageHeader, useToast } from "@aim-ready/ui"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { PRODUCT_FILTER, appText } from "@/components/app-list"
import { Kpi, KpiGrid, MessageChip, Note, Section, SlaBadge, Split } from "@/components/bits"
import { RuleRow } from "@/components/case/sections"
import { useConsole } from "@/components/use-console"
import { canCheckBooking, checkBooking, checklist, findApp, isReadOnly, peso, prodName, submitBooking, type ActionResult, type Application } from "@/mock"

/** Maker-checker is enforced in the mock layer until the API does it. */
const SIMULATED_NOTE = "Maker-checker is simulated in this prototype until the API enforces it."

export function BookingScreen() {
  const ctx = useConsole()
  const params = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const [check, setCheck] = React.useState<Application | null>(null)
  if (!ctx) return null
  const { role, s } = ctx
  const ro = isReadOnly(role)
  const sup = role === "opssup"
  const list = s.apps.filter((a) => a.stage === "Booking" && a.booking?.status !== "failed")
  const pend = s.apps.filter((a) => a.stage === "Pending checker")
  const param = params.get("case")
  const a = param ? findApp(s, param) : ((sup ? pend[0] : list[0]) ?? pend[0] ?? undefined)
  const select = (x: Application) => router.push(`/booking?case=${x.id}`)

  function report(r: ActionResult) {
    if (!r.ok) {
      if (r.asToast) return void toast(r.error, r.tone)
      return r.error
    }
    if (r.toast) toast(r.toast, r.tone)
  }

  let detail: React.ReactNode
  if (a && a.stage === "Booking" && a.booking?.status !== "failed") {
    const items = checklist(a)
    const ok = items.every((i) => i[1])
    detail = (
      <Section title={`Pre-booking checklist · ${a.name}`} tag={a.id}>
        {items.map(([label, pass, val]) => (
          <RuleRow key={label} res={pass ? "p" : "f"} label={label} value={val} />
        ))}
        <MessageChip className="my-3.5">Booking creates the loan account in core with the approved terms. A second person must approve before it runs.</MessageChip>
        <div className="flex flex-wrap items-center gap-2">
          {sup ? (
            <span className="text-[12.5px] text-muted-foreground">Loan operations prepares bookings; you check them.</span>
          ) : (
            <Button variant="primary" disabled={!ok || ro} title={ro ? "Read-only access" : ok ? undefined : "Complete every checklist item first"} onClick={async () => report(await submitBooking(a.id))}>
              Submit booking for checker
            </Button>
          )}
        </div>
        <p className="mt-3 mb-0 text-xs text-muted-foreground">{SIMULATED_NOTE}</p>
      </Section>
    )
  } else if (a && a.stage === "Pending checker" && a.booking) {
    detail = (
      <Section title={`Booking check · ${a.name}`} tag={a.id}>
        <Note tone="info">
          <b>Maker: {a.booking.maker}.</b> Idempotency key <span className="mono">{a.booking.key}</span>. Submitting again is blocked, so this loan can never be booked twice.
        </Note>
        {checklist(a).map(([label, pass, val]) => (
          <RuleRow key={label} res={pass ? "p" : "f"} label={label} value={val} />
        ))}
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Button
            variant={sup ? "primary" : "default"}
            disabled={ro}
            title={ro ? "Read-only access" : sup ? undefined : "Only a loan operations supervisor can check bookings"}
            onClick={async () => {
              const r = await canCheckBooking(a.id)
              if (r.ok) setCheck(a)
              else report(r)
            }}
          >
            Approve and book
          </Button>
        </div>
        <p className="mt-3 mb-0 text-xs text-muted-foreground">{SIMULATED_NOTE}</p>
      </Section>
    )
  } else {
    detail = (
      <Section title="Pre-booking checklist">
        <EmptyState title="Pick a case to book" hint="Select a row to run its checklist." />
      </Section>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Closing and booking"
        title="Booking"
        description={sup ? "Check bookings prepared by loan operations. Core creates the loan only after your approval." : "Approved, signed loans ready to be created in core banking. A loan operations supervisor checks every booking."}
      />
      <KpiGrid>
        <Kpi label="Ready to book" value={list.length} />
        <Kpi label="Waiting for checker" value={pend.length} />
        <Kpi label="Booked today, bank-wide" value="1,126" sub="₱486.2M released" />
        <Kpi label="Median approval to cash" value="3.1 h" sub="unsecured loans" />
      </KpiGrid>
      <Split
        main={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Ready to book</CardTitle>
              </CardHeader>
              <ListView
                label="Ready to book"
                items={list}
                filters={[PRODUCT_FILTER]}
                searchPlaceholder="Search name or case ID"
                searchText={appText}
                rowKey={(x) => x.id}
                onRowActivate={select}
                emptyMessage="Nothing ready to book"
                columns={[
                  {
                    header: "Applicant",
                    cell: (x) => (
                      <>
                        <b className="font-semibold text-strong">{x.name}</b>
                        <br />
                        <small className="mono text-muted-foreground">{x.id}</small>
                      </>
                    ),
                  },
                  { header: "Product", cell: (x) => prodName(x.product) },
                  { header: "Approved", cell: (x) => peso(x.offer?.amount ?? x.amount) },
                  { header: "SLA", cell: (x) => <SlaBadge hours={x.sla} /> },
                ]}
              />
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{sup ? "Waiting for your check" : "Waiting for checker"}</CardTitle>
              </CardHeader>
              <ListView
                label="Waiting for checker"
                items={pend}
                filters={[PRODUCT_FILTER]}
                searchPlaceholder="Search name or case ID"
                searchText={appText}
                rowKey={(x) => x.id}
                onRowActivate={select}
                emptyMessage="None"
                columns={[
                  { header: "Applicant", cell: (x) => x.name },
                  { header: "Amount", cell: (x) => peso(x.offer?.amount ?? x.amount) },
                  { header: "Maker", cell: (x) => x.booking?.maker },
                  { header: "Idempotency key", cell: (x) => <span className="mono">{x.booking?.key}</span> },
                ]}
              />
            </Card>
          </>
        }
        side={detail}
      />
      {check?.offer && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setCheck(null)}
          title={`Approve booking for ${check.name}?`}
          description={`Creates the loan account in core for ${peso(check.offer.amount)} over ${check.offer.tenor} months and releases the funds.`}
          okLabel="Approve and book"
          onConfirm={async () => report(await checkBooking(check.id))}
        />
      )}
    </>
  )
}
