"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { InboxIcon, LogOutIcon, UserIcon } from "lucide-react"
import {
  AppStrip,
  AppStripLink,
  Avatar,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@aim-ready/ui"

import { STAFF_WEB_URL } from "@/lib/env"
import { navigateHard } from "@/lib/navigation"
import { actions, currentBorrower, myApp, pendingCount, useBankSimulator, useBorrowerState } from "@/mock"

/** One centred 760px column shared by the header and the page content. */
export function Column({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[760px] px-6 md:px-8", className)} {...props} />
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      <i className="flex size-[30px] items-center justify-center rounded-md bg-ink text-[14px] font-bold text-white not-italic">K</i>
      <span>
        <b className="block text-[14.5px] leading-tight font-semibold text-strong">Kalinaw Bank</b>
        <small className="hidden text-xs text-muted-foreground sm:block">Loans</small>
      </span>
    </Link>
  )
}

/**
 * Strip, header and content column for every page. Also runs the simulated
 * bank progression and keeps signed-out browsers on the sign-in page.
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const state = useBorrowerState()
  const router = useRouter()
  const pathname = usePathname()
  const borrower = state ? currentBorrower(state) : null
  const pending = state ? pendingCount(myApp(state)) : 0
  useBankSimulator()

  React.useEffect(() => {
    if (!state) return
    if (!borrower && pathname !== "/sign-in") router.replace("/sign-in")
    if (borrower && pathname === "/sign-in") navigateHard("/")
  }, [state, borrower, pathname, router])

  return (
    <div className="flex min-h-screen flex-col bg-g-50">
      <AppStrip name="Borrower web app" caption="separate from the staff console">
        <AppStripLink href={STAFF_WEB_URL}>Staff console</AppStripLink>
      </AppStrip>
      <header className="sticky top-[38px] z-50 border-b border-border bg-paper">
        <Column className="flex h-[62px] items-center gap-3 sm:gap-7">
          <Logo />
          {borrower && (
            <div className="ml-auto flex items-center gap-2.5">
              <Link
                href="/inbox"
                aria-label={`Inbox${pending ? `, ${pending} new` : ""}`}
                className={cn(
                  "relative flex size-[34px] items-center justify-center rounded-md border bg-paper text-ink-4",
                  pathname === "/inbox" ? "border-brand text-brand-700" : "border-border"
                )}
              >
                <InboxIcon className="size-[18px]" />
                {pending > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] rounded-full bg-brand px-1 text-center text-[10px] leading-[17px] font-semibold text-white">
                    {pending}
                  </span>
                )}
              </Link>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Profile" className="flex items-center rounded-full border border-border bg-paper p-[3px]">
                    <Avatar name={borrower.name} tone="ink" size="sm" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>
                    <b className="block text-[13.5px] font-semibold text-strong">{borrower.name}</b>
                    <small className="block text-xs font-normal text-muted-foreground">{borrower.email}</small>
                  </DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => router.push("/account")}>
                    <UserIcon />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={async () => {
                      await actions.signOut()
                      navigateHard("/sign-in")
                    }}
                  >
                    <LogOutIcon />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </Column>
      </header>
      <main className="flex-1 pt-2 pb-14">
        <Column>{children}</Column>
      </main>
    </div>
  )
}
