"use client"

import { toCentavos } from "@aim-ready/core"
import { CfgButton, ConfirmDialog, DocPaper, Input, Label, PageHeader, VersionBadge, useRun } from "@aim-ready/ui"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import * as React from "react"

import { Section, Split } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { BANK_NAME, deleteTemplate, peso, products, saveTemplate, type Template } from "@/mock"

/** Merge fields each template kind offers an insert button for. */
const TPL_FIELDS: Record<string, readonly string[]> = {
  agreement: ["borrower_name", "lender_name", "amount", "product_name", "fee", "tenor", "monthly_payment"],
  disclosure: ["amount_financed", "fee", "net_proceeds", "term", "monthly", "total_payments", "finance_charge", "eir"],
  note: ["borrower_name", "lender_name", "amount", "tenor", "monthly_payment"],
  approval: ["borrower_name", "product_name", "amount"],
  decline: ["borrower_name", "decline_reason"],
}

type Draft = { usedFor: string; retention: string; body: string }

function draftOf(t: Template): Draft {
  return { usedFor: t.usedFor, retention: t.retention, body: t.body }
}

/** Substitution values for the live preview (this app has no sample case pipeline, so these are fixed sample values). */
function useSampleValues(): Record<string, string> {
  const ctx = useConsole()
  return React.useMemo(() => {
    const p = ctx ? products(ctx.s).PL : null
    const amount = peso(toCentavos(150000))
    return {
      borrower_name: "Grace Medina",
      lender_name: `${BANK_NAME} Bank`,
      amount,
      product_name: p?.name ?? "Personal loan",
      fee: peso(toCentavos(3000)),
      tenor: "24 months",
      monthly_payment: peso(toCentavos(7500), 2),
      amount_financed: amount,
      net_proceeds: peso(toCentavos(147000)),
      term: "24 months",
      monthly: peso(toCentavos(7500), 2),
      total_payments: peso(toCentavos(180000), 2),
      finance_charge: peso(toCentavos(33000), 2),
      eir: "18.50%",
      decline_reason: "Insufficient verified income",
    }
  }, [ctx])
}

/** Renders a template body with `{{field}}` tokens substituted and highlighted. */
function MergePreview({ body, values }: { body: string; values: Record<string, string> }) {
  const parts = body.split(/(\{\{\w+\}\})/g)
  return (
    <p className="m-0 whitespace-pre-wrap">
      {parts.map((part, i) => {
        const m = /^\{\{(\w+)\}\}$/.exec(part)
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>
        const key = m[1] as string
        return (
          <b key={i} className="mono rounded-xs bg-brand-50 px-1 text-brand-700">
            {values[key] ?? part}
          </b>
        )
      })}
    </p>
  )
}

/** Template detail: merge-field inserter, live preview, dirty-state bar, save/discard/delete (PC-5). Every control is always enabled — the tenant administrator is the only role here. */
export function TemplateView({ id }: { id: string }) {
  const ctx = useConsole()
  const router = useRouter()
  const run = useRun()
  const values = useSampleValues()
  const t: Template | undefined = ctx?.s.cfg.templates.find((x) => x.id === id)
  const [draft, setDraft] = React.useState<Draft | null>(t ? draftOf(t) : null)
  const [draftId, setDraftId] = React.useState(t?.id)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null)

  // Reset the local edit buffer when a different template is opened.
  if (t && t.id !== draftId) {
    setDraft(draftOf(t))
    setDraftId(t.id)
  }

  if (!ctx) return null
  // Once loaded, its own successful delete removes it from cfg.templates one
  // render before the redirect to the list takes effect — render nothing
  // rather than treating that as "this id never existed".
  if (!t && draftId === id) return null
  if (!t || !draft) notFound()
  const dirty = draft.usedFor !== t.usedFor || draft.retention !== t.retention || draft.body !== t.body
  const fields = TPL_FIELDS[t.id] ?? []

  function insert(field: string) {
    const el = bodyRef.current
    const token = `{{${field}}}`
    if (el && document.activeElement === el) {
      const start = el.selectionStart ?? draft!.body.length
      const end = el.selectionEnd ?? start
      const body = draft!.body.slice(0, start) + token + draft!.body.slice(end)
      setDraft({ ...draft!, body })
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start + token.length, start + token.length)
      })
    } else {
      setDraft({ ...draft!, body: draft!.body + token })
    }
  }

  return (
    <>
      <div className="mb-2.5 text-[12.5px] text-muted-foreground">
        <Link href="/config/templates" className="text-muted-foreground no-underline hover:text-strong">
          Documents and templates
        </Link>{" "}
        / {t.name}
      </div>
      <PageHeader eyebrow="Configuration" title={t.name} description={`Used for ${t.usedFor} · retained ${t.retention}.`} />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-paper px-4 py-3">
        <VersionBadge status="Published" version={t.version} />
        <span className="min-w-[200px] flex-1 text-sm text-muted-foreground">
          {dirty ? `Unsaved changes. Saving publishes a new version immediately; documents already generated keep ${t.version}.` : "Editing creates a new version; documents already generated keep the version they were generated from."}
        </span>
        {dirty ? (
          <>
            <CfgButton onClick={() => setDraft(draftOf(t))}>Discard changes</CfgButton>
            <CfgButton
              variant="primary"
              onClick={async () => {
                const r = await run(saveTemplate(t.id, draft))
                if (r.ok) setDraft(draftOf({ ...t, ...draft, version: t.version }))
              }}
            >
              Save as new version
            </CfgButton>
          </>
        ) : (
          <CfgButton variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete template
          </CfgButton>
        )}
      </div>
      <Split
        main={
          <>
            <Section>
              <div className="mb-3 grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
                <div className="grid gap-[5px]">
                  <Label htmlFor="tpl-used">Used for</Label>
                  <Input id="tpl-used" value={draft.usedFor} onChange={(e) => setDraft({ ...draft, usedFor: e.target.value })} />
                </div>
                <div className="grid gap-[5px]">
                  <Label htmlFor="tpl-ret">Retention</Label>
                  <Input id="tpl-ret" value={draft.retention} onChange={(e) => setDraft({ ...draft, retention: e.target.value })} />
                </div>
              </div>
            </Section>
            <Section title="Template body">
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {fields.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insert(f)}
                    className="rounded-md border border-border-strong bg-paper px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-g-50"
                  >
                    + {`{{${f}}}`}
                  </button>
                ))}
              </div>
              <textarea
                ref={bodyRef}
                aria-label="Template body"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                className="min-h-[240px] w-full rounded-lg border border-border-strong bg-paper px-3 py-2.5 font-mono text-[13px] leading-relaxed"
              />
            </Section>
          </>
        }
        side={
          <Section title="Live preview">
            <DocPaper title={t.name} sub="Sample case · merge fields highlighted">
              <MergePreview body={draft.body} values={values} />
            </DocPaper>
            <p className="mt-2.5 mb-0 text-[11.5px] text-muted-foreground">Filled in with a sample case so merge fields are easy to spot; the real document uses the case it’s generated for.</p>
          </Section>
        }
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${t.name}?`}
        description="Blocked while any open loan's documents still reference it. This can’t be undone."
        okLabel="Delete"
        danger
        onConfirm={async () => {
          const r = await run(deleteTemplate(t.id))
          if (!r.ok) return r.error
          router.push("/config/templates")
        }}
      />
    </>
  )
}
