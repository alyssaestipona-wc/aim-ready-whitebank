/**
 * Re-exports of the shared layout building blocks from `@aim-ready/ui`.
 * This app has no case-pipeline-specific pieces of its own (unlike
 * `apps/backoffice`'s `components/bits.tsx`), so everything here is a
 * pass-through — kept so existing `@/components/bits` imports don't need
 * to change call sites one by one.
 */
export { GradeBadge, Kpi, KpiGrid, KeyValues, Split, Section } from "@aim-ready/ui"
