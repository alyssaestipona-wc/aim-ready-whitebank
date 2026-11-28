/**
 * Role-scoped navigation and route access, ported from the prototype's NAV,
 * allowed() and CASE_ROLES. Pure data and functions so the server-side check
 * in `src/proxy.ts` and the sidebar use exactly the same map.
 */

export type AccessRole = "branch" | "officer" | "approver" | "ops" | "risk" | "compliance"
export type SessionRole = AccessRole | "opssup"

export type RouteKey =
  | "queues" | "sla" | "approvals"
  | "apps" | "new-app" | "intake"
  | "signing" | "booking" | "disbursements" | "exceptions"
  | "dash-funnel" | "dash-sla" | "dash-decision" | "dash-reg"
  | "audit" | "consent" | "aml" | "related" | "governance"
  | "products" | "workflows" | "matrix" | "templates" | "notifications" | "decisioning" | "models" | "integrations" | "users" | "tenant"

export type NavItem = { key: RouteKey; label: string; path: string; roles: AccessRole[] }
export type NavGroup = { group: string; items: NavItem[] }

const W: AccessRole[] = ["branch", "officer", "approver", "ops", "compliance"]
const REP: AccessRole[] = ["officer", "approver", "risk", "compliance"]

export const NAV: NavGroup[] = [
  {
    group: "My work",
    items: [
      { key: "queues", label: "Work queues", path: "/queues", roles: W },
      { key: "sla", label: "SLA watch", path: "/sla", roles: W },
      { key: "approvals", label: "Approvals", path: "/approvals", roles: ["approver", "compliance"] },
    ],
  },
  {
    group: "Applications",
    items: [
      { key: "apps", label: "All applications", path: "/applications", roles: ["branch", "officer", "approver", "compliance"] },
      { key: "new-app", label: "New assisted application", path: "/applications/new", roles: ["branch", "officer"] },
      { key: "intake", label: "Email and file intake", path: "/intake", roles: ["branch", "officer", "compliance"] },
    ],
  },
  {
    group: "Closing and booking",
    items: [
      { key: "signing", label: "Documents and signing", path: "/signing", roles: ["ops", "compliance"] },
      { key: "booking", label: "Booking", path: "/booking", roles: ["ops", "compliance"] },
      { key: "disbursements", label: "Disbursements", path: "/disbursements", roles: ["ops", "compliance"] },
      { key: "exceptions", label: "Booking exceptions", path: "/exceptions", roles: ["ops", "compliance"] },
    ],
  },
  {
    group: "Reports",
    items: [
      { key: "dash-funnel", label: "Origination funnel", path: "/reports/funnel", roles: REP },
      { key: "dash-sla", label: "Turnaround and SLA", path: "/reports/sla", roles: REP },
      { key: "dash-decision", label: "Decisioning dashboard", path: "/reports/decisioning", roles: REP },
      { key: "dash-reg", label: "Regulatory extracts", path: "/reports/regulatory", roles: ["risk", "compliance"] },
    ],
  },
  {
    group: "Compliance",
    items: [
      { key: "audit", label: "Audit log", path: "/compliance/audit", roles: ["compliance"] },
      { key: "consent", label: "Consent records", path: "/compliance/consent", roles: ["compliance"] },
      { key: "aml", label: "AML escalations", path: "/compliance/aml", roles: ["compliance"] },
      { key: "related", label: "Related-party lending", path: "/compliance/related", roles: ["compliance"] },
      { key: "governance", label: "Model governance", path: "/compliance/governance", roles: ["compliance", "risk"] },
    ],
  },
  {
    group: "Configuration",
    items: [
      { key: "products", label: "Products", path: "/config/products", roles: ["risk", "compliance"] },
      { key: "workflows", label: "Workflows", path: "/config/workflows", roles: ["compliance"] },
      { key: "matrix", label: "Approval matrix", path: "/config/matrix", roles: ["risk", "compliance"] },
      { key: "templates", label: "Documents and templates", path: "/config/templates", roles: ["compliance"] },
      { key: "notifications", label: "Notifications", path: "/config/notifications", roles: ["compliance"] },
      { key: "decisioning", label: "Decisioning", path: "/config/decisioning", roles: ["risk", "compliance"] },
      { key: "models", label: "AI models", path: "/config/models", roles: ["risk", "compliance"] },
      { key: "integrations", label: "Integrations", path: "/config/integrations", roles: ["compliance"] },
      { key: "users", label: "Users and roles", path: "/config/users", roles: ["compliance"] },
      { key: "tenant", label: "Tenant settings", path: "/config/tenant", roles: ["compliance"] },
    ],
  },
]

