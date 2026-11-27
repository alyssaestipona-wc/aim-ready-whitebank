import { render, screen } from "@testing-library/react"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { initialsOf } from "../components/avatar"
import { BarChart } from "../components/bar-chart"
import { DocPaper, DocSheet, DocumentViewer, IdCard } from "../components/document-viewer"
import { StatusPill } from "../components/status-pill"

describe("StatusPill", () => {
  it.each([
    ["ok", "bg-brand-50"],
    ["info", "bg-brand-50"],
    ["warn", "bg-g-100"],
    ["bad", "bg-ink"],
    ["neutral", "bg-paper"],
  ] as const)("%s uses only accent or neutral fills", (tone, cls) => {
    render(<StatusPill tone={tone}>{tone}</StatusPill>)
    const el = screen.getByText(tone)
    expect(el).toHaveClass(cls)
    expect(el.className).not.toMatch(/green|orange|emerald|amber/)
  })
})

describe("BarChart", () => {
  it("draws every bar in the accent, scaled to the largest value", () => {
    const { container } = render(<BarChart label="Funnel" data={[{ label: "Submitted", value: 200 }, { label: "Approved", value: 50, display: "25%" }]} />)
    const bars = container.querySelectorAll("[data-slot=bar]")
    expect(bars).toHaveLength(2)
    bars.forEach((b) => expect(b).toHaveClass("bg-brand"))
    expect(bars[0]).toHaveAttribute("data-pct", "100")
    expect(bars[1]).toHaveAttribute("data-pct", "25")
    expect(screen.getByText("25%")).toBeInTheDocument()
  })
})

describe("DocumentViewer", () => {
  const meta = { file: "gov_id_scan.jpg", version: 1, addedBy: "Juan Dela Cruz", retainUntil: "Closure + 5 years", status: "Verified", statusTone: "ok" as const }

  it("shows an ID card with file name and version", () => {
    render(
      <DocumentViewer open onOpenChange={() => {}} title="Government ID (PhilSys)" meta={meta}>
        <IdCard heading="Republic of the Philippines · Philippine identification card" initials="JD" fields={[{ label: "PSN", value: "PSN-••••-••••-1420", mono: true }]} />
      </DocumentViewer>
    )
    expect(screen.getByText("gov_id_scan.jpg")).toBeInTheDocument()
    expect(screen.getByText("v1")).toBeInTheDocument()
    expect(document.querySelector("[data-doc-kind=id]")).toBeInTheDocument()
  })

  it("renders paper and sheet kinds", () => {
    render(
      <>
        <DocPaper title="Loan agreement" sub="Template v5 · APP-2041" stamp="Signed">
          <p>Body</p>
        </DocPaper>
        <DocSheet header={["", "A · Name"]} rows={[{ cells: ["2", "Juan"], highlight: true }]} />
      </>
    )
    expect(screen.getByText("Signed")).toBeInTheDocument()
    expect(document.querySelector("[data-doc-kind=sheet]")).toBeInTheDocument()
  })
})

describe("Avatar", () => {
  it("takes the first two words' initials", () => {
    expect(initialsOf("Juan Dela Cruz")).toBe("JD")
    expect(initialsOf("Bea")).toBe("B")
  })
})

describe("typography", () => {
  it("the mono utility uses the Geist Mono font variable", () => {
    const css = readFileSync(join(__dirname, "../styles/theme.css"), "utf8")
    expect(css).toMatch(/--font-mono: var\(--font-geist-mono\)/)
    expect(css).toMatch(/@utility mono \{\s*font-family: var\(--font-mono\)/)
  })
})

describe("component source hygiene", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f)
      return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : []
    })
  }
  it("no hex colours or inline style values outside CSS custom properties", () => {
    for (const f of files(join(__dirname, "../components"))) {
      const src = readFileSync(f, "utf8")
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      for (const m of src.matchAll(/style=\{\{([^}]*)\}\}/g)) expect(m[1], f).toMatch(/^\s*"--[a-z-]+":/)
    }
  })
  it("never imports @aim-ready/core (ADR-0002)", () => {
    const src = [...files(join(__dirname, "../components")), join(__dirname, "../index.ts"), join(__dirname, "../lib/list.ts"), join(__dirname, "../lib/money-input-format.ts")]
    for (const f of src) {
      expect(readFileSync(f, "utf8"), f).not.toContain("@aim-ready/core")
    }
  })
})
