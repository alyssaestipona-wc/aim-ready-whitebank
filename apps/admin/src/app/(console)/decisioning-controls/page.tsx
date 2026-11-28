"use client"

import { Button, Card, ConfirmDialog, PageHeader } from "@aim-ready/ui"
import type { TenantConfigResponse } from "@aim-ready/contracts"
import * as React from "react"

import { getTenantConfig, updateTenantConfig } from "@/mock/actions/tenant-config"

/**
 * Real decisioning controls from apps/api (decisioning-recommendation-and-
 * overrides) - the kill switch and bureau-down flag, both previously
 * hardcoded `false` constants with no way to toggle them. The first real
 * (non-simulated) admin-console screen beyond sign-in, kept separate from
 * the existing simulated /config/decisioning screen.
 */
export default function DecisioningControlsPage() {
  const [data, setData] = React.useState<TenantConfigResponse | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [confirming, setConfirming] = React.useState<"killSwitch" | "bureauDown" | null>(null)

  React.useEffect(() => {
    let cancelled = false
    getTenantConfig().then((res) => {
      if (cancelled) return
      if (res.ok) setData(res.data)
      else setError(res.error)
    })
    return () => {
      cancelled = true
    }
  }, [])

  /** Returns an error message on failure, for `ConfirmDialog` to show inline - nothing on success. */
  async function toggle(flag: "killSwitch" | "bureauDown"): Promise<string | undefined> {
    if (!data) return undefined
    const res = await updateTenantConfig({ [flag]: !data[flag] })
    if (!res.ok) return res.error
    setData(res.data)
    return undefined
  }

  if (error) return <p role="alert">{error}</p>
  if (!data) return <p>Loading…</p>

  return (
    <>
      <PageHeader
        eyebrow="Decisioning"
        title="Decisioning controls"
        description="The kill switch and bureau-down flag take effect on the next new application; applications already decided are unaffected."
      />
      <Card>
        <h2>Kill switch</h2>
        <p>{data.killSwitch ? "On — every new application is routed to manual review." : "Off — automation runs normally."}</p>
        <Button onClick={() => setConfirming("killSwitch")}>
          {data.killSwitch ? "Turn off" : "Turn on"}
        </Button>
      </Card>
      <Card>
        <h2>Bureau down</h2>
        <p>{data.bureauDown ? "On — every new application is routed to manual review as a bureau outage." : "Off — the credit bureau is treated as available."}</p>
        <Button onClick={() => setConfirming("bureauDown")}>
          {data.bureauDown ? "Turn off" : "Turn on"}
        </Button>
      </Card>
      <ConfirmDialog
        open={confirming === "killSwitch"}
        onOpenChange={(open) => setConfirming(open ? "killSwitch" : null)}
        title={`${data.killSwitch ? "Turn off" : "Turn on"} the kill switch?`}
        description={data.killSwitch ? "Automation resumes normally for every new application." : "Every new application, across every product, is routed to manual review until this is turned off again."}
        okLabel={data.killSwitch ? "Turn off" : "Turn on"}
        danger={!data.killSwitch}
        onConfirm={() => toggle("killSwitch")}
      />
      <ConfirmDialog
        open={confirming === "bureauDown"}
        onOpenChange={(open) => setConfirming(open ? "bureauDown" : null)}
        title={`${data.bureauDown ? "Turn off" : "Turn on"} the bureau-down flag?`}
        description={data.bureauDown ? "The credit bureau is treated as available again." : "Every new application is routed to manual review as a bureau outage, until this is turned off again."}
        okLabel={data.bureauDown ? "Turn off" : "Turn on"}
        danger={!data.bureauDown}
        onConfirm={() => toggle("bureauDown")}
      />
    </>
  )
}
