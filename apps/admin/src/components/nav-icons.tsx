import { Bell, Box, Cpu, FileText, LayoutGrid, List, Plug, Settings, SlidersHorizontal, Users, Workflow, type LucideIcon } from "lucide-react"

import type { RouteKey } from "@/lib/access"

/** Sidebar icon per route, matching the staff console's RICON map. */
export const NAV_ICON: Record<RouteKey, LucideIcon> = {
  products: Box, workflows: Workflow, matrix: LayoutGrid, templates: FileText, notifications: Bell, decisioning: SlidersHorizontal, models: Cpu, integrations: Plug, users: Users, tenant: Settings, audit: List,
}
