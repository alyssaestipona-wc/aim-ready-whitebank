"use client"

import { formatPeso } from "@aim-ready/core"

import { Amount, BwCard, PageSkeleton, usePortal } from "@/components/portal"
import { CtaLink, StatusPillFor, Tracker } from "@/components/status-view"
import { plainStatus, productName, trackerSteps } from "@/mock"

export default function HomePage() {
  const portal = usePortal()
  if (!portal) return <PageSkeleton />
  const { borrower: b, app: a } = portal

  const hero = (
    <>
      <div className="pt-[22px] pb-4">
        <p className="m-0 mt-0.5 text-sm text-muted-foreground">Good morning,</p>
        <h2 className="text-[22px] tracking-[-0.03em]">{b.first}</h2>
      </div>
      <BwCard dark>
        <div className="text-xs text-white/60">{b.account}</div>
        <Amount className="mt-1 text-white">{formatPeso(b.balance, { decimals: 2 })}</Amount>
        <div className="mt-0.5 text-xs text-white/60">Available balance</div>
      </BwCard>
    </>
  )

  if (!a || a.stage === "Declined" || a.stage === "Withdrawn") {
    const closed = a ? plainStatus(a) : null
    return (
      <div>
        {hero}
        <BwCard>
          <h3 className="text-base tracking-[-0.02em]">Need extra funds?</h3>
          <p className="mt-1 mb-3.5 text-sm text-muted-foreground">Personal and salary loans from ₱10,000, with a decision in minutes for most applications.</p>
          <CtaLink href="/apply">Apply for a loan</CtaLink>
        </BwCard>
        {a && closed && (
          <BwCard>
            <div className="flex items-center justify-between gap-2">
              <b className="font-semibold text-strong">
                {productName(a.product)} · {formatPeso(a.amount)}
              </b>
              <StatusPillFor status={closed} />
            </div>
            <p className="mt-2 mb-0 text-sm text-muted-foreground">
              {closed.h}. {closed.p}
            </p>
          </BwCard>
        )}
      </div>
    )
  }

  const st = plainStatus(a)
  return (
    <div>
      {hero}
      <div className="grid items-start gap-3.5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <BwCard>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {productName(a.product)} · {a.id}
            </span>
            <StatusPillFor status={st} />
          </div>
          <h3 className="text-base tracking-[-0.02em]">{st.h}</h3>
          <p className={st.cta ? "mt-1.5 mb-3.5 text-sm text-muted-foreground" : "mt-1.5 mb-0 text-sm text-muted-foreground"}>{st.p}</p>
          {st.cta && <CtaLink href={st.cta[1]}>{st.cta[0]}</CtaLink>}
        </BwCard>
        <BwCard>
          <b className="text-sm font-semibold text-strong">Your application</b>
          <Tracker steps={trackerSteps(a)} />
        </BwCard>
      </div>
    </div>
  )
}
