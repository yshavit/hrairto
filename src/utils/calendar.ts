import type { QuarterDisplay } from '../bindings';

// All fiscal-calendar math lives in Rust (src-tauri/src/calendar.rs).
// This file contains only display helpers that belong in the TypeScript layer.

export interface MonthInfo {
  /** 1-based: 1–12 */
  month: number;
  /** Calendar year */
  year: number;
  /** e.g. "May" */
  label: string;
}

/** True if `Date.now()` falls within the quarter's half-open interval [start_at, end_at). */
export function isCurrentQuarter(q: QuarterDisplay): boolean {
  const now = Date.now();
  return now >= q.start_at && now < q.end_at;
}

/** Display name for a calendar month, e.g. "May". */
export function getMonthInfo(month: number, year: number, locale: string): MonthInfo {
  const label = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, month - 1, 1));
  return { month, year, label };
}
