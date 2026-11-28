"use client"

import * as React from "react"
import { formatPeso } from "@aim-ready/core"
import { EmptyState } from "@aim-ready/ui"
import type { BorrowerApplicationListItem } from "@aim-ready/contracts"

import { BwCard, PageSkeleton, PageTitle } from "@/components/portal"
import { StatusPillFor } from "@/components/status-view"
import { decodeSessionToken } from "@/lib/decode-session-token"
import { getSessionToken, listMyApplications } from "@/lib/applications"
import { plainStatusForStage } from "@/lib/plain-status"

const REFETCH_MS = 30_000

/**
 * Real, non-simulated screen: the borrower's own applications from
 * apps/api (borrower-real-application-status) - distinct from the
 * simulated `/` home page, which still drives the fully-simulated
 * post-apply flow. Refetches on a fixed interval and on tab focus so
 * updates show up without a manual refresh.
 */
export default function MyApplicationsPage() {
  const [items, setItems] = React.useState<BorrowerApplicationListItem[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  // Bumped on every fetch kicked off, so a response that resolves after a
  // newer request has started is dropped instead of clobbering fresher
  // state (interval tick racing a focus-triggered refetch).
  const requestIdRef = React.useRef(0)

  const applyResult = React.useCallback((requestId: number, res: Awaited<ReturnType<typeof listMyApplications>>) => {
    if (requestId !== requestIdRef.current) return
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else {
      setError(res.error)
    }
  }, [])

  const load = React.useCallback(() => {
    const requestId = ++requestIdRef.current
    listMyApplications().then((res) => applyResult(requestId, res))
  }, [applyResult])

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    listMyApplications().then((res) => applyResult(requestId, res))
    const timer = setInterval(load, REFETCH_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") load()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", load)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", load)
    }
  }, [load, applyResult])

  const token = getSessionToken()
  const identity = token ? decodeSessionToken(token) : null

  if (error) {
    return (
      <div>
        <PageTitle title="My applications" />
        <div role="alert" className="text-sm text-danger">
          {error}
        </div>
      </div>
    )
  }

  if (!items) return <PageSkeleton />

  return (
    <div>
      <PageTitle title="My applications" />
      {identity && <p className="m-0 mb-3.5 text-sm text-muted-foreground">Signed in as {identity.email}</p>}
      {items.length ? (
        items.map((a) => {
          const st = plainStatusForStage(a.stage, a.declineReasonCode)
          return (
            <BwCard key={a.id}>
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {a.productCode} · {formatPeso(a.amount)} · {a.tenor} mo
                </span>
                <StatusPillFor status={st} />
              </div>
              <h3 className="text-base tracking-[-0.02em]">{st.h}</h3>
              <p className="mt-1.5 mb-0 text-sm text-muted-foreground">{st.p}</p>
            </BwCard>
          )
        })
      ) : (
        <EmptyState className="pt-[60px]" title="No applications yet" hint="Apply for a loan to see its status here." />
      )}
    </div>
  )
}
