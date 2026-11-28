"use client"

import { PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, VersionBadge } from "@aim-ready/ui"
import { useRouter } from "next/navigation"

import { Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"

/** Rows link into each template's detail page (PC-5): fully editable here. */
export default function TemplatesPage() {
  const ctx = useConsole()
  const router = useRouter()
  if (!ctx) return null
  const { s } = ctx
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Documents and templates" description="Templates with merge fields and their retention periods. Open one to edit it." />
      <Section flush>
        <Table aria-label="Documents and templates">
          <TableHeader>
            <tr>
              {["Template", "Used for", "Retention", "Version"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {s.cfg.templates.map((t) => (
              <TableRow key={t.id} onActivate={() => router.push(`/config/templates/${t.id}`)}>
                <TableCell>
                  <b className="font-semibold text-strong">{t.name}</b>
                </TableCell>
                <TableCell>{t.usedFor}</TableCell>
                <TableCell>{t.retention}</TableCell>
                <TableCell>
                  <VersionBadge status="Published" version={t.version} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </>
  )
}
