"use client"

import {
  Avatar,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  cn,
  useToast,
} from "@aim-ready/ui"
import { ChevronDown, Lock, LogOut, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import { LANDING, matchRoute, navFor, pathOf, type RouteKey } from "@/lib/access"
import { navigateHard } from "@/lib/navigation"
import { counts, isReadOnly, me, resetDemoData, setFlagsCookie, signOut } from "@/mock"

import { Brand } from "./brand"
import { NAV_ICON } from "./nav-icons"
import { NotificationBell } from "./notification-bell"
import { StaffStrip } from "./staff-strip"
import { useConsole } from "./use-console"

const DETAIL_PARENT: Record<string, RouteKey> = { case: "apps", product: "products" }

/** Placeholder while the simulated state loads from this browser. */
export function ShellSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex min-h-[calc(100vh-38px)]">
      <div className="hidden w-[244px] flex-none bg-ink min-[900px]:block" />
      <div className="flex-1 p-7">
        <div className="mb-4 h-7 w-64 animate-pulse rounded-md bg-g-150" />
        <div className="h-40 animate-pulse rounded-xl bg-g-100" />
      </div>
    </div>
  )
}

/** Sidebar, header and content frame for every signed-in staff page. */
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const ctx = useConsole()
  const pathname = usePathname()
  const router = useRouter()
  const toast = useToast()
  // The mobile menu is open for the page it was opened on, so navigating closes it.
  const [menuOpenAt, setMenuOpenAt] = React.useState<string | null>(null)
  const menuOpen = menuOpenAt === pathname
  const setMenuOpen = (open: boolean) => setMenuOpenAt(open ? pathname : null)
  const [resetOpen, setResetOpen] = React.useState(false)

  // Keep the server-visible flags cookie in step with this browser's state.
  const ai = ctx?.s.flags.ai
  React.useEffect(() => {
    if (ai !== undefined) setFlagsCookie({ ai })
  }, [ai])

  if (!ctx) {
    return (
      <>
        <StaffStrip />
        <ShellSkeleton />
      </>
    )
  }

  const { role, s } = ctx
  const u = me(role)
  const route = matchRoute(pathname)
  const current = route ? (DETAIL_PARENT[route.key] ?? route.key) : null
  const c = counts(s, role)
  const ro = isReadOnly(role)

  async function doSignOut() {
    await signOut()
    navigateHard("/sign-in")
  }

  const crumbs = route ? (
    route.param ? (
      <>
        <span>{route.group}</span>
        <span className="text-g-300">/</span>
        <Link href={route.key === "case" ? "/applications" : "/config/products"} className="text-muted-foreground no-underline">
          {route.label}
        </Link>
        <span className="text-g-300">/</span>
        <b className="font-semibold text-strong">{route.param}</b>
      </>
    ) : route.group ? (
      <>
        <span>{route.group}</span>
        <span className="text-g-300">/</span>
        <b className="font-semibold text-strong">{route.label}</b>
      </>
    ) : (
      <b className="font-semibold text-strong">WhiteBank Lending</b>
    )
  ) : (
    <b className="font-semibold text-strong">WhiteBank Lending</b>
  )

  return (
    <>
      <StaffStrip />
      <div className="flex min-h-[calc(100vh-38px)]">
        {menuOpen && <div aria-hidden="true" className="fixed inset-0 z-[250] bg-ink/40 min-[900px]:hidden" onClick={() => setMenuOpen(false)} />}
        <aside
          aria-label="Main navigation"
          className={cn(
            "fixed inset-y-0 left-0 z-[300] flex w-[244px] flex-none flex-col bg-ink text-white transition-transform min-[900px]:sticky min-[900px]:top-[38px] min-[900px]:z-auto min-[900px]:h-[calc(100vh-38px)] min-[900px]:translate-x-0",
            menuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Brand className="px-[18px] pt-5 pb-[18px]" />
          <nav className="flex-1 overflow-y-auto px-2.5 pb-3.5 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin]">
            {navFor(role, s.flags).map((g) => (
              <div key={g.group} className="mt-4">
                <p className="mx-2.5 mt-0 mb-1.5 text-2xs font-semibold tracking-[0.09em] text-white/40 uppercase">{g.group}</p>
                {g.items.map((it) => {
                  const Icon = NAV_ICON[it.key]
                  const on = it.key === current
                  const n = c[it.key]
                  return (
                    <Link
                      key={it.key}
                      href={it.path}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-sm font-medium no-underline",
                        on ? "bg-white text-ink" : "text-white/70 hover:bg-white/[0.07] hover:text-white"
                      )}
                    >
                      <Icon aria-hidden="true" className={cn("size-4 flex-none", on ? "text-ink" : "text-white/55")} />
                      <span className="min-w-0 flex-1 truncate">{it.label}</span>
                      {n ? (
                        <span className={cn("flex h-[18px] min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-2xs font-semibold text-white", on ? "bg-ink" : "bg-white/[0.12]")}>{n}</span>
                      ) : ro && g.group === "Configuration" ? (
                        <span className="text-[9.5px] font-semibold tracking-[0.06em] text-white/45 uppercase">View</span>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
          <div className="mx-2.5 flex items-center gap-2.5 border-t border-white/10 px-2 py-3">
            <Avatar name={u.name} tone="sidebar" />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[12.5px] font-semibold">{u.name}</b>
              <small className="block truncate text-[11px] text-white/50">{u.title}</small>
            </div>
            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={doSignOut}
              className="flex size-8 flex-none items-center justify-center rounded-md border border-white/15 bg-transparent p-0 text-white/70 hover:bg-white/[0.08] hover:text-white"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="px-[18px] pt-0.5 pb-4 text-[11px] text-white/40">
            Prototype · sample data ·{" "}
            <button type="button" className="border-0 bg-transparent p-0 text-[11px] text-white/60 underline" onClick={() => setResetOpen(true)}>
              Reset demo data
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-[38px] z-50 flex items-center gap-3 border-b border-border bg-white/95 px-4 py-2.5 min-[900px]:px-7">
            <Button variant="default" size="icon" className="min-[900px]:hidden" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu />
            </Button>
            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 overflow-hidden text-sm whitespace-nowrap text-muted-foreground min-[900px]:flex">
              {crumbs}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Account" className="flex items-center gap-2 rounded-full border border-border bg-paper py-[3px] pr-2.5 pl-[3px] text-sm font-medium text-strong">
                    <Avatar name={u.name} tone="ink" size="sm" />
                    <span className="hidden sm:inline">{u.name.split(" ")[0]}</span>
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[300px]">
                  <DropdownMenuLabel className="flex items-center gap-2.5 border-b-0 font-normal">
                    <Avatar name={u.name} />
                    <span className="min-w-0">
                      <b className="block font-semibold text-strong">{u.name}</b>
                      <small className="block text-xs text-muted-foreground">
                        {u.title} · {u.unit}
                      </small>
                      <small className="mono block text-xs text-muted-foreground">{u.email}</small>
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuItem onSelect={doSignOut}>
                    <LogOut aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="w-full max-w-[1360px] px-4 pt-5 pb-20 min-[900px]:px-7 min-[900px]:pt-7">
            {ro && (
              <div className="mb-[18px] flex items-start gap-2.5 rounded-lg border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-700">
                <Lock className="mt-0.5 size-4 flex-none" aria-hidden="true" />
                <div>
                  <b>Read-only access.</b> Compliance can open every screen but cannot change anything.
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset demo data?"
        description="Every case, decision and configuration change goes back to the starting sample data. You stay signed in."
        okLabel="Reset"
        danger
        onConfirm={async () => {
          const r = await resetDemoData()
          if (r.ok && r.toast) toast(r.toast)
          router.push(pathOf(LANDING[role]))
        }}
      />
    </>
  )
}
