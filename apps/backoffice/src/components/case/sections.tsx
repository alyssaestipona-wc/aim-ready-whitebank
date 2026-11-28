"use client"

import { Card, EmptyState, ListToolbar, Pager, StatusPill, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn, filterList, paginate, useListState, type ListFilterDef } from "@aim-ready/ui"
import { FileText } from "lucide-react"

import { peso, roleOf, type Application, type HistEntry, type StaffState } from "@/mock"

import { CoreLabel, GradeBadge, KeyValues, MessageChip, Rows, Section, SectionLabel } from "../bits"
import { docKind } from "./doc-preview"

const SIMULATED_PIPELINE = "Simulated decision pipeline: rules, score and bands run in the prototype’s mock engine, not the production model."

const SCALE_MIN = 450
const SCALE_MAX = 820
const pct = (v: number) => (((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100).toFixed(1)

/** Score, grade, band scale, PD, versions and top reasons. */
export function DecisionCard({ s, a }: { s: StaffState; a: Application }) {
  if (!a.score) {
    return (
      <Section title="Decision summary">
        <p className="m-0 text-muted-foreground">{a.outcome === "decline" ? "Not scored: a policy knockout ended the pipeline before scoring." : "Not decided yet. The pipeline runs when the application is submitted."}</p>
        {a.outcome && <p className="mt-3 mb-0 text-xs text-muted-foreground">{SIMULATED_PIPELINE}</p>}
      </Section>
    )
  }
  const b = a.bands || s.cfg.bands
  return (
    <Section title="Decision summary" tag="Score returned in 1.4 s">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-4xl leading-none font-semibold tracking-[-0.03em] text-strong tabular-nums">{a.score}</span>
        <GradeBadge grade={a.grade} />
        <div className="min-w-[180px] flex-1">
          <div
            data-slot="band-scale"
            className="relative my-2 h-1.5 rounded-full bg-[linear-gradient(90deg,var(--g-300)_0,var(--g-300)_var(--d),var(--g-150)_var(--d),var(--g-150)_var(--a),var(--brand-soft)_var(--a),var(--brand-soft)_100%)]"
            style={{ "--d": `${pct(b.decline)}%`, "--a": `${pct(b.approve)}%`, "--s": `${pct(a.score)}%` } as React.CSSProperties}
          >
            <i aria-hidden="true" className="absolute -top-[5px] left-(--s) -ml-px h-4 w-[3px] rounded-[2px] bg-ink" />
          </div>
          <small className="text-muted-foreground">
            Rule set {a.ruleset}: decline below {b.decline} · refer {b.decline}–{b.approve - 1} · approve {b.approve}+
          </small>
        </div>
        <div className="min-w-[150px]">
          <Rows
            rows={[
              ["Probability of default", `${a.pd}%`],
              ["Model", <span key="m" className="mono">{a.model}</span>],
              ["Rule set", <span key="r" className="mono">{a.ruleset}</span>],
            ]}
          />
        </div>
      </div>
      <SectionLabel>Top reasons</SectionLabel>
      {a.reasons.map((r) => (
        <span
          key={r.t}
          className={cn("my-[3px] mr-[5px] inline-flex items-center gap-1.5 rounded-[7px] border px-[9px] py-[3px] text-xs", r.pos ? "border-brand-100 bg-brand-50 text-brand-700" : "border-g-300 bg-g-100 text-ink-3")}
        >
          {r.pos ? "+" : "−"} {r.t}
        </span>
      ))}
      {a.aiRec && (
        <MessageChip className="mt-3.5">
          <span className="text-muted-foreground">AI recommendation</span>
          <b>
            {a.aiRec.decision === "approve" ? "Approve" : "Decline"} {peso(a.aiRec.amount)} over {a.aiRec.tenor} months
          </b>
        </MessageChip>
      )}
      <p className="mt-3 mb-0 text-xs text-muted-foreground">{SIMULATED_PIPELINE}</p>
    </Section>
  )
}

const RES_ICON = { p: "✓", f: "✕", w: "!" } as const
const RES_TONE = { p: "bg-brand-50 text-brand-700", f: "bg-ink text-white", w: "bg-g-100 text-ink-3" } as const

export function RulesCard({ a }: { a: Application }) {
  if (!a.rules.length) return null
  return (
    <Section title="Policy rule results" tag={`Rule set ${a.ruleset} · knockouts first`}>
      {a.rules.map((r) => (
        <RuleRow key={r.id} res={r.res} label={r.name} value={r.val} />
      ))}
    </Section>
  )
}

export function RuleRow({ res, label, value }: { res: "p" | "f" | "w"; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-border-soft py-[9px] text-sm first:border-t-0 first:pt-0.5">
      <span aria-label={res === "p" ? "Pass" : res === "f" ? "Fail" : "Warning"} className={cn("flex size-5 flex-none items-center justify-center rounded-full text-[11px] font-semibold", RES_TONE[res])}>
        {RES_ICON[res]}
      </span>
      {label}
      <span className="ml-auto text-right font-mono text-xs font-medium text-muted-foreground">{value}</span>
    </div>
  )
}

export function StatementCard({ a }: { a: Application }) {
  const t = a.stmt
  if (!t) return null
  return (
    <Section title="Bank statement analysis" tag="3 statements · analysed on upload">
      <KeyValues
        items={[
          ["Salary or business credits", `${peso(t.salary)} monthly, ${t.months} of 3 months`],
          ["Recurring obligations", `${peso(t.obligations)} monthly`],
          ["Average daily balance", peso(t.adb)],
          ["Returned items", String(t.returned)],
          ["Recommended amount", <b key="r">{peso(a.recDefault ?? a.amount)}</b>],
        ]}
      />
    </Section>
  )
}

export function BureauCard({ a }: { a: Application }) {
  const b = a.bureau
  if (!b) {
    return (
      <Section title="Credit bureau">
        <p className="m-0 text-muted-foreground">{a.bureauDown ? "Bureau unavailable at decision time. Pull it again before recommending." : "No bureau pull."}</p>
      </Section>
    )
  }
  return (
    <Section title="Credit bureau">
      <KeyValues items={[["Provider", b.provider], ["File", b.file], ["Bureau score", b.score == null ? "—" : String(b.score)], ["Trade lines", String(b.lines)], ["Utilisation", b.util], ["Delinquencies", b.delinq]]} />
    </Section>
  )
}

export function CoreCard({ a }: { a: Application }) {
  const c = a.core
  if (!c) {
    return (
      <Section title="Relationship">
        <p className="m-0 text-muted-foreground">New to bank: no deposit or loan history with Kalinaw.</p>
      </Section>
    )
  }
  return (
    <Section title="Relationship" tag={<CoreLabel />}>
      <KeyValues items={[["Customer since", String(c.since)], ["Deposit balance", peso(c.balance)], ["Inflows", c.inflow], ["Loans", c.loans]]} />
    </Section>
  )
}

export function ChecksCard({ a }: { a: Application }) {
  if (!a.checks.length) return null
  return (
    <Section title="Checks" flush>
      <Table aria-label="Checks">
        <TableHeader>
          <tr>
            <TableHead>Check</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Result</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {a.checks.map((c) => (
            <TableRow key={c[0]}>
              <TableCell>{c[0]}</TableCell>
              <TableCell className="text-muted-foreground">{c[1]}</TableCell>
              <TableCell>
                <StatusPill tone={/Pass|Clear|Low|Full/.test(c[2]) ? "ok" : /Match/.test(c[2]) ? "bad" : /Thin|Unavailable/.test(c[2]) ? "warn" : "neutral"}>{c[2]}</StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  )
}

/** Documents; anything not missing opens in the document viewer. */
export function DocsCard({ a, onOpen }: { a: Application; onOpen: (doc: { name: string; status: string }) => void }) {
  return (
    <Section title="Documents">
      {a.docs.map(([name, status], i) => {
        const miss = /Missing/.test(status)
        const kind = docKind(name)
        const inner = (
          <>
            <span className="flex h-[30px] w-[26px] flex-none items-center justify-center rounded-[5px] border border-border-strong bg-g-50 font-mono text-[8.5px] font-semibold text-muted-foreground">{kind.tag}</span>
            <span>
              {name}
              {!miss && <span className="ml-2 text-xs text-brand-700 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">View</span>}
            </span>
            <span className="ml-auto">
              <StatusPill tone={/Verified|Signed|Acknowledged/.test(status) ? "ok" : miss ? "bad" : /mismatch/.test(status) ? "warn" : "info"}>{status}</StatusPill>
            </span>
          </>
        )
        const cls = "flex w-full items-center gap-2.5 border-t border-border-soft py-[9px] text-left text-sm first:border-t-0 first:pt-0.5"
        return miss ? (
          <div key={`${name}-${i}`} className={cls}>
            {inner}
          </div>
        ) : (
          <button key={`${name}-${i}`} type="button" aria-label={`View ${name}`} onClick={() => onOpen({ name, status })} className={cn(cls, "group cursor-pointer rounded-xs border-x-0 border-b-0 bg-transparent hover:bg-g-50")}>
            {inner}
          </button>
        )
      })}
      {!a.docs.length && (
        <p className="m-0 flex items-center gap-2 text-muted-foreground">
          <FileText className="size-4" aria-hidden="true" /> No documents yet.
        </p>
      )}
    </Section>
  )
}

type Who = "system" | "staff" | "borrower"
const whoOf = (h: HistEntry): Who => (h.who === "System" ? "system" : roleOf(h.who) === "Borrower" ? "borrower" : "staff")
const ACTOR_FILTER: ListFilterDef<HistEntry>[] = [{ key: "who", label: "Actor", options: [["system", "System"], ["staff", "Staff"], ["borrower", "Borrower"]], test: (h, v) => whoOf(h) === v }]

/** Activity history, newest first, 8 per page with an actor filter. */
export function HistoryCard({ a }: { a: Application }) {
  const list = a.hist.slice().reverse()
  const ls = useListState()
  const filtered = filterList(list, ls.state.query, (h) => `${h.who} ${h.what}`, ACTOR_FILTER, ls.state.filters)
  const page = paginate(filtered, ls.state.page, 8)
  return (
    <Card>
      <div className="flex items-center justify-between gap-2.5 border-b border-border-soft px-[18px] py-[13px]">
        <h3 className="text-base font-semibold">Activity history</h3>
        <span className="text-xs text-muted-foreground">{list.length} events</span>
      </div>
      <ListToolbar list={ls} filters={ACTOR_FILTER} searchPlaceholder="Search activity" />
      {page.rows.length ? (
        <ul aria-label="Activity history" className="m-0 list-none px-[18px] pt-3.5 pb-0.5">
          {page.rows.map((h, i) => (
            <li
              key={`${h.when}-${i}`}
              className="relative pb-[13px] pl-[18px] text-[12.5px] before:absolute before:top-1.5 before:left-[3px] before:size-[7px] before:rounded-full before:bg-ink before:content-[''] after:absolute after:top-[15px] after:bottom-0 after:left-1.5 after:w-px after:bg-border after:content-[''] last:after:hidden"
            >
              <b className="font-semibold text-strong">{h.who}</b> · {h.what}
              <small className="block text-xs text-subtle">{h.when}</small>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No matches" hint="Try a different search or clear the filters." />
      )}
      <Pager page={page} onPage={ls.setPage} />
    </Card>
  )
}
