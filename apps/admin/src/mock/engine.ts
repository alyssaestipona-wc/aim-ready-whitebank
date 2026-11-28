/** Pure helpers over the simulated state: who is acting, the clock, the audit trail, products. */
import { formatPeso, type Centavos } from "@aim-ready/core"

import { BASE_PRODUCTS, TODAY, USERS } from "./constants"
import type { AdminState, Product, ProductCode, RoleKey, StaffUser } from "./types"

export const peso = (c: Centavos, decimals: 0 | 2 = 0) => formatPeso(c, { decimals })

export function me(role: RoleKey | null): StaffUser {
  return USERS[role ?? "admin"]
}

/** Products with any published maker-checker overrides applied. */
export function products(s: AdminState): Record<ProductCode, Product> {
  const out = structuredClone(BASE_PRODUCTS)
  for (const code of Object.keys(s.prodOverrides) as ProductCode[]) {
    const o = s.prodOverrides[code]
    if (o) Object.assign(out[code], o)
  }
  return out
}

/** Advances the simulated clock two minutes and returns "27 Nov, HH:MM". */
export function now(s: AdminState): string {
  s.clock += 1
  let m = 30 + s.clock * 2
  const h = 10 + Math.floor(m / 60)
  m = m % 60
  return `${TODAY}, ${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}`
}

/** Appends to the audit log. `who` defaults to the signed-in user. */
export function log(s: AdminState, role: RoleKey | null, what: string, who?: string): void {
  const t = now(s)
  const u = who || me(role).name
  s.audit.unshift({ tenantId: s.tenantId, when: t, who: u, role: me(role).title, what, target: "" })
}
