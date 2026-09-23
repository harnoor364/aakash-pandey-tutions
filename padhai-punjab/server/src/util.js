import crypto from 'node:crypto';

export class ApiError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export const bad = (message, field) => new ApiError(400, message, field);
export const forbidden = (message = "You don't have access to this.") => new ApiError(403, message);
export const notFound = (message = 'Not found.') => new ApiError(404, message);
export const conflict = (message, field) => new ApiError(409, message, field);

/** Wrap a sync/async handler so thrown errors reach the error middleware. */
export const h = (fn) => (req, res, next) => {
  try {
    const out = fn(req, res, next);
    if (out && typeof out.then === 'function') out.catch(next);
  } catch (e) {
    next(e);
  }
};

// ---- India time (UTC+5:30, no daylight saving) ----
const IST_OFFSET_MS = 330 * 60 * 1000;
export const clock = { now: () => Date.now() }; // overridable in tests

export function istParts(ms = clock.now()) {
  const d = new Date(ms + IST_OFFSET_MS);
  return {
    date: d.toISOString().slice(0, 10),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}
export const todayIst = () => istParts().date;

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const weekdayOf = (dateStr) => WD[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];

export const isDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime())
  && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export function addMonths(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

// ---- Misc ----
export const randomCode = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

export const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

export function requireText(v, field, label, { min = 1, max = 200 } = {}) {
  const s = str(v);
  if (!s) throw bad(`Please enter ${label}.`, field);
  if (s.length < min) throw bad(`${cap(label)} must be at least ${min} characters.`, field);
  if (s.length > max) throw bad(`${cap(label)} must be ${max} characters or fewer.`, field);
  return s;
}

export function requireOneOf(v, list, field, label) {
  if (!list.includes(v)) throw bad(`Please choose ${label}.`, field);
  return v;
}

export function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.startsWith('[')) {
    try { return JSON.parse(v); } catch { return []; }
  }
  if (v == null || v === '') return [];
  return [v];
}

export const toBool = (v) => v === true || v === 1 || v === '1' || v === 'true';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const fullName = (t) => `${t.first_name} ${t.last_name}`;
