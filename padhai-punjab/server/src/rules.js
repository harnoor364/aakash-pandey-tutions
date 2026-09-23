// Core trust & safety rules. Every route that touches bookings, reviews or home
// visits goes through these functions so the rules live in one place, on the server.
import {
  REVIEW_UNLOCK_CLASSES, SAFETY_STEPS, SESSION_KINDS, TIMES_OF_DAY, trustScore,
} from '../../shared/constants.js';
import { json } from './db.js';
import { addDays, fullName, istParts, randomCode, todayIst, weekdayOf } from './util.js';

export const STEP_KEYS = SAFETY_STEPS.map((s) => s.key);

export function getTutor(db, id) {
  return db.prepare('SELECT * FROM tutors WHERE id = ?').get(id);
}

/** Police certificate is valid for 1 year from issue. */
export function policeValidUntil(db, tutorId) {
  const row = db.prepare("SELECT data FROM safety_checks WHERE tutor_id = ? AND step = 'police' AND status = 'done'").get(tutorId);
  return row ? json(row.data, {}).validUntil ?? null : null;
}

/**
 * A tutor may appear in home searches / take home bookings ONLY if all 8 checks were
 * approved by an admin, the police certificate is still valid, no safety report has
 * paused home visits, and the account isn't suspended.
 */
export function homeEligibility(db, tutor) {
  if (!tutor) return { ok: false, reason: 'Tutor not found.' };
  if (tutor.suspended) return { ok: false, reason: 'This tutor is not taking bookings right now.' };
  if (!tutor.offers_home) return { ok: false, reason: 'This tutor teaches online only.' };
  if (tutor.home_safe_status !== 'approved') {
    return { ok: false, reason: 'This tutor has not finished home-safety checks yet, so they can only teach online.' };
  }
  if (tutor.home_paused) return { ok: false, reason: 'Home visits from this tutor are paused while our safety team looks into a report.' };
  const until = policeValidUntil(db, tutor.id);
  if (!until || until < todayIst()) {
    return { ok: false, reason: "This tutor's police verification has expired, so home visits are paused until it's renewed." };
  }
  return { ok: true };
}

export const canTeachOnline = (tutor) => !!tutor && !tutor.suspended && !!tutor.offers_online;

// ---------- Visit codes ----------
export function activeVisitCode(db, { enrolmentId, sessionId }) {
  const row = enrolmentId
    ? db.prepare('SELECT * FROM visit_codes WHERE enrolment_id = ? AND active = 1 ORDER BY id DESC LIMIT 1').get(enrolmentId)
    : db.prepare('SELECT * FROM visit_codes WHERE session_id = ? AND active = 1 ORDER BY id DESC LIMIT 1').get(sessionId);
  return row || null;
}

export function issueVisitCode(db, { enrolmentId = null, sessionId = null }) {
  if (enrolmentId) db.prepare('UPDATE visit_codes SET active = 0 WHERE enrolment_id = ?').run(enrolmentId);
  if (sessionId) db.prepare('UPDATE visit_codes SET active = 0 WHERE session_id = ?').run(sessionId);
  const prev = enrolmentId
    ? db.prepare('SELECT code FROM visit_codes WHERE enrolment_id = ? ORDER BY id DESC LIMIT 1').get(enrolmentId)
    : db.prepare('SELECT code FROM visit_codes WHERE session_id = ? ORDER BY id DESC LIMIT 1').get(sessionId);
  let code = randomCode();
  while (prev && prev.code === code) code = randomCode(); // never repeat the last code
  db.prepare('INSERT INTO visit_codes (enrolment_id, session_id, code) VALUES (?, ?, ?)').run(enrolmentId, sessionId, code);
  return code;
}

export function codeMatches(db, target, entered) {
  const row = activeVisitCode(db, target);
  return !!row && String(entered ?? '').trim() === row.code;
}

// ---------- Reviews ----------
/**
 * Review eligibility for a family (user) and a tutor.
 *  - Regular tuition: 4+ class logs that the tutor logged AND the parent confirmed.
 *  - One-hour/topic classes: a session the tutor marked done AND the student confirmed.
 */
export function reviewEligibility(db, userId, tutorId) {
  const confirmed = db.prepare(`
    SELECT e.id AS enrolment_id, e.class, e.subject, COUNT(l.id) AS n
    FROM enrolments e
    LEFT JOIN class_logs l ON l.enrolment_id = e.id AND l.tutor_confirmed = 1 AND l.parent_confirmed = 1
    WHERE e.parent_user_id = ? AND e.tutor_id = ?
    GROUP BY e.id ORDER BY n DESC`).all(userId, tutorId);
  const totalConfirmed = confirmed.reduce((a, r) => a + r.n, 0);
  const session = db.prepare(`
    SELECT * FROM sessions WHERE student_user_id = ? AND tutor_id = ? AND status = 'completed'
    ORDER BY day DESC, start_hour DESC LIMIT 1`).get(userId, tutorId);
  const existing = db.prepare('SELECT * FROM reviews WHERE tutor_id = ? AND family_user_id = ? AND removed = 0').get(tutorId, userId);

  if (confirmed.length && totalConfirmed >= REVIEW_UNLOCK_CLASSES) {
    const top = confirmed[0];
    return {
      eligible: true, via: 'tuition', confirmedClasses: totalConfirmed, needed: 0,
      levelLabel: `Class ${top.class} · ${top.subject}`, classesAttended: totalConfirmed, topic: null, existing,
    };
  }
  if (session) {
    return {
      eligible: true, via: 'session', confirmedClasses: totalConfirmed, needed: 0,
      levelLabel: `${session.level} · ${session.subject}`, classesAttended: null, topic: session.topic, existing,
    };
  }
  return {
    eligible: false, via: confirmed.length ? 'tuition' : null, confirmedClasses: totalConfirmed,
    needed: Math.max(0, REVIEW_UNLOCK_CLASSES - totalConfirmed), existing,
  };
}

