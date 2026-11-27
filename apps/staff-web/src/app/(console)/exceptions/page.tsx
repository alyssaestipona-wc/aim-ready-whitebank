"use client"

import { Button, Card, ListView, PageHeader, useToast } from "@aim-ready/ui"

import { PRODUCT_FILTER, appText } from "@/components/app-list"
import { KeyValues, Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { isReadOnly, retryBooking, tOrd } from "@/mock"

export default function ExceptionsPage() {
  const ctx = useConsole()
  const toast = useToast()
  if (!ctx) return null
  const ro = isReadOnly(ctx.role)
  const list = ctx.s.apps.filter((a) => a.booking?.status === "failed").sort((x, y) => tOrd(y.booking?.failedAt) - tOrd(x.booking?.failedAt))
  const booked = ctx.s.apps.filter((a) => a.loanNo).length
  return (
    <>
      <PageHeader eyebrow="Closing and booking" title="Booking exceptions" description="Bookings that failed in core. A retry reuses the same idempotency key, so it can never create a second loan account." />
      <Card>
        <ListView
          label="Booking exceptions"
          items={list}
          filters={[PRODUCT_FILTER]}
          searchPlaceholder="Search name, case ID or key"
          searchText={(a) => `${appText(a)} ${a.booking?.key ?? ""}`}
          rowKey={(a) => a.id}
          emptyMessage="No exceptions. Every booking reconciled with core."
          columns={[
            {
              header: "Applicant",
              cell: (a) => (
                <>
                  <b className="font-semibold text-strong">{a.name}</b>
                  <br />
                  <small className="mono text-muted-foreground">{a.id}</small>
                </>
              ),
            },
            { header: "Error", cell: (a) => <small>{a.booking?.error}</small> },
            { header: "Idempotency key", cell: (a) => <span className="mono">{a.booking?.key}</span> },
            { header: "Attempts", cell: (a) => a.booking?.attempts },
            {
              header: "",
              cell: (a) => (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={ro}
                  title={ro ? "Read-only access" : undefined}
                  onClick={async () => {
                    const r = await retryBooking(a.id)
                    if (r.ok && r.toast) toast(r.toast)
                  }}
                >
                  Retry booking
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Section title="Reconciliation · today" className="mt-3.5">
        <KeyValues items={[["Bookings sent to core", String(booked + list.length)], ["Accounts confirmed by core", String(booked)], ["Open exceptions", String(list.length)], ["Duplicates detected", "0"]]} />
      </Section>
    </>
  )
}
