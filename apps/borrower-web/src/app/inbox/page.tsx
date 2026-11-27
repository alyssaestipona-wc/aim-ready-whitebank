"use client"

import * as React from "react"
import Link from "next/link"
import { EmptyState, Pager, StatusPill, cn, paginate } from "@aim-ready/ui"

import { PageSkeleton, PageTitle } from "@/components/portal"
import { inboxItems, useBorrowerState, currentBorrower } from "@/mock"

const PAGE_SIZE = 8

export default function InboxPage() {
  const state = useBorrowerState()
  const [page, setPage] = React.useState(1)
  if (!state || !currentBorrower(state)) return <PageSkeleton />
  const items = inboxItems(state)
  const pg = paginate(items, page, PAGE_SIZE)
  return (
    <div>
      <PageTitle title="Inbox" />
      {items.length ? (
        <>
          <ul className="m-0 list-none p-0">
            {pg.rows.map((i, n) => (
              <li key={`${pg.page}-${n}`}>
                <Link
                  href={i.href}
                  className={cn("mb-3 block rounded-3xl border bg-paper p-4 text-left text-text no-underline", i.action ? "border-ink" : "border-border")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="font-semibold text-strong">{i.title}</b>
                    {i.action && <StatusPill tone="warn">Action</StatusPill>}
                  </div>
                  <div className="mt-1 text-[12.5px] text-muted-foreground">
                    {i.detail}
                    {i.due ? ` · due ${i.due}` : ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-border bg-paper">
            <Pager page={pg} onPage={setPage} className="border-t-0" />
          </div>
        </>
      ) : (
        <EmptyState className="pt-[60px]" title="No messages" hint="Updates about your loan show up here." />
      )}
    </div>
  )
}
