/**
 * Public API of the admin console's simulated back end. Screens import only
 * from here. To connect `apps/api`, re-implement these exports with API
 * calls (actions are already async) and delete the rest of this folder.
 */
export * from "./types"
export type { Centavos, Grade, Outcome } from "@aim-ready/core"
export { APPROVER_GRADES, APPROVER_LIMIT, BANK_NAME, DEMO_PASSWORD, GRADE_RATE, HOLIDAYS, OVERRIDE_THRESHOLD, STAGES, TENANT_ID, TODAY, USERS } from "./constants"
export { me, peso, products } from "./engine"
export { getSessionRole, setFlagsCookie, setSessionRole, setSessionToken, useSessionRole } from "./session"
export { getState, useAdminState } from "./store"
export { directoryUsers, harness, notificationLog, overrides, type DirectoryUser } from "./selectors-admin"
export * from "./actions/result"
export * from "./actions/session"
export * from "./actions/config"
