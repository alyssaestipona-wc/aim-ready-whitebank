"use client"

import * as React from "react"
import { cn } from "cn"
import { SearchIcon } from "lucide-react"

import { filterList, paginate, rangeText, DEFAULT_PAGE_SIZE, type ListFilter, type Page } from "../lib/list"
import { EmptyState } from "./empty-state"
import { Button } from "./ui/button"
import { NativeSelect, NativeSelectOption } from "./ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

export type ListFilterDef<T> = ListFilter<T> & {
  label: string
  /** [value, label] pairs. */
  options: ReadonlyArray<readonly [string, string]>
}

export type ListState = { query: string; filters: Record<string, string>; page: number }

const EMPTY_STATE: ListState = { query: "", filters: {}, page: 1 }

/** Search, filter and page state. Changing search or a filter returns to page 1. */
function useListState(initial: Partial<ListState> = {}) {
  const [state, setState] = React.useState<ListState>({ ...EMPTY_STATE, ...initial })
  return {
    state,
    setQuery: (query: string) => setState((s) => ({ ...s, query, page: 1 })),
    setFilter: (key: string, value: string) => setState((s) => ({ ...s, filters: { ...s.filters, [key]: value }, page: 1 })),
    setPage: (page: number) => setState((s) => ({ ...s, page })),
    clear: () => setState(EMPTY_STATE),
    active: !!state.query || Object.values(state.filters).some(Boolean),
  }
}

/** "Showing A–B of N", Previous, numbered pages, Next. Hidden when empty. */
function Pager({ page, onPage, className }: { page: Page<unknown>; onPage: (page: number) => void; className?: string }) {
  if (!page.total) return null
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-2.5 border-t border-border-soft px-4 py-2.5 text-[12.5px] text-muted-foreground", className)}
    >
      <span>{rangeText(page)}</span>
      {page.pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button size="sm" disabled={page.page <= 1} onClick={() => onPage(page.page - 1)}>
            Previous
          </Button>
          {page.items.map((n, i) =>
            n === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-subtle">
                …
              </span>
            ) : (
              <Button
                key={n}
                size="sm"
                variant={n === page.page ? "primary" : "default"}
                className="min-w-[30px]"
                aria-current={n === page.page ? "page" : undefined}
                onClick={() => onPage(n)}
              >
                {n}
              </Button>
            )
          )}
          <Button size="sm" disabled={page.page >= page.pageCount} onClick={() => onPage(page.page + 1)}>
            Next
          </Button>
        </div>
      )}
    </nav>
  )
}

type ToolbarProps<T> = {
  list: ReturnType<typeof useListState>
  filters?: ReadonlyArray<ListFilterDef<T>>
  searchPlaceholder: string
}

/** Search box, filter selects and a "Clear filters" control. */
function ListToolbar<T>({ list, filters = [], searchPlaceholder }: ToolbarProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-soft px-4 py-3">
      <div className="relative max-w-[340px] flex-[1_1_220px]">
        <SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          value={list.state.query}
          onChange={(e) => list.setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          autoComplete="off"
          className="w-full rounded-md border border-input bg-paper py-1.5 pr-2.5 pl-8 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-100"
        />
      </div>
      {filters.map((f) => {
        const value = list.state.filters[f.key] ?? ""
        return (
          <NativeSelect key={f.key} size="sm" active={!!value} aria-label={f.label} value={value} onChange={(e) => list.setFilter(f.key, e.target.value)}>
            <NativeSelectOption value="">{f.label}: all</NativeSelectOption>
            {f.options.map(([v, label]) => (
              <NativeSelectOption key={v} value={v}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )
      })}
      {list.active && (
        <Button size="sm" variant="ghost" onClick={list.clear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

export type ListColumn<T> = {
  header: React.ReactNode
  cell: (item: T) => React.ReactNode
  className?: string
  headClassName?: string
}

type ListViewProps<T> = {
  items: readonly T[]
  columns: ReadonlyArray<ListColumn<T>>
  rowKey: (item: T) => string
  searchText: (item: T) => string
  searchPlaceholder: string
  filters?: ReadonlyArray<ListFilterDef<T>>
  pageSize?: number
  emptyMessage?: string
  onRowActivate?: (item: T) => void
  rowClassName?: (item: T) => string | undefined
  /** Accessible name for the table. */
  label?: string
}

/**
 * The kit's one list pattern: toolbar, table, empty state and pager. Search
 * and filters narrow the rows; changing either returns to page 1.
 */
function ListView<T>({
  items,
  columns,
  rowKey,
  searchText,
  searchPlaceholder,
  filters = [],
  pageSize = DEFAULT_PAGE_SIZE,
  emptyMessage = "Nothing here",
  onRowActivate,
  rowClassName,
  label,
}: ListViewProps<T>) {
  const list = useListState()
  const filtered = filterList(items, list.state.query, searchText, filters, list.state.filters)
  const page = paginate(filtered, list.state.page, pageSize)
  const narrowed = filtered.length !== items.length

  return (
    <div data-slot="list-view">
      <ListToolbar list={list} filters={filters} searchPlaceholder={searchPlaceholder} />
      {page.rows.length ? (
        <Table aria-label={label}>
          <TableHeader>
            <tr>
              {columns.map((c, i) => (
                <TableHead key={i} className={c.headClassName}>
                  {c.header}
                </TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {page.rows.map((item) => (
              <TableRow
                key={rowKey(item)}
                className={rowClassName?.(item)}
                onActivate={onRowActivate ? () => onRowActivate(item) : undefined}
              >
                {columns.map((c, i) => (
                  <TableCell key={i} className={c.className}>
                    {c.cell(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : narrowed ? (
        <EmptyState title="No matches" hint="Try a different search or clear the filters." />
      ) : (
        <EmptyState title={emptyMessage} />
      )}
      <Pager page={page} onPage={list.setPage} />
    </div>
  )
}

export { ListToolbar, ListView, Pager, useListState }
