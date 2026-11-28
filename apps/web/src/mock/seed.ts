import { TENANT } from "./config"
import type { BorrowerState } from "./types"

/**
 * Starting state. As in the prototype, neither seeded borrower has an
 * application yet; ids continue from the bank's sequence.
 */
export function seed(): BorrowerState {
  return { version: 1, tenantId: TENANT, clock: 0, seq: 1300, session: null, apps: [] }
}
