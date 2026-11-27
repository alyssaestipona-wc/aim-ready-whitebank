"use client"

import { PageHeader } from "@aim-ready/ui"

import { StaticTable, VersionBadge } from "@/components/admin/bits"
import { Section } from "@/components/bits"

const TEMPLATES: Array<[string, string, string, string]> = [
  ["Loan agreement", "All products", "Closure + 10 years", "v5"],
  ["Disclosure statement (Truth in Lending)", "All products", "Closure + 10 years", "v3"],
  ["Promissory note", "All products", "Closure + 10 years", "v2"],
  ["Approval letter", "Referred cases", "Closure + 5 years", "v2"],
  ["Decline letter", "Declined cases", "5 years", "v4"],
]

/** Read-only in this port: templates have no edit or publish path. */
export default function TemplatesPage() {
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Documents and templates" description="Templates with merge fields and their retention periods. Editing creates a new version; documents already generated keep theirs." />
      <Section flush>
        <StaticTable head={["Template", "Used for", "Retention", "Version"]} rows={TEMPLATES.map((r) => [<b key="t" className="font-semibold text-strong">{r[0]}</b>, r[1], r[2], <VersionBadge key="v" status="Published" version={r[3]} />])} />
      </Section>
    </>
  )
}
