import { formatHour, formatRupees } from '../../../shared/constants.js';

export { formatHour, formatRupees };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Today's date in India (YYYY-MM-DD), regardless of the phone's time zone. */
export function todayIst(): string {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "Today", "Tomorrow", or "Thu 25 Sep". */
export function dayLabel(date: string): string {
  const today = todayIst();
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  const d = new Date(`${date}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function prettyDate(dateOrTs: string): string {
  const d = new Date(`${dateOrTs.slice(0, 10)}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const nextFreeLabel = (n?: { day: string; hour: number } | null) =>
  n ? `Next free: ${dayLabel(n.day)}, ${formatHour(n.hour)}` : 'No free slots this week';

export const classRange = (from: number | null, to: number | null) =>
  from == null ? null : from === to ? `Class ${from}` : `Class ${from}–${to}`;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : /(s|sh|ch|x)$/.test(word) ? 'es' : 's'}`;

export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
