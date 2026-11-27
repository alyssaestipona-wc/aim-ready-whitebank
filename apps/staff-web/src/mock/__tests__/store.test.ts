import { beforeEach, describe, expect, it, vi } from "vitest"

import { __dropMemoryForTests, getState, resetState, STORAGE_KEY, update } from "../store"

describe("store", () => {
  beforeEach(() => {
    window.localStorage.clear()
    __dropMemoryForTests()
  })

  it("seeds on first use and persists", () => {
    const s = getState()
    expect(s.apps.length).toBeGreaterThan(100)
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it("survives a reload (store re-created from storage)", () => {
    update((s) => {
      s.apps[0]!.owner = "Test Person"
    })
    __dropMemoryForTests()
    expect(getState().apps[0]!.owner).toBe("Test Person")
  })

  it("resets to the seed", () => {
    update((s) => {
      s.apps = []
    })
    resetState()
    expect(getState().apps.length).toBeGreaterThan(100)
  })

  it("falls back to memory when storage throws", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(() => getState()).not.toThrow()
    update((s) => {
      s.seq = 9999
    })
    expect(getState().seq).toBe(9999)
    get.mockRestore()
    set.mockRestore()
  })

  it("ignores corrupt storage", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json")
    expect(getState().apps.length).toBeGreaterThan(100)
  })
})
