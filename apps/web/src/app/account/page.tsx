"use client"

import { Avatar, Button } from "@aim-ready/ui"

import { BwCard, BwList, PageSkeleton, PageTitle, usePortal } from "@/components/portal"
import { navigateHard } from "@/lib/navigation"
import { actions } from "@/mock"

export default function AccountPage() {
  const portal = usePortal()
  if (!portal) return <PageSkeleton />
  const b = portal.borrower
  return (
    <div>
      <PageTitle title="Account" />
      <BwCard className="flex items-center gap-3">
        <Avatar name={b.name} />
        <div>
          <b className="font-semibold text-strong">{b.name}</b>
          <div className="text-xs text-muted-foreground">
            {b.email} · {b.cif}
          </div>
        </div>
      </BwCard>
      <BwList
        rows={[
          ["Employer", b.employer],
          ["Customer since", b.since],
          ["Deposit account", b.account],
        ]}
      />
      <Button
        wide
        onClick={async () => {
          await actions.signOut()
          navigateHard("/sign-in")
        }}
      >
        Sign out
      </Button>
    </div>
  )
}
