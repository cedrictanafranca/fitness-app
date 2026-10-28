import type { DateKey } from '@/core/types';
import { shiftDateKey, toDateKey } from '@/core/nutrition/engine';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const WEEK_LENGTH = 7;

/** Local date for a YYYY-MM-DD key, at local midnight. */
export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** True only for a real calendar date written as YYYY-MM-DD (rejects e.g. 2026-02-30). */
export function isValidDateKey(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return toDateKey(parseDateKey(text)) === text;
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

/** Seven keys ending today, oldest first: [today-6, ..., today]. */
export function lastSevenDayKeys(today: DateKey): DateKey[] {
  return Array.from({ length: WEEK_LENGTH }, (_, i) => shiftDateKey(today, i - (WEEK_LENGTH - 1)));
}

export function formatDateLabel(key: DateKey): string {
  const d = parseDateKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function weekdayInitial(key: DateKey): string {
  return WEEKDAY_INITIALS[parseDateKey(key).getDay()];
}
