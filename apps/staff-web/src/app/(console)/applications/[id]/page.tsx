"use client"

import { Button, ConfirmDialog, cn } from "@aim-ready/ui"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import * as React from "react"

import { Note, SlaBadge, Split, StagePill } from "@/components/bits"
import { ActionsCard } from "@/components/case/actions-card"
import { CaseDocumentViewer } from "@/components/case/doc-preview"
import { BureauCard, ChecksCard, CoreCard, DecisionCard, DocsCard, HistoryCard, RulesCard, StatementCard } from "@/components/case/sections"
import { useConsole } from "@/components/use-console"
import { STAGES, findApp, peso, prodName, revealGovId, type Application } from "@/mock"

/** Case IDs whose government ID was revealed this session. */
const revealed = new Set<string>()

const TRACK_MAP: Partial<Record<Application["stage"], Application["stage"]>> = { "Info requested": "Review", Committee: "Approval", "Pending checker": "Booking", Draft: "Submitted" }

function Track({ a }: { a: Application }) {
  const stop = a.stage === "Declined" || a.stage === "Withdrawn"
  const steps = stop ? ["Submitted", "Checks", "Decision", a.stage] : STAGES
  const ci = STAGES.indexOf(TRACK_MAP[a.stage] ?? a.stage)
  return (
    <ol aria-label="Stage tracker" className="my-5 flex list-none items-start overflow-x-auto p-0 pb-1">
      {steps.map((st, i) => {
        const state = stop ? (i < 3 ? "done" : "stop") : i < ci ? "done" : i === ci ? "cur" : "todo"
        return (
          <li
            key={st}
            aria-current={state === "cur" ? "step" : undefined}
            className={cn(
              "relative min-w-[92px] flex-1 pt-[18px] text-xs font-medium text-subtle",
              "before:absolute before:top-1 before:left-0 before:z-[1] before:size-[9px] before:rounded-full before:border-2 before:border-g-300 before:bg-paper before:content-['']",
              "after:absolute after:top-2 after:right-0 after:left-[9px] after:h-0.5 after:bg-g-200 after:content-[''] last:after:hidden",
              state === "done" && "text-ink-4 before:border-ink before:bg-ink after:bg-ink",
              state === "cur" && "font-semibold text-strong before:border-brand before:bg-brand before:shadow-[0_0_0_4px_var(--brand-100)]",
              state === "stop" && "font-semibold text-ink before:border-ink before:shadow-[inset_0_0_0_2px_var(--ink)]"
            )}
          >
            {st}
          </li>
        )
      })}
    </ol>
  )
}

