"use client"

import { Button, ConfirmDialog, Input, Label, ListView, NativeSelect, NativeSelectOption, PageHeader, StatusPill, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn, type ListFilterDef } from "@aim-ready/ui"
import * as React from "react"

import { CfgButton, CheckRow, DraftBar, SimulatedCheckNote, TabBar, Toggle, Track, VersionBadge, useRun } from "@/components/admin/bits"
import { OutcomePill, Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import {
  addDraftRule,
  canConfigure,
  canPublishRuleSet,
  createRuleDraft,
  discardRuleDraft,
  harness,
  isClosed,
  isReadOnly,
  LOCKED_TRIGGERS,
  me,
  publishRuleSet,
  setDraftBand,
  setDraftDti,
  submitRuleDraft,
  toggleDraftRule,
  toggleDraftTrigger,
  type TriggerKey,
} from "@/mock"

type Tab = "pipeline" | "rules" | "bands" | "triggers" | "reasons" | "harness" | "diff"

const TRIG: Array<[TriggerKey, string]> = [
  ["grey", "Score in referral band"], ["limit", "Amount above auto-approval limit"], ["thin", "Thin file or no bureau hit"], ["mismatch", "Declared vs verified income mismatch"],
  ["dti", "Debt-to-income above cap"], ["fraud", "Fraud or identity flag"], ["related", "Related-party or insider applicant"], ["confidence", "Missing data or low model confidence"],
]

const RC: Array<[string, string, string, string]> = [
  ["R01", "Thin bureau file", "We couldn’t confirm enough credit history.", "Active"], ["R02", "Debt-to-income above cap", "Your current repayments are high compared with your income.", "Active"], ["R03", "Declared income differs from payslip", "We couldn’t verify the income you declared.", "Active"], ["R04", "Recent missed payment on another loan", "Your recent repayment history doesn’t meet our requirements.", "Active"],
  ["R05", "Amount above verified capacity", "The amount is more than we can offer on your verified income.", "Active"], ["R06", "Unable to verify identity", "We couldn’t verify your identity.", "Active"], ["R07", "Employer not on approved list", "We couldn’t verify your employer.", "Retired"], ["R08", "Too many recent credit applications", "You have applied for several loans recently.", "Active"],
  ["R09", "Policy knockout", "Your application doesn’t meet our lending requirements.", "Active"], ["R10", "Incomplete documents", "We didn’t receive the documents we needed in time.", "Active"], ["R11", "Existing loan in arrears", "You have an existing loan with missed payments.", "Active"], ["R12", "Length of employment too short", "You haven’t been with your employer long enough yet.", "Retired"],
]

const RC_FILTERS: ListFilterDef<(typeof RC)[number]>[] = [{ key: "st", label: "Status", options: [["Active", "Active"], ["Retired", "Retired"]], test: (r, v) => r[3] === v }]

type Cond = { attr: "dti" | "years" | "amount" | "age" | "score"; op: ">" | "<" | "="; val: string }

export default function DecisioningPage() {
  const ctx = useConsole()
  const run = useRun()
  const [tab, setTab] = React.useState<Tab>("rules")
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [ruleOpen, setRuleOpen] = React.useState(false)
  const [rule, setRule] = React.useState({ name: "New-to-bank applicants with high debt-to-income", type: "Referral trigger" as "Referral trigger" | "Knockout", logic: "AND" as "AND" | "OR" })
  const [conds, setConds] = React.useState<Cond[]>([
    { attr: "dti", op: ">", val: "35" },
    { attr: "years", op: "<", val: "1" },
  ])
  const state = ctx?.s
  const live = React.useMemo(() => (state ? harness(state, state.cfg.rules, state.cfg.bands) : null), [state])
  if (!ctx || !live) return null
  const { role, s } = ctx
  const C = s.cfg
  const D = C.draft
  const can = canConfigure(role)
  const ro = isReadOnly(role)
  const editing = !!D && !C.ruleset.inReview && can
  const rls = D ? D.rules : C.rules
  const bands = D ? D.bands : C.bands
  const trg = D ? D.triggers || C.triggers : C.triggers
  const status = D ? (C.ruleset.inReview ? "In review" : "Draft") : "Published"
  const nv = `v${Number(C.ruleset.pub.slice(1)) + 1}`
  const mine = C.ruleset.author === me(role).name
  const tabNow: Tab = tab === "diff" && !D ? "rules" : tab
  const inflight = s.apps.filter((a) => !isClosed(a)).length
  const pct = (v: number) => ((v - 450) / 370) * 100

  const diff: Array<{ plus: boolean; text: string }> = []
  if (D) {
    for (const n of D.rules) {
      const r = C.rules.find((x) => x.id === n.id)
      if (!r) {
        diff.push({ plus: true, text: `+ New rule: ${n.name}` })
        continue
      }
      if (r.param !== n.param) diff.push({ plus: false, text: `− ${r.name}: ${r.param}%` }, { plus: true, text: `+ ${n.name}: ${n.param}%` })
      if (r.active !== n.active) diff.push({ plus: n.active, text: `${n.active ? "+" : "−"} ${n.name}: ${n.active ? "active" : "inactive"}` })
    }
    for (const k of ["approve", "decline"] as const) if (C.bands[k] !== D.bands[k]) diff.push({ plus: false, text: `− ${k} band: ${C.bands[k]}` }, { plus: true, text: `+ ${k} band: ${D.bands[k]}` })
    for (const [k, label] of TRIG) if (D.triggers && D.triggers[k] !== C.triggers[k]) diff.push({ plus: D.triggers[k], text: `${D.triggers[k] ? "+" : "−"} Trigger: ${label}` })
  }
  const dr = D ? harness(s, D.rules, D.bands, D.triggers) : null

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Decisioning" description="Policy rules, decision bands, referral triggers and reason codes. Every change is versioned and needs a second person to publish." />
      <DraftBar>
        <VersionBadge status="Published" version={C.ruleset.pub} />
        {D && <VersionBadge status={status} version={nv} />}
        <span className="min-w-[200px] flex-1 text-sm text-muted-foreground">
          {D
            ? C.ruleset.inReview
              ? `Submitted by ${C.ruleset.author}. ${C.ruleset.author === "Jonas Mercado" ? "Rafael Cruz" : "Jonas Mercado"} approves.`
              : `Editing a draft. Live decisions still use ${C.ruleset.pub}.`
            : "Credit risk or the tenant administrator drafts; the other approves. Changes apply to new applications only."}
        </span>
        {!D && (
          <CfgButton readOnly={ro} disabled={!can} onClick={() => run(createRuleDraft())}>
            Create draft
          </CfgButton>
        )}
        {D && !C.ruleset.inReview && (
          <>
            <CfgButton readOnly={ro} disabled={!can} onClick={() => run(discardRuleDraft())}>
              Discard draft
            </CfgButton>
            <CfgButton readOnly={ro} disabled={!can} variant="primary" onClick={() => run(submitRuleDraft())}>
              Submit for review
            </CfgButton>
          </>
        )}
        {D && C.ruleset.inReview && (
          <>
            <CfgButton readOnly={ro} disabled={!can || mine} onClick={() => run(discardRuleDraft())}>
              Return to author
            </CfgButton>
            <CfgButton
              readOnly={ro}
              variant="primary"
              disabled={!can || mine}
              title={mine ? "You submitted this change; a different person must approve it" : undefined}
              onClick={async () => {
                const r = await run(canPublishRuleSet())
                if (r.ok) setPublishOpen(true)
              }}
            >
              Approve and publish
            </CfgButton>
          </>
        )}
        <SimulatedCheckNote />
      </DraftBar>
      <TabBar
        value={tabNow}
        onChange={setTab}
        items={[["pipeline", "Pipeline"], ["rules", "Rules"], ["bands", "Bands"], ["triggers", "Referral triggers"], ["reasons", "Reason codes"], ["harness", "Test harness"], ...(D ? ([["diff", "Draft changes"]] as const) : [])]}
      />

      {tabNow === "pipeline" && (
        <Section title="Decision pipeline">
          <Track steps={["Data gathering", "Policy rules", "AI score", "Decision bands", "Approve · refer · decline"]} current={4} />
          <p className="m-0 text-sm text-muted-foreground">The model recommends; the bank’s rules and bands decide. Knockouts end the pipeline before scoring. Every decision stores its inputs, rule set and model version.</p>
        </Section>
      )}

      {tabNow === "rules" && (
        <Section title="Policy rules" tag="Knockouts always run before the score" flush>
          <Table aria-label="Policy rules">
            <TableHeader>
              <tr>
                {["Rule", "Type", "Condition", "Active"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {rls.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <b className="font-semibold text-strong">{r.name}</b> {r.custom && <StatusPill tone="info">Custom</StatusPill>}
                    {r.locked && <span className="text-xs text-subtle"> · always on</span>}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={r.type === "Knockout" ? "bad" : "warn"}>{r.type}</StatusPill>
                  </TableCell>
                  <TableCell>
                    {r.id === "dti" ? (
                      editing ? (
                        <span className="inline-flex items-center gap-1">
                          <DtiInput value={r.param ?? 0} onCommit={(v) => run(setDraftDti(v))} /> %
                        </span>
                      ) : (
                        `dti > ${r.param}%`
                      )
                    ) : r.custom ? (
                      <span className="mono">{(r.conds ?? []).map((c) => `${c.attr} ${c.op} ${c.val}`).join(` ${r.logic} `)}</span>
                    ) : (
                      <span className="text-subtle">Built in</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Toggle on={r.active} label={`Toggle ${r.name}`} disabled={!editing || !!r.locked} title={ro ? "Read-only access" : undefined} onToggle={() => run(toggleDraftRule(i))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {editing && (
            <div className="border-t border-border-soft px-4 py-3">
              <Button size="sm" onClick={() => setRuleOpen(true)}>
                Add rule
              </Button>
            </div>
          )}
        </Section>
      )}

      {tabNow === "bands" && (
        <Section title="Decision bands · personal and salary loans">
          <div className="mb-3 grid gap-[5px]">
            <Label htmlFor="b-ap">Auto-approve at or above: {bands.approve}</Label>
            <input id="b-ap" type="range" min={620} max={780} step={5} value={bands.approve} disabled={!editing} onChange={(e) => run(setDraftBand("approve", Number(e.target.value)))} className="w-full accent-ink" />
          </div>
          <div className="mb-3 grid gap-[5px]">
            <Label htmlFor="b-dc">Auto-decline below: {bands.decline}</Label>
            <input id="b-dc" type="range" min={520} max={bands.approve - 5} step={5} value={bands.decline} disabled={!editing} onChange={(e) => run(setDraftBand("decline", Number(e.target.value)))} className="w-full accent-ink" />
          </div>
          <div aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-full">
            <BandSegment pct={pct(bands.decline)} className="bg-g-300" />
            <BandSegment pct={pct(bands.approve) - pct(bands.decline)} className="bg-g-150" />
            <span className="flex-1 bg-brand-soft" />
          </div>
          <p className="mt-2 mb-0 text-[12.5px] text-muted-foreground">
            Refer band is whatever sits between: {bands.decline}–{bands.approve - 1}. Approve can never be set below decline.
          </p>
        </Section>
      )}

      {tabNow === "triggers" && (
        <Section title="Referral triggers" tag={editing ? "Editing draft" : "Create a draft to change"}>
          {TRIG.map(([k, label]) => {
            const locked = LOCKED_TRIGGERS.includes(k)
            return (
              <CheckRow
                key={k}
                label={
                  <>
                    {label}
                    {locked && <span className="text-xs text-subtle"> · locked on</span>}
                  </>
                }
                value={<Toggle on={trg[k]} label={label} disabled={!editing || locked} onToggle={() => run(toggleDraftTrigger(k))} />}
              />
            )
          })}
        </Section>
      )}

      {tabNow === "reasons" && (
        <Section title="Reason codes" tag="Used codes are retired, never deleted" flush>
          <ListView
            label="Reason codes"
            items={RC}
            filters={RC_FILTERS}
            searchPlaceholder="Search code or wording"
            searchText={(r) => r.join(" ")}
            rowKey={(r) => r[0]}
            emptyMessage="No codes"
            columns={[
              { header: "Code", cell: (r) => <span className="mono">{r[0]}</span> },
              { header: "Staff wording", cell: (r) => r[1] },
              { header: "Borrower wording", cell: (r) => r[2] },
              { header: "Status", cell: (r) => <StatusPill tone={r[3] === "Active" ? "ok" : "neutral"}>{r[3]}</StatusPill> },
            ]}
          />
        </Section>
      )}

      {tabNow === "harness" && (
        <Section title="Test harness · 1,240 past personal loan applications" tag="Same sample, both versions" flush>
          <Table aria-label="Test harness">
            <TableHeader>
              <tr>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Published {C.ruleset.pub}</TableHead>
                {dr && <TableHead className="text-right">Draft {nv}</TableHead>}
                {dr && <TableHead className="text-right">Change</TableHead>}
              </tr>
            </TableHeader>
            <TableBody>
              {(["approve", "refer", "decline"] as const).map((k) => (
                <TableRow key={k}>
                  <TableCell>
                    <OutcomePill outcome={k} />
                  </TableCell>
                  <TableCell className="num text-right">{live[k]}</TableCell>
                  {dr && <TableCell className="num text-right font-semibold text-strong">{dr[k]}</TableCell>}
                  {dr && <TableCell className="num text-right">{`${dr[k] - live[k] > 0 ? "+" : ""}${dr[k] - live[k]}`}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!dr && <p className="m-0 px-4 py-3 text-sm text-muted-foreground">Create a draft to compare its outcomes with the published rule set.</p>}
        </Section>
      )}

      {tabNow === "diff" && D && (
        <Section title="Changes in this draft" tag={`${inflight} in-flight applications stay on ${C.ruleset.pub}`}>
          {diff.length ? (
            <div className="overflow-hidden rounded-lg border border-border font-mono text-xs font-medium">
              {diff.map((l, i) => (
                <div key={i} className={cn("border-t border-border-soft px-[11px] py-1.5 first:border-t-0", l.plus ? "bg-brand-50 text-brand-700" : "bg-g-100 text-g-600 line-through")}>
                  {l.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-muted-foreground">No changes yet.</p>
          )}
        </Section>
      )}

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`Publish rule set ${nv}?`}
        description={`New applications use it immediately. ${inflight} in-flight applications stay on ${C.ruleset.pub}.`}
        okLabel="Approve and publish"
        onConfirm={async () => {
          const r = await run(publishRuleSet())
          if (!r.ok) return r.error
        }}
      />

      <ConfirmDialog
        open={ruleOpen}
        onOpenChange={setRuleOpen}
        title="Add a rule"
        description="Build conditions on application, bureau, relationship or derived variables. The rule joins the draft; check the test harness before publishing."
        okLabel="Add to draft"
        onConfirm={async () => {
          const r = await addDraftRule({ name: rule.name, type: rule.type, logic: rule.logic, conds: conds.map((c) => ({ attr: c.attr, op: c.op, val: String(c.val).trim() === "" ? Number.NaN : Number(c.val) })) })
          if (!r.ok) return r.error
          await run(Promise.resolve(r))
        }}
      >
        <div className="mb-3 grid gap-[5px]">
          <Label htmlFor="nr-name">Rule name</Label>
          <Input id="nr-name" value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <div className="mb-3 grid gap-[5px]">
            <Label htmlFor="nr-type">Type</Label>
            <NativeSelect id="nr-type" value={rule.type} onChange={(e) => setRule({ ...rule, type: e.target.value as typeof rule.type })}>
              <NativeSelectOption>Referral trigger</NativeSelectOption>
              <NativeSelectOption>Knockout</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="mb-3 grid gap-[5px]">
            <Label htmlFor="nr-logic">Match</Label>
            <NativeSelect id="nr-logic" value={rule.logic} onChange={(e) => setRule({ ...rule, logic: e.target.value as typeof rule.logic })}>
              <NativeSelectOption value="AND">All conditions (AND)</NativeSelectOption>
              <NativeSelectOption value="OR">Any condition (OR)</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        {conds.map((c, i) => (
          <div key={i} className="grid grid-cols-3 gap-x-3">
            <div className="mb-3 grid gap-[5px]">
              <Label htmlFor={`nr-a${i}`}>Variable</Label>
              <NativeSelect id={`nr-a${i}`} value={c.attr} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, attr: e.target.value as Cond["attr"] } : x)))}>
                {["dti", "years", "amount", "age", "score"].map((v) => (
                  <NativeSelectOption key={v}>{v}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="mb-3 grid gap-[5px]">
              <Label htmlFor={`nr-o${i}`}>Operator</Label>
              <NativeSelect id={`nr-o${i}`} value={c.op} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, op: e.target.value as Cond["op"] } : x)))}>
                {[">", "<", "="].map((v) => (
                  <NativeSelectOption key={v}>{v}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="mb-3 grid gap-[5px]">
              <Label htmlFor={`nr-v${i}`}>Value</Label>
              <Input id={`nr-v${i}`} type="number" value={c.val} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, val: e.target.value } : x)))} />
            </div>
          </div>
        ))}
      </ConfirmDialog>
    </>
  )
}

/** One coloured stretch of the band scale; its width is data, passed as a CSS variable. */
function BandSegment({ pct, className }: { pct: number; className: string }) {
  return <span className={cn("w-(--w) flex-none", className)} style={{ "--w": `${Math.max(0, pct)}%` } as React.CSSProperties} />
}

/** DTI cap field: edits freely, commits on blur, and stays red while invalid. */
function DtiInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = React.useState(String(value))
  const n = text.trim() === "" ? Number.NaN : Number(text)
  const bad = !Number.isFinite(n) || n <= 0 || n > 100
  return (
    <Input
      aria-label="Debt-to-income cap"
      type="number"
      className="w-[76px] px-2 py-1"
      value={text}
      aria-invalid={bad || undefined}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (!bad) onCommit(n)
      }}
    />
  )
}
