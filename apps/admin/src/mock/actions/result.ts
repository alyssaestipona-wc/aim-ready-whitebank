import type { ToastTone } from "@aim-ready/ui"

/**
 * What every mock action returns. Actions are async so callers do not change
 * when they are swapped for API calls.
 */
export type ActionResult =
  | { ok: true; toast?: string; tone?: ToastTone; /** where to go next, e.g. "/applications/APP-3301" */ go?: string }
  | { ok: false; error: string; tone?: ToastTone; /** show as a toast rather than inline */ asToast?: boolean }

export const ok = (toast?: string, tone?: ToastTone, go?: string): ActionResult => ({ ok: true, toast, tone, go })
export const fail = (error: string, asToast = false, tone: ToastTone = "bad"): ActionResult => ({ ok: false, error, asToast, tone })
