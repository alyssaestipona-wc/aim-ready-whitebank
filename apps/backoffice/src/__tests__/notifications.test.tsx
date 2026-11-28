import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import NotificationsPage from "@/app/(console)/notifications/page"
import { NotificationBell } from "@/components/notification-bell"
import { getState, staffNotifs } from "@/mock"

import { renderWithToasts, setup } from "./helpers"
import { nav } from "./nav-mock"

describe("notification bell", () => {
  it("shows the unread count and loads 10 more on scroll", async () => {
    setup("officer", "/queues")
    renderWithToasts(<NotificationBell />)
    const unread = staffNotifs(getState(), "officer").filter((n) => !n.read).length
    expect(screen.getByRole("button", { name: "Notifications" })).toHaveTextContent(String(unread))
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }))
    const list = document.querySelector("[data-slot=notification-list]") as HTMLElement
    expect(within(list).getAllByRole("button")).toHaveLength(10)
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument()
    fireEvent.scroll(list)
    expect(within(list).getAllByRole("button")).toHaveLength(20)
  })

  it("opens a notification: marks it read and goes to its case", async () => {
    setup("officer", "/queues")
    renderWithToasts(<NotificationBell />)
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }))
    const target = staffNotifs(getState(), "officer").find((n) => !n.read && n.go?.startsWith("case:"))!
    await userEvent.click(screen.getByRole("button", { name: new RegExp(target.text.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }))
    expect(getState().notifRead[`officer:${target.id}`]).toBe(true)
    expect(nav.router.push).toHaveBeenCalledWith(`/applications/${target.go!.split(":")[1]}`)
  })

  it("links to the notifications page", async () => {
    setup("officer", "/queues")
    renderWithToasts(<NotificationBell />)
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }))
    await userEvent.click(screen.getByRole("button", { name: "View all notifications" }))
    expect(nav.router.push).toHaveBeenCalledWith("/notifications")
  })
})

describe("notifications page", () => {
  it("shows the unread count, filters and 10 rows with page buttons, no stat cards", () => {
    setup("officer", "/notifications")
    renderWithToasts(<NotificationsPage />)
    const unread = staffNotifs(getState(), "officer").filter((n) => !n.read).length
    expect(screen.getByText(`${unread} unread`)).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Type" })).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(11)
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument()
  })

  it("marks everything read", async () => {
    setup("officer", "/notifications")
    renderWithToasts(<NotificationsPage />)
    await userEvent.click(screen.getByRole("button", { name: "Mark all as read" }))
    expect(screen.getByText("All read")).toBeInTheDocument()
  })
})
