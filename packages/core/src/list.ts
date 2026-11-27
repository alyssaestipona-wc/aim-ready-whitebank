/**
 * Search, filter and pagination for list views. Ported from the prototype's
 * `lvFilter` and `lvPage` so every table pages the same way.
 */

export type ListFilter<T> = {
  key: string;
  test: (item: T, value: string) => boolean;
};

/**
 * Keeps items whose `text` contains the query (case-insensitive, trimmed) and
 * that pass every filter with a non-empty selected value.
 */
export function filterList<T>(
  items: readonly T[],
  query: string,
  text: (item: T) => string,
  filters: readonly ListFilter<T>[] = [],
  values: Readonly<Record<string, string | undefined>> = {},
): T[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (q && !text(item).toLowerCase().includes(q)) return false;
    return filters.every((f) => {
      const v = values[f.key];
      return !v || f.test(item, v);
    });
  });
}

export type PageItem = number | "gap";

export type Page<T> = {
  rows: T[];
  /** The page actually shown, after clamping to 1…pageCount. */
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first row shown (0 when empty). */
  from: number;
  /** 1-based index of the last row shown (0 when empty). */
  to: number;
  /** Page buttons: first, last, and current ±1, with gaps between. */
  items: PageItem[];
};

export const DEFAULT_PAGE_SIZE = 10;

/** Slices one page, clamping an out-of-range page to the nearest valid one. */
export function paginate<T>(items: readonly T[], page: number, size: number = DEFAULT_PAGE_SIZE): Page<T> {
  if (!Number.isInteger(size) || size <= 0) throw new RangeError(`Page size must be a positive integer: ${size}`);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (p - 1) * size;
  const rows = items.slice(start, start + size);
  const pageItems: PageItem[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - p) <= 1) pageItems.push(i);
    else if (pageItems[pageItems.length - 1] !== "gap") pageItems.push("gap");
  }
  return {
    rows,
    page: p,
    pageCount,
    total,
    from: total ? start + 1 : 0,
    to: total ? start + rows.length : 0,
    items: pageItems,
  };
}

/**
 * The pager caption: "Showing 11–20 of 45" when there is more than one page,
 * "1 result" / "7 results" when everything fits, and "" when empty.
 */
export function rangeText(page: Pick<Page<unknown>, "total" | "from" | "to" | "pageCount">): string {
  if (!page.total) return "";
  if (page.pageCount > 1) return `Showing ${page.from}–${page.to} of ${page.total}`;
  return `${page.total} result${page.total === 1 ? "" : "s"}`;
}
