/**
 * Route access for the admin console. Unlike `apps/backoffice`'s
 * multi-role access.ts, every signed-in session here is the tenant
 * administrator, so there is no role-based filtering — `NAV` lists every
 * route it may open, unconditionally.
 */

export type AccessRole = "admin"
export type SessionRole = AccessRole

export type RouteKey = "products" | "workflows" | "matrix" | "templates" | "notifications" | "decisioning" | "models" | "integrations" | "users" | "tenant" | "audit"

export type NavItem = { key: RouteKey; label: string; path: string }
export type NavGroup = { group: string; items: NavItem[] }

export const NAV: NavItem[] = [
  { key: "products", label: "Products", path: "/config/products" },
  { key: "workflows", label: "Workflows", path: "/config/workflows" },
  { key: "matrix", label: "Approval matrix", path: "/config/matrix" },
  { key: "templates", label: "Documents and templates", path: "/config/templates" },
  { key: "notifications", label: "Notifications", path: "/config/notifications" },
  { key: "decisioning", label: "Decisioning", path: "/config/decisioning" },
  { key: "models", label: "AI models", path: "/config/models" },
  { key: "integrations", label: "Integrations", path: "/config/integrations" },
  { key: "users", label: "Users and roles", path: "/config/users" },
  { key: "tenant", label: "Tenant settings", path: "/config/tenant" },
  { key: "audit", label: "Audit log", path: "/compliance/audit" },
]

export const LANDING: Record<SessionRole, RouteKey> = { admin: "products" }

export function pathOf(key: RouteKey): string {
  return NAV.find((i) => i.key === key)?.path ?? "/"
}

export type RouteMatch = { key: string; label: string; group: string | null; param?: string }

/** Resolves a pathname to its route, or null for an unknown path. */
export function matchRoute(pathname: string): RouteMatch | null {
  const p = pathname.replace(/\/+$/, "") || "/"
  const exact = NAV.find((i) => i.path === p)
  if (exact) return { key: exact.key, label: exact.label, group: "Configuration" }
  const productMatch = /^\/config\/products\/([^/]+)$/.exec(p)
  if (productMatch) return { key: "product", label: "Products", group: "Configuration", param: decodeURIComponent(productMatch[1] as string) }
  const templateMatch = /^\/config\/templates\/([^/]+)$/.exec(p)
  if (templateMatch) return { key: "template", label: "Documents and templates", group: "Configuration", param: decodeURIComponent(templateMatch[1] as string) }
  return null
}

/** The AI models screen is refused while the AI scoring module is off. */
export function allowed(key: string, flags: { ai: boolean } = { ai: true }): boolean {
  if (key === "product" || key === "template") return true
  if (key === "models") return flags.ai
  return NAV.some((i) => i.key === key)
}

/** Sidebar groups, dropping the AI models item while the module is off. */
export function navFor(flags: { ai: boolean }): NavGroup[] {
  return [{ group: "Configuration", items: NAV.filter((i) => !(i.key === "models" && !flags.ai)) }]
}

export const SESSION_COOKIE = "wbl_admin_session"
export const FLAGS_COOKIE = "wbl_admin_flags"

export function isSessionRole(v: string | undefined | null): v is SessionRole {
  return v === "admin"
}

/** Flags cookie: absent means defaults (AI on); "" means AI off. */
export function flagsFromCookie(v: string | undefined | null): { ai: boolean } {
  return { ai: v === undefined || v === null ? true : v.split(",").includes("ai") }
}

/**
 * Turns a notification or row target such as "product:PL" into a URL, or
 * null when the module is off.
 */
export function hrefFor(target: string, flags: { ai: boolean }): string | null {
  const [key, param] = target.split(":") as [string, string | undefined]
  if (!allowed(key, flags)) return null
  if (key === "product") return `/config/products/${param}`
  if (key === "template") return `/config/templates/${param}`
  const item = NAV.find((i) => i.key === key)
  return item ? item.path : null
}
