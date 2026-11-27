"use client"

import { Card, CardHeader, CardTag, CardTitle, ListView, PageHeader, StatusPill } from "@aim-ready/ui"
import { useRouter } from "next/navigation"

import { APP_COLUMNS, appText, distinct } from "@/components/app-list"
import { Kpi, KpiGrid } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { USERS, peso } from "@/mock"

export default function ApprovalsPage() {
  const ctx = useConsole()
  const router = useRouter()
  if (!ctx) return null
  const dec = ctx.s.apps.filter((a) => a.stage === "Approval")
  return (
    <>
      <PageHeader
        eyebrow="My work"
        title="Approvals"
        description={`Teresa Lim · authority ${peso(USERS.approver.limit ?? 0)}, grades A–C. Anything above authority routes to credit committee; overrides above ₱50,000 need your sign-off as second approver.`}
      />
      <KpiGrid>
        <Kpi label="Waiting on you" value={dec.length} />
        <Kpi label="Decided today" value={23} sub="19 approved · 4 declined" />
        <Kpi label="Overrides this week" value={11} sub="3 above threshold" />
        <Kpi label="Median time to decide" value="1.6 h" />
      </KpiGrid>
      <Card>
        <CardHeader>
          <CardTitle>Credit decisions</CardTitle>
          <CardTag>{dec.length} waiting</CardTag>
        </CardHeader>
        <ListView
          label="Credit decisions"
          items={dec}
          filters={[
            {
              key: "override",
              label: "Override",
              options: [["above", "Above threshold (2nd approval)"], ["below", "Below threshold"], ["none", "No override"]],
              test: (a, v) => {
                const r = a.recommendation
                return v === "none" ? !r?.reason : !!r?.reason && r.overLevel === v
              },
            },
            { key: "product", label: "Product", options: [["PL", "Personal loan"], ["SL", "Salary loan"]], test: (a, v) => a.product === v },
            { key: "by", label: "Officer", options: distinct(dec, (a) => a.recommendation?.by), test: (a, v) => a.recommendation?.by === v },
          ]}
          searchPlaceholder="Search name or case ID"
          searchText={appText}
          rowKey={(a) => a.id}
          onRowActivate={(a) => router.push(`/applications/${a.id}`)}
          emptyMessage="No recommendations waiting"
          columns={[
            ...APP_COLUMNS,
            {
              header: "Recommendation",
              cell: (a) => {
                const r = a.recommendation ?? { decision: "approve" as const, amount: a.amount, reason: null, overLevel: null }
                return (
                  <small>
                    <b className="font-semibold text-strong">{r.decision === "counter" ? "Counter-offer" : r.decision === "approve" ? "Approve" : "Decline"}</b> {r.decision !== "decline" ? peso(r.amount) : ""}
                    {r.reason && (
                      <>
                        <br />
                        <StatusPill tone={r.overLevel === "above" ? "warn" : "neutral"}>{r.overLevel === "above" ? "Override · 2nd approval" : "Override"}</StatusPill>
                      </>
                    )}
                  </small>
                )
              },
            },
          ]}
        />
      </Card>
    </>
  )
}
