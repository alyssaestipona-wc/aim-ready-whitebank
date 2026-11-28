"use client"

import { useSessionRole, useStaffState, type RoleKey, type StaffState } from "@/mock"

/** The signed-in role and live simulated state; both null until hydrated. */
export function useConsole(): { role: RoleKey; s: StaffState } | null {
  const role = useSessionRole()
  const s = useStaffState()
  return role && s ? { role, s } : null
}
