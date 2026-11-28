/**
 * Public API of the staff console's simulated back end. Screens import only
 * from here. To connect `apps/api`, re-implement these exports with API calls
 * (actions are already async) and delete the rest of this folder.
 */
export * from "./types"
export type { Centavos, Grade, Outcome } from "@aim-ready/core"
export { BANK_NAME, CUSTOMERS, DECLINE_CODES, FINDINGS, HOLIDAYS, OVERRIDE_THRESHOLD, REASON_CODES, STAGES, TODAY, USERS } from "./constants"
export { baseRole, findApp, hrsLeft, isAdmin, isClosed, isReadOnly, me, peso, policyOf, prodName, products, termsOf } from "./engine"
export { roleOf, tOrd, MODEL_VERSION } from "./seed"
export { counts, myQueue, staffNotifs, teamQueue, unassigned, type StaffNotification } from "./selectors"
export { getSessionRole, setFlagsCookie, setSessionRole, setSessionToken, useSessionRole } from "./session"
export { getState, useStaffState } from "./store"
export * from "./actions/result"
export * from "./actions/session"
export * from "./actions/cases"
export * from "./actions/config"
export * from "./selectors-admin"
