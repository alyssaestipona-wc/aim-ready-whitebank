"use client"

import { Card, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, VersionBadge } from "@aim-ready/ui"
import { useRouter } from "next/navigation"

import { useConsole } from "@/components/use-console"
import { peso, products } from "@/mock"

export default function ProductsPage() {
  const ctx = useConsole()
  const router = useRouter()
  if (!ctx) return null
  const { s } = ctx
  const P = products(s)
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Products" description="Each loan product points at a product in core banking and adds origination settings on top. Changes apply to new applications only." />
      <Card>
        <Table aria-label="Products">
          <TableHeader>
            <tr>
              {["Product", "Core product", "Amounts", "Tenor", "Auto-approval limit", "Channels", "Version"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {(["PL", "SL"] as const).map((k) => {
              const p = P[k]
              const d = s.pdraft && s.pdraft.code === k ? s.pdraft : null
              return (
                <TableRow key={k} onActivate={() => router.push(`/config/products/${k}`)}>
                  <TableCell>
                    <b className="font-semibold text-strong">{p.name}</b>
                  </TableCell>
                  <TableCell>
                    <span className="mono">{p.core}</span>
                  </TableCell>
                  <TableCell>
                    {peso(p.min)} – {peso(p.max)}
                  </TableCell>
                  <TableCell>
                    {p.tmin} – {p.tmax} months
                  </TableCell>
                  <TableCell>{peso(p.autoLimit)}</TableCell>
                  <TableCell>Web, branch, file</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      <VersionBadge status="Published" version={p.version} />
                      {d && <VersionBadge status={d.inReview ? "In review" : "Draft"} version={`v${Number(p.version.slice(1)) + 1}`} />}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