export const NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items)

/** Roles that can open a case page. */
const CASE_ROLES: AccessRole[] = ["branch", "officer", "approver", "ops", "compliance", "risk"]
const PRODUCT_ROLES: AccessRole[] = ["risk", "compliance"]
/** Same roles as the "templates" list item — the detail page is just as restricted. */
const TEMPLATE_ROLES: AccessRole[] = ["compliance"]

export function baseOf(role: SessionRole): AccessRole {
  return role === "opssup" ? "ops" : role
}

export const LANDING: Record<SessionRole, RouteKey> = {
  branch: "queues", officer: "queues", approver: "approvals", ops: "booking", opssup: "booking", risk: "dash-decision", compliance: "audit",
}

export function pathOf(key: RouteKey): string {
  return NAV_ITEMS.find((i) => i.key === key)?.path ?? "/"
}

/** Routes every signed-in user may open. */
const OPEN_PATHS = ["/notifications", "/denied"]

export type RouteMatch = { key: string; label: string; group: string | null; param?: string }

/** Resolves a pathname to its route, or null for an unknown path. */
export function matchRoute(pathname: string): RouteMatch | null {
  const p = pathname.replace(/\/+$/, "") || "/"
  if (OPEN_PATHS.includes(p)) return { key: p.slice(1), label: p === "/notifications" ? "Notifications" : "", group: p === "/notifications" ? "My work" : null }
  const exact = NAV_ITEMS.find((i) => i.path === p)
  if (exact) return { key: exact.key, label: exact.label, group: NAV.find((g) => g.items.includes(exact))?.group ?? null }
  const caseMatch = /^\/applications\/([^/]+)$/.exec(p)
  if (caseMatch) return { key: "case", label: "All applications", group: "Applications", param: decodeURIComponent(caseMatch[1] as string) }
  const productMatch = /^\/config\/products\/([^/]+)$/.exec(p)
  if (productMatch) return { key: "product", label: "Products", group: "Configuration", param: decodeURIComponent(productMatch[1] as string) }
  const templateMatch = /^\/config\/templates\/([^/]+)$/.exec(p)
  if (templateMatch) return { key: "template", label: "Documents and templates", group: "Configuration", param: decodeURIComponent(templateMatch[1] as string) }
  return null
}

/**
 * Whether the role may open the route. The AI models screen is refused for
 * everyone while the AI scoring module is off.
 */
export function allowed(role: SessionRole, key: string, flags: { ai: boolean } = { ai: true }): boolean {
  const r = baseOf(role)
  if (key === "case") return CASE_ROLES.includes(r)
  if (key === "product") return PRODUCT_ROLES.includes(r)
  if (key === "template") return TEMPLATE_ROLES.includes(r)
  if (key === "notifications" || key === "denied") return true
  if (key === "models" && !flags.ai) return false
  const item = NAV_ITEMS.find((i) => i.key === key)
  return !!item && item.roles.includes(r)
}

/** Sidebar groups for the role, dropping empty groups and hidden modules. */
export function navFor(role: SessionRole, flags: { ai: boolean }): NavGroup[] {
  const r = baseOf(role)
  return NAV.map((g) => ({ group: g.group, items: g.items.filter((i) => i.roles.includes(r) && !(i.key === "models" && !flags.ai)) })).filter((g) => g.items.length)
}

export const SESSION_COOKIE = "wbl_staff_session"
export const FLAGS_COOKIE = "wbl_flags"

export function isSessionRole(v: string | undefined | null): v is SessionRole {
  return !!v && Object.hasOwn(LANDING, v)
}

/** Flags cookie: absent means defaults (AI on); "" means AI off. */
export function flagsFromCookie(v: string | undefined | null): { ai: boolean } {
  return { ai: v === undefined || v === null ? true : v.split(",").includes("ai") }
}

/**
 * Turns a notification or row target such as "case:APP-2041" or
 * "booking:APP-2054" into a URL, or null when the role may not open it.
 */
export function hrefFor(target: string, role: SessionRole, flags: { ai: boolean }): string | null {
  const [key, param] = target.split(":") as [string, string | undefined]
  if (!allowed(role, key, flags)) return null
  if (key === "case") return `/applications/${param}`
  if (key === "product") return `/config/products/${param}`
  if (key === "template") return `/config/templates/${param}`
  if (key === "booking" && param) return `/booking?case=${encodeURIComponent(param)}`
  const item = NAV_ITEMS.find((i) => i.key === key)
  return item ? item.path : null
}
