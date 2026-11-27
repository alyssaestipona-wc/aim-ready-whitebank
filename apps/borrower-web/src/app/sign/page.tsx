"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Checkbox, EmptyState, Input, Label, cn, useToast } from "@aim-ready/ui"

import { DocumentDialog } from "@/components/documents"
import { BwList, CheckRow, ErrorNote, PageSkeleton, PageTitle, usePortal } from "@/components/portal"
import { actions } from "@/mock"
import { signSchema, type SignValues } from "@/mock/schemas"

const DOCS = [
  ["Loan agreement", "v5"],
  ["Promissory note", "v2"],
  ["Disclosure statement", "Acknowledged"],
] as const

export default function SignPage() {
  const portal = usePortal()
  const router = useRouter()
  const toast = useToast()
  const [error, setError] = React.useState("")
  const [reading, setReading] = React.useState<string | null>(null)
  const form = useForm<SignValues>({ resolver: zodResolver(signSchema), defaultValues: { name: "", agree: false } })
  const name = useWatch({ control: form.control, name: "name" })
  if (!portal) return <PageSkeleton />
  const a = portal.app
  if (!a || !(a.stage === "Documentation" && a.borrowerPending === "sign")) {
    return (
      <div>
        <PageTitle title="Sign documents" back="/" />
        <EmptyState title="Nothing to sign" hint="We’ll let you know when your documents are ready." />
      </div>
    )
  }

  const onSubmit = form.handleSubmit(async (v) => {
    const r = await actions.signDocuments(v.name, v.agree)
    if (!r.ok) return setError(r.error)
    form.reset()
    setError("")
    router.push("/")
    toast("Signed. We’re setting up your loan.")
  })

  return (
    <div>
      <PageTitle title="Sign documents" back="/" />
      <BwList
        rows={DOCS.map(([doc, v]) => [
          <span key="l">
            {doc} <span className="text-muted-foreground">· {v}</span>
          </span>,
          <Button key="r" size="sm" onClick={() => setReading(doc)} aria-label={`Read ${doc}`}>
            Read
          </Button>,
        ])}
      />
      <form noValidate onSubmit={onSubmit} onChange={() => error && setError("")}>
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="sg-name">Type your full name to sign</Label>
          <Input id="sg-name" autoComplete="name" aria-invalid={!!error || undefined} {...form.register("name")} />
        </div>
        <div
          data-testid="signature"
          className={cn(
            "flex h-[110px] justify-center rounded-xl border border-dashed border-border-strong bg-g-50 p-2.5",
            name ? "items-end font-script text-[30px] text-ink" : "items-center text-xs text-subtle"
          )}
        >
          {name || "Your signature appears here"}
        </div>
        <div className="mt-2.5">
          <CheckRow
            id="sg-agree"
            control={<Controller control={form.control} name="agree" render={({ field }) => <Checkbox id="sg-agree" checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />} />}
          >
            I agree to sign these documents electronically.
          </CheckRow>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" variant="primary" wide className="mt-2.5">
          Sign documents
        </Button>
      </form>
      <DocumentDialog app={a} name={reading} onClose={() => setReading(null)} />
    </div>
  )
}
