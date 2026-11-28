import { fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { MoneyInput } from "../components/money-input"
import { caretAfterFormat, formatMoneyFixed, formatMoneyLive } from "../lib/money-input-format"

describe("formatMoneyLive", () => {
  it("inserts separators and caps decimals at two", () => {
    expect(formatMoneyLive("1234567.891")).toEqual({ text: "1,234,567.89", value: 1234567.89 })
  })
  it("strips letters", () => {
    expect(formatMoneyLive("abc12.345").text).toBe("12.34")
  })
  it("drops leading zeros", () => {
    expect(formatMoneyLive("000250").text).toBe("250")
  })
  it("treats a lone dot as empty", () => {
    expect(formatMoneyLive(".")).toEqual({ text: ".", value: null })
    expect(formatMoneyLive("")).toEqual({ text: "", value: null })
  })
})

describe("formatMoneyFixed", () => {
  it("shows two decimals", () => {
    expect(formatMoneyFixed(5000)).toBe("5,000.00")
    expect(formatMoneyFixed(null)).toBe("")
  })
})

describe("caretAfterFormat", () => {
  it("keeps the caret after the same digits", () => {
    // Typing the 7th digit at the end of "250000" → "2,500,000"; caret stays at the end.
    expect(caretAfterFormat("2500000", 7, "2,500,000")).toBe(9)
    // Caret after "25" in "2500000" lands after "2,5" in the formatted text.
    expect(caretAfterFormat("2500000", 2, "2,500,000")).toBe(3)
  })
})

function Harness({ initial = null as number | null }) {
  const [v, setV] = React.useState<number | null>(initial)
  return (
    <>
      <label htmlFor="amt">Amount</label>
      <MoneyInput id="amt" value={v} onValueChange={setV} />
      <output>{String(v)}</output>
    </>
  )
}

describe("MoneyInput", () => {
  it("formats while typing and on blur", () => {
    render(<Harness />)
    const input = screen.getByLabelText("Amount") as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "1234567.891", selectionStart: 11 } })
    expect(input.value).toBe("1,234,567.89")
    expect(screen.getByRole("status")).toHaveTextContent("1234567.89")
    fireEvent.change(input, { target: { value: "5000" } })
    fireEvent.blur(input)
    expect(input.value).toBe("5,000.00")
  })

  it("shows the initial value with two decimals and a peso prefix", () => {
    render(<Harness initial={150000} />)
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("150,000.00")
    expect(screen.getByText("₱")).toBeInTheDocument()
  })
})
