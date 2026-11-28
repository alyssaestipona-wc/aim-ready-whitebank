"use client"

import { PageHeader, StaticTable, TabBar, VersionBadge } from "@aim-ready/ui"
import * as React from "react"

import { Section } from "@/components/bits"
import { OVERRIDE_THRESHOLD, peso } from "@/mock"

type Tab = "stages" | "queues" | "mc"

/** Read-only in this port: workflow configuration has no edit or publish path. */
export default function WorkflowsPage() {
  const [tab, setTab] = React.useState<Tab>("stages")
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Workflows" description="Stages, SLAs, queues and maker-checker rules, all editable without a code change." actions={<VersionBadge status="Published" version="v3" />} />
      <TabBar value={tab} onChange={setTab} items={[["stages", "Stages and SLAs"], ["queues", "Queues and assignment"], ["mc", "Maker-checker"]]} />
      {tab === "stages" && (
        <Section flush tag="Business hours follow the PH holiday calendar">
          <StaticTable
            head={["Stage", "SLA", "Escalates to", "Time limit"]}
            rows={[["Checks", "5 minutes", "Integration support", "—"], ["Review", "8 business hours", "Credit team lead", "—"], ["Info requested", "3 days", "Credit team lead", "Returns to review on response"], ["Approval", "4 business hours", "Head of credit", "—"], ["Offer", "—", "—", "Expires after 5 days"], ["Documentation", "24 hours", "Ops lead", "Signatures expire after 10 days"], ["Booking", "4 hours", "Ops lead", "—"]]}
          />
        </Section>
      )}
      {tab === "queues" && (
        <Section flush>
          <StaticTable
            head={["Queue", "Who works it", "Assignment", "Members"]}
            rows={[["Consumer credit · Metro Manila", "Loan officers", "Round robin", "Miguel Ramos, Andrea Lim, Carlo Torres, Nicole Santos"], ["Approvals", "Approvers", "By authority level", "Teresa Lim, Jose Navarro, Maria Villareal"], ["Credit administration", "Loan operations", "Manual pick", "Paolo Reyes, Celine Uy (checker)"], ["Branch drafts", "Branch officers", "Branch of capture", "Bea Santiago, Rowena Dizon, Jessa Manalo, Arvin Co"]]}
          />
        </Section>
      )}
      {tab === "mc" && (
        <Section flush tag="Self-approval is blocked on every pair">
          <StaticTable
            head={["Action", "Maker", "Checker"]}
            rows={[["Credit approval", "Loan officer (recommends)", "Approver"], [`Override of ${peso(OVERRIDE_THRESHOLD)}+ or a changed decision`, "Loan officer", "Approver (second sign-off)"], ["Booking and disbursement", "Loan operations", "Loan operations supervisor"], ["Rule, product and model changes", "Credit risk or tenant admin", "The other of the two"]]}
          />
        </Section>
      )}
    </>
  )
}
