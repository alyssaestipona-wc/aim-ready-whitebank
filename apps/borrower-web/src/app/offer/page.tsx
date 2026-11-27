"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { formatPeso } from "@aim-ready/core"
import { Button, Checkbox, EmptyState, useToast } from "@aim-ready/ui"

import { Amount, BwCard, BwList, CheckRow, Note, PageSkeleton, PageTitle, SectionLabel, usePortal } from "@/components/portal"
import { actions, productName, termsOf } from "@/mock"

export default function OfferPage() {
  const portal = usePortal()
  const router = useRouter()
  const toast = useToast()
  const [ack, setAck] = React.useState(false)
  if (!portal) return <PageSkeleton />
  const a = portal.app
  if (!a || a.stage !== "Offer" || !a.offer) {
    return (
      <div>
        <PageTitle title="Your offer" back="/" />
        <EmptyState title="No offer right now" hint="We’ll let you know when one is ready." />
      </div>
    )
  }
  const tm = termsOf(a)

  const accept = async () => {
    const r = await actions.acceptOffer(ack)
    if (!r.ok) {
      toast(r.error, "bad")
      return
    }
    setAck(false)
    router.push("/")
    toast("Offer accepted. We’ll send your documents to sign.")
  }

  return (
    <div>
      <PageTitle title="Your offer" back="/" />
      <BwCard dark>
        <div className="text-xs text-white/60">{productName(a.product)}</div>
        <Amount className="text-white">{formatPeso(tm.principal)}</Amount>
        <div className="mt-0.5 text-[12.5px] text-white/60">
          {formatPeso(tm.monthlyPayment, { decimals: 2 })} a month for {tm.months} months
        </div>
      </BwCard>
      {a.offer.amount !== a.amount && (
        <Note>
          <b>Counter-offer.</b> You asked for {formatPeso(a.amount)}; this is what we can offer.
        </Note>
      )}
      <SectionLabel>Disclosure statement</SectionLabel>
      <BwList
        rows={[
          ["Amount financed", formatPeso(tm.principal)],
          ["Processing fee", formatPeso(tm.fee)],
          ["You receive", formatPeso(tm.netProceeds)],
          ["Monthly payment", formatPeso(tm.monthlyPayment, { decimals: 2 })],
          ["Total of payments", formatPeso(tm.totalOfPayments, { decimals: 2 })],
          ["Finance charge", formatPeso(tm.financeCharge, { decimals: 2 })],
          ["Effective interest rate", `${tm.effectiveRatePct.toFixed(2)}% a year`],
          ["Late payment", "3% of the amount due a month"],
        ]}
      />
      <CheckRow id="bw-ack" control={<Checkbox id="bw-ack" checked={ack} onCheckedChange={(c) => setAck(c === true)} />}>
        I’ve read and understood the disclosure statement.
      </CheckRow>
      <Button variant="primary" wide className="mt-3" disabled={!ack} onClick={accept}>
        Accept offer
      </Button>
      <p className="mt-2.5 mb-0 text-xs text-muted-foreground">You’ll sign the loan agreement and promissory note next. This offer expires 5 days after it was sent.</p>
    </div>
  )
}
