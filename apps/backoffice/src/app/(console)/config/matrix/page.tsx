"use client"

import { PageHeader } from "@aim-ready/ui"

import { CheckRow, StaticTable, VersionBadge } from "@/components/admin/bits"
import { Section } from "@/components/bits"
import { OVERRIDE_THRESHOLD, peso, USERS } from "@/mock"

/** Read-only in this port: the approval matrix has no edit or publish path. */
export default function MatrixPage() {
  const a = USERS.approver
  const grades = a.grades ?? []
  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Approval matrix"
        description="Delegated authority by amount, product, grade and exception type. Visible to every permitted role; editable only by credit risk or the tenant administrator."
        actions={<VersionBadge status="Published" version="v2" />}
      />
      <Section flush>
        <StaticTable
          head={["Level", "Who", "Amount", "Products", "Grades", "Exceptions"]}
          rows={[
            ["L1", "Approvers (3)", `Up to ${peso(a.limit ?? 0)}`, "Personal, salary", `${grades[0]}–${grades[grades.length - 1]}`, "Second sign-off on overrides"],
            ["L2", "Head of credit", "Up to ₱3,000,000", "Personal, salary", "A–D", "Policy exceptions"],
            ["L3", "Credit committee", "Above ₱3,000,000", "All", "All", "Related-party and insider loans"],
          ]}
        />
      </Section>
      <Section title="Override threshold" className="mt-3.5">
        <CheckRow label={`Recommendation changes the decision, or differs from the AI amount by ${peso(OVERRIDE_THRESHOLD)} or more`} value="Second sign-off required" />
        <CheckRow label="Smaller differences" value="Reason code recorded" />
      </Section>
    </>
  )
}