export default function CasePage() {
  const ctx = useConsole()
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = React.useState<{ name: string; status: string } | null>(null)
  const [dialog, setDialog] = React.useState<null | "reveal" | "record">(null)
  const [, force] = React.useReducer((n: number) => n + 1, 0)
  if (!ctx) return null
  const { role, s } = ctx
  const a = findApp(s, id)
  if (!a) notFound()
  const rev = revealed.has(a.id)
  const gov = a.govId || "PSN-0000-0000-0000"

  const trig =
    a.outcome === "decline" ? (
      <Note tone="bad">
        <b>Auto-declined.</b> {a.trigger}. The borrower sees a plain-language decline with no internal score.
      </Note>
    ) : a.outcome === "refer" && a.trigger ? (
      <Note tone="warn">
        <b>Referred to human review.</b> {a.trigger}.
      </Note>
    ) : a.outcome === "approve" ? (
      <Note tone="ok">
        <b>Auto-approved.</b> Score {a.score} ({a.grade}) in the auto-approve band; every policy rule passed.
      </Note>
    ) : null

  const record: Array<[string, string]> = [
    ["decision_id", `DR-${a.id.slice(4)}-01`],
    ["outcome", a.decision?.outcome || a.outcome || "not decided"],
    ["score", a.score == null ? "not scored" : String(a.score)],
    ["grade", a.grade || "—"],
    ["probability_of_default", a.pd ? `${a.pd}%` : "—"],
    ["rule_set", a.decision?.ruleSetVersion || a.ruleset],
    ["model", a.decision?.modelVersion || a.model],
    ["config_version", a.version],
    ["inputs.amount", peso(a.decision ? a.decision.inputs.amount : a.amount)],
    ["inputs.tenor", `${a.tenor} months`],
    ["inputs.declared_income", peso(a.income ?? 0)],
    ["inputs.bureau", a.bureau ? `${a.bureau.provider} · ${a.bureau.file}` : "none"],
    ["rules", a.rules.map((r) => `${r.id}:${{ p: "pass", f: "fail", w: "warn" }[r.res]}`).join(", ") || "—"],
    ["trigger", a.decision?.trigger || a.trigger || "—"],
    ["recorded_at", a.decision?.decidedAt || (a.hist[1] ? a.hist[1].when : a.created)],
  ]

  return (
    <>
      <div className="mb-2.5 text-[12.5px] text-muted-foreground">
        <Link href="/applications" className="text-muted-foreground no-underline hover:text-strong">
          Applications
        </Link>{" "}
        / <span className="mono">{a.id}</span>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] tracking-[-0.03em]">
            {a.name}
            <span className="ml-2.5 rounded-xs border border-border bg-paper px-[7px] py-0.5 align-[4px] font-mono text-xs font-medium text-muted-foreground">{a.id}</span>
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-[18px] gap-y-1 text-sm text-muted-foreground">
            <span>
              <b className="font-semibold text-strong">{prodName(a.product)}</b> · {peso(a.amount)} over {a.tenor} months
            </span>
            <span>{a.channel}</span>
            <span>Created {a.created}</span>
            {a.cif ? <span className="mono">{a.cif}</span> : <span>New to bank</span>}
            <span>
              Gov ID <span className="mono">{rev ? gov : `PSN-••••-••••-${gov.slice(-4)}`}</span>{" "}
              {!rev && (
                <button type="button" className="border-0 bg-transparent p-0 text-brand-700 underline" onClick={() => setDialog("reveal")}>
                  Reveal
                </button>
              )}
            </span>
            <span>Config {a.version}</span>
            {a.owner && (
              <span>
                Owner <b className="font-semibold text-strong">{a.owner}</b>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StagePill stage={a.stage} /> <SlaBadge hours={a.sla} />
          <Button size="sm" onClick={() => setDialog("record")}>
            Decision record
          </Button>
        </div>
      </div>
      <Track a={a} />
      {trig}
      <Split
        main={
          <>
            <DecisionCard s={s} a={a} />
            <RulesCard a={a} />
            <StatementCard a={a} />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <BureauCard a={a} />
              <CoreCard a={a} />
            </div>
            <ChecksCard a={a} />
          </>
        }
        side={
          <>
            <ActionsCard s={s} a={a} role={role} />
            <DocsCard a={a} onOpen={setDoc} />
            <HistoryCard key={a.id} a={a} />
          </>
        }
      />
      <CaseDocumentViewer s={s} a={a} doc={doc} revealed={rev} onClose={() => setDoc(null)} />
      <ConfirmDialog
        open={dialog === "reveal"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Reveal government ID?"
        description="The full number is shown to you, and the reveal is written to the audit log."
        okLabel="Reveal"
        onConfirm={async () => {
          revealed.add(a.id)
          await revealGovId(a.id)
          force()
        }}
      />
      <ConfirmDialog open={dialog === "record"} onOpenChange={(o) => !o && setDialog(null)} title={`Decision record · ${a.id}`} description="Immutable. Every input, version and outcome is stored so the decision can be reproduced later." okLabel="Close" noCancel onConfirm={() => undefined}>
        <div className="overflow-hidden rounded-lg border border-border font-mono text-xs font-medium">
          {record.map(([k, v]) => (
            <div key={k} className="border-t border-border-soft px-[11px] py-1.5 first:border-t-0">
              <span className="text-muted-foreground">{k}</span> = {v}
            </div>
          ))}
        </div>
      </ConfirmDialog>
    </>
  )
}
