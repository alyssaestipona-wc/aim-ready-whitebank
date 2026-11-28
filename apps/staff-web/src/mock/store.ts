"use client"

/**
 * The staff console's simulated persistence: one state object kept in this
 * browser's localStorage (with an in-memory fallback when storage is
 * unavailable). Mutations go through `update`, which works on a copy and then
 * persists and notifies subscribers. Replace this module's callers with API
 * calls when `apps/api` exists.
 */
import { useSyncExternalStore } from "react"

import { seed } from "./seed"
import type { StaffState } from "./types"

export const STORAGE_KEY = "wbl-staff-v3"

let state: StaffState | null = null
const listeners = new Set<() => void>()

function read(): StaffState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StaffState>
    return parsed && Array.isArray(parsed.apps) && parsed.cfg ? (parsed as StaffState) : null
  } catch {
    return null
  }
}

function persist(s: StaffState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // Storage full or blocked (private mode): keep going in memory.
  }
}

/** Current state, loading from storage or seeding on first use. */
export function getState(): StaffState {
  if (!state) {
    state = read() ?? seed()
    persist(state)
  }
  return state
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(): void {
  for (const l of listeners) l()
}

/** Applies a mutation to a copy of the state, then persists and notifies. */
export function update<T>(mutate: (draft: StaffState) => T): T {
  const draft = structuredClone(getState())
  const result = mutate(draft)
  state = draft
  persist(draft)
  emit()
  return result
}

/** Restores the seed data. */
export function resetState(): void {
  state = seed()
  persist(state)
  emit()
}

/** Test hook: forget the in-memory copy so the next read goes to storage. */
export function __dropMemoryForTests(): void {
  state = null
}

/**
 * Subscribes a component to the state. Returns null during server render and
 * hydration (the state lives only in the browser), then the live state.
 */
export function useStaffState(): StaffState | null {
  return useSyncExternalStore(subscribe, getState, () => null)
}
