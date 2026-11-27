import type { DecisionRecord } from "@aim-ready/core"

import { seed } from "./seed"
import type { BorrowerState } from "./types"

/** Bump when the stored shape changes so old browser data reseeds. */
export const STORAGE_KEY = "wbl-borrower-v1"

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

/** In-memory stand-in when localStorage is missing or throws. */
export function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

/** localStorage when usable, otherwise memory. Every access is guarded. */
export function browserStorage(): KeyValueStorage {
  const fallback = memoryStorage()
  const ls = (): Storage | null => {
    try {
      return typeof window !== "undefined" ? window.localStorage : null
    } catch {
      return null
    }
  }
  return {
    getItem: (k) => {
      try {
        return ls()?.getItem(k) ?? fallback.getItem(k)
      } catch {
        return fallback.getItem(k)
      }
    },
    setItem: (k, v) => {
      fallback.setItem(k, v)
      try {
        ls()?.setItem(k, v)
      } catch {
        // Private mode or blocked storage: the memory copy keeps the session working.
      }
    },
    removeItem: (k) => {
      fallback.removeItem(k)
      try {
        ls()?.removeItem(k)
      } catch {
        // ignore
      }
    },
  }
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v)
  }
  return o
}

/** Decision records are immutable: freeze them whenever state is loaded. */
function freezeDecisions(s: BorrowerState): BorrowerState {
  for (const a of s.apps) deepFreeze(a.decision as DecisionRecord)
  return s
}

function load(storage: KeyValueStorage): BorrowerState {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as BorrowerState
      if (parsed && parsed.version === 1 && Array.isArray(parsed.apps)) return freezeDecisions(parsed)
    }
  } catch {
    // Corrupt data: fall through to the seed.
  }
  return seed()
}

export type Store = {
  getState: () => BorrowerState
  /** Replaces state with `next(draft)`; `draft` is a deep copy safe to mutate. */
  update: (next: (draft: BorrowerState) => void) => void
  subscribe: (listener: () => void) => () => void
  reset: () => void
}

/** A tiny external store persisted under STORAGE_KEY. */
export function createStore(storage: KeyValueStorage = browserStorage()): Store {
  let state = load(storage)
  const listeners = new Set<() => void>()
  const commit = (s: BorrowerState) => {
    state = freezeDecisions(s)
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Quota or serialisation failure: keep the in-memory state.
    }
    listeners.forEach((l) => l())
  }
  return {
    getState: () => state,
    update: (fn) => {
      const draft = structuredClone(state) as BorrowerState
      fn(draft)
      commit(draft)
    },
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    reset: () => commit(seed()),
  }
}
