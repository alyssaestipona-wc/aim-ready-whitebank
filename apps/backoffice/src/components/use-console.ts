"use client"

import type { SessionRole } from "@/lib/access"
import { useSessionRole, useStaffState, type StaffState } from "@/mock"

/** The signed-in role and live simulated state; both null until hydrated. */
export function useConsole(): { role: SessionRole; s: StaffState } | null {
  const role = useSessionRole()
  const s = useStaffState()
  return role && s ? { role, s } : null
}
