import {
  BookOpen, Box, ChartColumn, Check, Clock, Cpu, FileText, Inbox, LayoutGrid, Link as LinkIcon, List, PenLine, Plug, Plus, Send, Settings, ShieldAlert, ShieldCheck, SlidersHorizontal, TriangleAlert, Upload, Users, Workflow, Bell,
  type LucideIcon,
} from "lucide-react"

import type { RouteKey } from "@/lib/access"

/** Sidebar icon per route, matching the prototype's RICON map. */
export const NAV_ICON: Record<RouteKey, LucideIcon> = {
  queues: Inbox, sla: Clock, approvals: Check, apps: FileText, "new-app": Plus, intake: Upload,
  signing: PenLine, booking: BookOpen, disbursements: Send, exceptions: TriangleAlert,
  "dash-funnel": ChartColumn, "dash-sla": Clock, "dash-decision": ChartColumn, "dash-reg": FileText,
  audit: List, consent: ShieldCheck, aml: ShieldAlert, related: LinkIcon, governance: Cpu,
  products: Box, workflows: Workflow, matrix: LayoutGrid, templates: FileText, notifications: Bell, decisioning: SlidersHorizontal, models: Cpu, integrations: Plug, users: Users, tenant: Settings,
}
