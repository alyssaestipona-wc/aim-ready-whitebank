"use client"

import { fromCentavos, toCentavos } from "@aim-ready/core"
import { Card, Label, ListView, MoneyInput, PageHeader, StatusPill, type ListFilterDef, CfgButton, CheckRow, DraftBar, SimulatedCheckNote, StaticTable, TabBar, Track, VersionBadge, useRun } from "@aim-ready/ui"
import Link from "next/link"
import { notFound } from "next/navigation"
import * as React from "react"

import { CoreLabel, GradeBadge, KeyValues, Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import {
  canConfigure,
  createProductDraft,
  discardProductDraft,
  isReadOnly,
  peso,
  products,
  setProductDraftField,
  STAGES,
  submitProductDraft,
  USERS,
  GRADE_RATE,
  type ProductCode,
} from "@/mock"

type Tab = "overview" | "pricing" | "form" | "docs" | "flow" | "offers"

/** Product detail, tabs and the maker-checker draft bar. */
export function ProductView({ code: raw }: { code: string }) {
  const ctx = useConsole()
  const run = useRun()
  const [tab, setTab] = React.useState<Tab>("overview")
  if (!ctx) return null
  const code = raw as ProductCode
  if (code !== "PL" && code !== "SL") notFound()
  const { role, s } = ctx
  const p = products(s)[code]
  const can = canConfigure(role)
  const ro = isReadOnly(role)
  const D = s.pdraft && s.pdraft.code === code ? s.pdraft : null
  const editing = !!D && !D.inReview && can
  const nv = `v${Number(p.version.slice(1)) + 1}`
  const authority = USERS.approver

  const campaignFilters: ListFilterDef<string[]>[] = [
    { key: "st", label: "Status", options: [["Running", "Running"], ["Ended", "Ended"], ["Starts", "Scheduled"]], test: (c, v) => (c[4] ?? "").startsWith(v) },
  ]

  return (
    <>
      <div className="mb-2.5 text-[12.5px] text-muted-foreground">
        <Link href="/config/products" className="text-muted-foreground no-underline hover:text-strong">
          Products
        </Link>{" "}
        / {p.name}
      </div>
      <PageHeader eyebrow="Configuration" title={p.name} />
      <DraftBar>
        <VersionBadge status="Published" version={p.version} />
        {D && <VersionBadge status={D.inReview ? "In review" : "Draft"} version={nv} />}
        <span className="min-w-[200px] flex-1 text-sm text-muted-foreground">
          {D
            ? D.inReview
              ? "Submitted for review. The tenant administrator approves and publishes it in the admin console."
              : "Editing a draft on Amounts and pricing. Live applications still use the published version."
            : "Edits start as a draft that the tenant administrator approves and publishes in the admin console. In-flight applications keep the version they started on."}
        </span>
        {!D && (
          <CfgButton
            readOnly={ro}
            disabled={!can}
            onClick={async () => {
              const r = await run(createProductDraft(code))
              if (r.ok) setTab("pricing")
            }}
          >
            Create draft
          </CfgButton>
        )}
        {D && !D.inReview && (
          <>
            <CfgButton readOnly={ro} disabled={!can} onClick={() => run(discardProductDraft())}>
              Discard
            </CfgButton>
            <CfgButton readOnly={ro} disabled={!can} variant="primary" onClick={() => run(submitProductDraft())}>
              Submit for review
            </CfgButton>
          </>
        )}
        <SimulatedCheckNote />
      </DraftBar>
      <TabBar
        value={tab}
        onChange={setTab}
        items={[["overview", "Overview"], ["pricing", "Amounts and pricing"], ["form", "Form fields"], ["docs", "Documents"], ["flow", "Workflow and approvals"], ["offers", "Pre-approved offers"]]}
      />
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <Section title="Core banking product" tag={<CoreLabel />}>
            <KeyValues items={[["Core product", <span key="c" className="mono">{p.core}</span>], ["Amortisation", "Add-on, equal instalments"], ["Interest", "1.1–1.9% per month by grade"], ["Late penalty", "3% of overdue per month"]]} />
          </Section>
          <Section title="Origination settings">
            <KeyValues
              items={[
                ["Channels", "Web, branch, file intake"],
                ["Auto-approval limit", peso(p.autoLimit)],
                ["Decision bands", `approve ${s.cfg.bands.approve}+, decline below ${s.cfg.bands.decline}`],
                ["Automation", s.cfg.automation[code]],
                ["Disbursement", "Borrower’s own Kalinaw account"],
              ]}
            />
          </Section>
        </div>
      )}
      {tab === "pricing" && (
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <Section title="Amounts and limits">
            {editing && D ? (
              <>
                <div className="mb-3 grid gap-[5px]">
                  <Label htmlFor="pd-max">Maximum amount</Label>
                  <MoneyInput id="pd-max" value={fromCentavos(D.max)} onValueChange={(v) => run(setProductDraftField("max", v == null ? null : toCentavos(v)))} />
                </div>
                <div className="mb-3 grid gap-[5px]">
                  <Label htmlFor="pd-auto">Auto-approval limit</Label>
                  <MoneyInput id="pd-auto" value={fromCentavos(D.autoLimit)} onValueChange={(v) => run(setProductDraftField("autoLimit", v == null ? null : toCentavos(v)))} />
                  <span className="text-xs text-muted-foreground">Can’t exceed the maximum amount.</span>
                </div>
              </>
            ) : (
              <KeyValues items={[["Minimum", peso(p.min)], ["Maximum", peso(D ? D.max : p.max)], ["Auto-approval limit", peso(D ? D.autoLimit : p.autoLimit)], ["Tenor", `${p.tmin} – ${p.tmax} months`]]} />
            )}
          </Section>
          <Section title="Pricing grid by risk grade" flush>
            <StaticTable head={["Grade", "Add-on rate", "Processing fee"]} rows={(["A", "B", "C", "D"] as const).map((g) => [<GradeBadge key="g" grade={g} />, `${GRADE_RATE[g]}% / month`, `${p.fee * 100}%`])} />
          </Section>
        </div>
      )}
      {tab === "form" && (
        <Section title="Application form fields" flush>
          <StaticTable
            head={["Field", "Web", "Branch", "Rule"]}
            rows={[["Full name", "Required", "Required", "Pre-filled from core"], ["Monthly income", "Required", "Required", "Above ₱0"], ["Employer", "Required", "Required", "—"], ["Business details", "Conditional", "Conditional", "Shown only if self-employed"], ["Purpose", "Optional", "Optional", "—"]]}
          />
        </Section>
      )}
      {tab === "docs" && (
        <Section title="Document checklist rules" flush>
          <StaticTable head={["Document", "Required when"]} rows={[["Government ID", "Always"], ["Latest payslip", "Employed"], ["Bank statements, 6 months", "Self-employed"], ["Bank statements, 3 months", "On request (thin file or referral)"]]} />
        </Section>
      )}
      {tab === "flow" && (
        <Section title="Workflow">
          <Track steps={STAGES} />
          <p className="m-0 text-sm text-muted-foreground">
            Approval matrix: approvers up to {peso(authority.limit ?? 0)} for grades {`${authority.grades?.[0] ?? ""}–${authority.grades?.[authority.grades.length - 1] ?? ""}`}; above that, head of credit or credit committee.
          </p>
        </Section>
      )}
      {tab === "offers" && (
        <>
          <Section title="Pre-approved offer campaigns" tag="Eligibility pre-check API: 11,240 calls today" flush>
            <ListView
              label="Pre-approved offer campaigns"
              items={s.campaigns}
              filters={campaignFilters}
              searchPlaceholder="Search campaign"
              searchText={(c) => c[0] ?? ""}
              rowKey={(c) => c[0] ?? ""}
              emptyMessage="No campaigns"
              columns={[
                { header: "Campaign", cell: (c) => <b className="font-semibold text-strong">{c[0]}</b> },
                { header: "Eligible", cell: (c) => c[1] },
                { header: "Accepted", cell: (c) => c[2] },
                { header: "Booked", cell: (c) => c[3] },
                { header: "Status", cell: (c) => <StatusPill tone={c[4] === "Running" ? "ok" : "neutral"}>{c[4]}</StatusPill> },
              ]}
            />
          </Section>
          <Card className="mt-3.5 px-[18px] py-4">
            <h3 className="mb-2 text-base font-semibold">Eligibility rules</h3>
            <CheckRow label="Customer for at least 12 months" value="Required" />
            <CheckRow label="Salary credited to Kalinaw for 6 of the last 6 months" value="Required" />
            <CheckRow label="No 30+ day delinquency in 12 months (bureau)" value="Required" />
            <CheckRow label="Indicative amount" value="3× monthly salary, cap ₱300,000" />
          </Card>
        </>
      )}
    </>
  )
}
