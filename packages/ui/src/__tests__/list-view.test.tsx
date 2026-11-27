import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ListView, type ListFilterDef } from "../components/list-view"

type Row = { id: string; name: string; stage: string }
const rows: Row[] = Array.from({ length: 45 }, (_, i) => ({ id: `APP-${2000 + i}`, name: `Applicant ${i + 1}`, stage: i % 3 === 0 ? "Review" : "Offer" }))
const filters: ListFilterDef<Row>[] = [{ key: "stage", label: "Stage", options: [["Review", "Review"], ["Offer", "Offer"]], test: (r, v) => r.stage === v }]

function setup() {
  return render(
    <ListView
      items={rows}
      columns={[{ header: "Applicant", cell: (r) => r.name }, { header: "Case", cell: (r) => r.id }]}
      rowKey={(r) => r.id}
      searchText={(r) => `${r.name} ${r.id}`}
      searchPlaceholder="Search name or case ID"
      filters={filters}
      label="Applications"
    />
  )
}

const bodyRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1)

describe("ListView", () => {
  it("shows 10 rows and the range text", () => {
    setup()
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByText("Showing 1–10 of 45")).toBeInTheDocument()
  })

  it("changes page", async () => {
    setup()
    await userEvent.click(screen.getByRole("button", { name: "2" }))
    expect(screen.getByText("Showing 11–20 of 45")).toBeInTheDocument()
    expect(screen.getByText("Applicant 11")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page")
  })

  it("returns to page 1 when a filter changes", async () => {
    setup()
    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByText("Showing 21–30 of 45")).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "Review")
    expect(screen.getByText("Showing 1–10 of 15")).toBeInTheDocument()
  })

  it("shows No matches and clears", async () => {
    setup()
    await userEvent.type(screen.getByRole("searchbox", { name: "Search name or case ID" }), "zzz")
    expect(screen.getByText("No matches")).toBeInTheDocument()
    expect(screen.getByText("Try a different search or clear the filters.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(bodyRows()).toHaveLength(10)
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument()
  })

  it("shows the empty message when there are no items", () => {
    render(<ListView items={[]} columns={[]} rowKey={() => ""} searchText={() => ""} searchPlaceholder="Search" emptyMessage="No notifications" />)
    expect(screen.getByText("No notifications")).toBeInTheDocument()
  })
})
