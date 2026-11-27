import type { Disclosure } from "@aim-ready/core"

import { peso } from "@/mock"

import { Rows } from "../bits"

/** Truth in Lending disclosure rows (prototype disclosureRows). */
export function DisclosureRows({ terms }: { terms: Disclosure }) {
  return (
    <Rows
      rows={[
        ["Amount financed", peso(terms.principal)],
        ["Processing fee", peso(terms.fee)],
        ["Net proceeds", peso(terms.netProceeds)],
        ["Term", `${terms.months} months`],
        ["Monthly amortisation", peso(terms.monthlyPayment, 2)],
        ["Total of payments", peso(terms.totalOfPayments, 2)],
        ["Finance charge", peso(terms.financeCharge, 2)],
        ["Effective interest rate", `${terms.effectiveRatePct.toFixed(2)}% per year`, "tot"],
        ["Late payment penalty", "3% of amount due per month"],
      ]}
    />
  )
}
