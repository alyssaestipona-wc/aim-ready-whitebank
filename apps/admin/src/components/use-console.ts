"use client"

import { useAdminState, useSessionRole, type AdminState } from "@/mock"

/** The signed-in session and live simulated state; both null until hydrated. */
export function useConsole(): { s: AdminState } | null {
  const role = useSessionRole()
  const s = useAdminState()
  return role && s ? { s } : null
}