export function ratingStats(db, tutorId) {
  const ratings = db.prepare('SELECT rating FROM reviews WHERE tutor_id = ? AND removed = 0').all(tutorId).map((r) => r.rating);
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratings.forEach((r) => { breakdown[r] += 1; });
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  return {
    count: ratings.length,
    average: avg == null ? null : Math.round(avg * 10) / 10,
    breakdown,
    trustScore: Math.round(trustScore(ratings) * 1000) / 1000,
  };
}

/** Families whose child has a confirmed class or a completed session with this tutor. */
export function verifiedStudents(db, tutorId) {
  return db.prepare(`
    SELECT COUNT(*) AS n FROM (
      SELECT e.parent_user_id AS u FROM enrolments e
        JOIN class_logs l ON l.enrolment_id = e.id AND l.parent_confirmed = 1
        WHERE e.tutor_id = ?
      UNION
      SELECT s.student_user_id FROM sessions s WHERE s.tutor_id = ? AND s.status = 'completed'
    )`).get(tutorId, tutorId).n;
}

// ---------- Scheduling for one-hour / topic classes ----------
export function availableHours(tutor) {
  const times = json(tutor.available_times);
  return Object.entries(TIMES_OF_DAY).filter(([k]) => times.includes(k)).flatMap(([, v]) => v.hours);
}

function busyHours(db, tutorId, day) {
  const rows = db.prepare(`SELECT start_hour, duration_hours FROM sessions
    WHERE tutor_id = ? AND day = ? AND status IN ('waiting','booked','please_confirm')`).all(tutorId, day);
  const set = new Set();
  rows.forEach((r) => { for (let i = 0; i < r.duration_hours; i++) set.add(r.start_hour + i); });
  return set;
}

/** Free start hours for the next 7 days. A slot needs at least 1 hour's notice. */
export function freeSlots(db, tutor, kind = 'hour') {
  const duration = SESSION_KINDS[kind].minutes / 60;
  const days = json(tutor.available_days);
  const hours = availableHours(tutor);
  const now = istParts();
  const out = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(now.date, i);
    if (!days.includes(weekdayOf(day))) { out.push({ day, hours: [] }); continue; }
    const busy = busyHours(db, tutor.id, day);
    const free = hours.filter((h) => {
      if (i === 0 && h <= now.hour + (now.minute > 0 ? 1 : 0)) return false;
      for (let k = 0; k < duration; k++) {
        if (!hours.includes(h + k) || busy.has(h + k)) return false;
      }
      return true;
    });
    out.push({ day, hours: free });
  }
  return out;
}

export function nextFree(db, tutor, kind = 'hour') {
  const slots = freeSlots(db, tutor, kind);
  const first = slots.find((d) => d.hours.length);
  return first ? { day: first.day, hour: first.hours[0] } : null;
}

export function isSlotFree(db, tutor, kind, day, hour) {
  const slot = freeSlots(db, tutor, kind).find((d) => d.day === day);
  return !!slot && slot.hours.includes(hour);
}

// ---------- Public tutor view ----------
export function photoUrl(t) {
  return t.photo_file ? `/files/photo/${t.id}?v=${encodeURIComponent(t.photo_file.slice(0, 8))}` : null;
}

export function publicTutor(db, t, { userId } = {}) {
  const stats = ratingStats(db, t.id);
  const home = homeEligibility(db, t);
  const saved = userId ? !!db.prepare('SELECT 1 FROM saved_tutors WHERE user_id = ? AND tutor_id = ?').get(userId, t.id) : false;
  return {
    id: t.id,
    name: fullName(t),
    firstName: t.first_name,
    photoUrl: photoUrl(t),
    city: t.city,
    areas: json(t.areas),
    qualification: t.qualification,
    experienceYears: t.experience_years,
    languages: json(t.languages),
    intro: t.intro,
    classFrom: t.class_from,
    classTo: t.class_to,
    schoolSubjects: json(t.school_subjects),
    boards: json(t.boards),
    collegeSubjects: json(t.college_subjects),
    offersOnline: !!t.offers_online && !t.suspended,
    homeAvailable: home.ok,
    homeUnavailableReason: home.ok ? null : home.reason,
    monthlyFee: t.monthly_fee,
    hourPrice: t.hour_price,
    topicPrice: t.topic_price,
    availableDays: json(t.available_days),
    availableTimes: json(t.available_times),
    rating: stats,
    verifiedStudents: verifiedStudents(db, t.id),
    badges: {
      homeSafe: t.home_safe_status === 'approved' && !t.home_paused && !t.suspended
        && (policeValidUntil(db, t.id) ?? '') >= todayIst(),
      idVerified: t.id_status === 'verified',
    },
    saved,
  };
}
