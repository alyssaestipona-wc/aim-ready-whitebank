import type { PlainStatus } from "@/mock"

/*
 * Plain-language mapping for the real `ApplicationStage` union
 * (apps/api/src/applications/application.entity.ts), adapted from - not
 * reused from - the simulated portal's own `plainStatus()`: the real stage
 * union has `Approval` (which the simulated `Stage` type doesn't) and lacks
 * `Documentation`/`Booking` (which the simulated one has, since those
 * stages don't exist in the real pipeline yet).
 */

/** Lifted verbatim from `apps/api/src/applications/policy.ts`'s `DECLINE_REASON_CODES`, rewritten to second person. */
const DECLINE_MESSAGES: Record<string, string> = {
  "Insufficient verified income": "We couldn't verify enough income for this amount. You can apply again with updated documents.",
  "Debt-to-income above policy": "Your current repayments are high compared with your income.",
  "Unable to verify information": "We couldn't verify some of the information on your application.",
  "Recent missed payments on other loans": "We found recent missed payments on another loan.",
}

const DEFAULT_DECLINE_MESSAGE = "Your application doesn't meet our lending requirements right now."

/**
 * Maps a real application's stage (+ decline reason, when declined) to the
 * borrower-facing pill/heading/body shown on `/my-applications`. `Approval`
 * reads exactly like `Review` ("in review") - the internal stage name is
 * never shown to a borrower.
 */
export function plainStatusForStage(stage: string, declineReasonCode: string | null): PlainStatus {
  switch (stage) {
    case "Review":
    case "Approval":
      return {
        pill: ["In review", "warn"],
        h: "We're reviewing your application",
        p: "A loan specialist is looking at it now. We'll update you here, so there's no need to call.",
        cta: null,
      }
    case "Info requested":
      return {
        pill: ["Action needed", "warn"],
        h: "We need a few more documents",
        p: "We've asked for more documents to finish reviewing your loan. Contact your loan officer to submit them.",
        cta: null,
      }
    case "Offer":
      return {
        pill: ["Approved", "ok"],
        h: "You're approved",
        p: "Contact your loan officer to review your offer and next steps.",
        cta: null,
      }
    case "Disbursed":
      return {
        pill: ["Funds released", "ok"],
        h: "Your loan has been disbursed",
        p: "Contact your branch for your loan statement and repayment schedule.",
        cta: null,
      }
    case "Declined":
      return {
        pill: ["Not approved", "bad"],
        h: "We can't offer you a loan right now",
        p: (declineReasonCode && DECLINE_MESSAGES[declineReasonCode]) || DEFAULT_DECLINE_MESSAGE,
        cta: null,
      }
    case "Withdrawn":
      return {
        pill: ["Closed", "neutral"],
        plainPill: true,
        h: "This application is closed",
        p: "You can apply again anytime.",
        cta: null,
      }
    default:
      return {
        pill: ["In review", "warn"],
        h: "We're reviewing your application",
        p: "A loan specialist is looking at it now. We'll update you here, so there's no need to call.",
        cta: null,
      }
  }
}
