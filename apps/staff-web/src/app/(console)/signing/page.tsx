"use client"

import { Button, Card, ListView, PageHeader, StatusPill, useToast } from "@aim-ready/ui"
import { useRouter } from "next/navigation"

import { PRODUCT_FILTER, appText } from "@/components/app-list"
import { useConsole } from "@/components/use-console"
import { generateDocs, isReadOnly, peso } from "@/mock"

export default function SigningPage() {
  const ctx = useConsole()
  const router = useRouter()
  const toast = useToast()
  if (!ctx) return null
  const ro = isReadOnly(ctx.role)
  const list = ctx.s.apps.filter((a) => a.stage === "Documentation")
  return (
    <>
      <PageHeader eyebrow="Closing and booking" title="Documents and signing" description="Generate closing documents from templates and track e-signatures. Signed documents are stored with their signature certificate." />
      <Card>
        <ListView
          label="Documents and signing"
          items={list}
          filters={[
            { key: "st", label: "Status", options: [["sent", "Sent · awaiting signature"], ["new", "Not generated yet"]], test: (a, v) => (v === "sent" ? a.borrowerPending === "sign" : a.borrowerPending !== "sign") },
            PRODUCT_FILTER,
          ]}
          searchPlaceholder="Search name or case ID"
          searchText={appText}
          rowKey={(a) => a.id}
          onRowActivate={(a) => router.push(`/applications/${a.id}`)}
          emptyMessage="No documents in progress"
          columns={[
            {
              header: "Applicant",
              cell: (a) => (
                <>
                  <b className="font-semibold text-strong">{a.name}</b>
                  <br />
                  <small className="mono text-muted-foreground">{a.id}</small>
                </>
              ),
            },
            { header: "Approved terms", cell: (a) => (a.offer ? `${peso(a.offer.amount)} / ${a.offer.tenor} mo` : "—") },
            { header: "Documents", cell: (a) => (a.borrowerPending === "sign" ? "Agreement, promissory note" : <span className="text-muted-foreground">Not generated</span>) },
            { header: "Borrower", cell: (a) => (a.borrowerPending === "sign" ? <StatusPill tone="warn">Sent · awaiting signature</StatusPill> : <StatusPill tone="info">Accepted offer</StatusPill>) },
            {
              header: "",
              cell: (a) =>
                a.borrowerPending === "sign" ? (
                  <span className="text-muted-foreground">Open case</span>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={ro}
                    title={ro ? "Read-only access" : undefined}
                    onClick={async (e) => {
                      e.stopPropagation()
                      const r = await generateDocs(a.id)
                      if (!r.ok) toast(r.error, "bad")
                      else if (r.toast) toast(r.toast)
                    }}
                  >
                    Generate and send
                  </Button>
                ),
            },
          ]}
        />
      </Card>
    </>
  )
}
