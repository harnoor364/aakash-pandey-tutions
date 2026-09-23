import { Router } from 'express';
import {
  DEMO_TIME_SLOTS, REPORT_REASONS, REVIEW_MIN_CHARS, REVIEW_UNLOCK_CLASSES, SESSION_KINDS,
  SESSION_LEVELS, SUBJECTS_BY_LEVEL, SCHOOL_SUBJECTS, isIndianMobile,
} from '../../../shared/constants.js';
import { json, tx } from '../db.js';
import { alertSafetyTeam } from '../notify.js';
import {
  activeVisitCode, canTeachOnline, getTutor, homeEligibility, isSlotFree, publicTutor,
  reviewEligibility,
} from '../rules.js';
import {
  bad, conflict, forbidden, fullName, h, isDateStr, notFound, requireOneOf, requireText, str,
} from '../util.js';
import { teachesLevel } from './public.js';

export function parentRoutes({ db, auth, config }) {
  const r = Router();
  r.use(auth.requireAuth, auth.requireRole('parent'));

  const phoneField = (v) => {
    const p = str(v);
    if (!isIndianMobile(p)) throw bad('Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.', 'phone');
    return p;
  };

  function bookableTutor(id, userId) {
    const t = getTutor(db, Number(id));
    if (!t || t.suspended) throw notFound('This tutor is not taking bookings right now.');
    if (t.user_id === userId) throw bad("You can't book yourself.");
    return t;
  }

  function checkMode(t, mode) {
    requireOneOf(mode, ['home', 'online'], 'mode', 'Home or Online');
    if (mode === 'home') {
      const e = homeEligibility(db, t);
      if (!e.ok) throw bad(e.reason, 'mode');
    } else if (!canTeachOnline(t)) {
      throw bad('This tutor does not teach online.', 'mode');
    }
  }

  // ---------- Saved tutors ----------
  r.get('/saved', h((req, res) => {
    const rows = db.prepare(`SELECT t.* FROM saved_tutors s JOIN tutors t ON t.id = s.tutor_id
      WHERE s.user_id = ? AND t.suspended = 0 ORDER BY s.created_at DESC`).all(req.user.id);
    res.json({ tutors: rows.map((t) => publicTutor(db, t, { userId: req.user.id })) });
  }));

  r.put('/saved/:tutorId', h((req, res) => {
    const t = getTutor(db, Number(req.params.tutorId));
    if (!t) throw notFound('Tutor not found.');
    db.prepare('INSERT OR IGNORE INTO saved_tutors (user_id, tutor_id) VALUES (?, ?)').run(req.user.id, t.id);
    res.json({ ok: true, message: `${t.first_name} saved to your list.` });
  }));

  r.delete('/saved/:tutorId', h((req, res) => {
    db.prepare('DELETE FROM saved_tutors WHERE user_id = ? AND tutor_id = ?').run(req.user.id, Number(req.params.tutorId));
    res.json({ ok: true, message: 'Removed from saved.' });
  }));

  // ---------- Book a free demo ----------
  r.post('/demo-requests', h((req, res) => {
    const b = req.body || {};
    const t = bookableTutor(b.tutorId, req.user.id);
    const parentName = requireText(b.parentName, 'parentName', 'your name', { min: 2, max: 60 });
    const phone = phoneField(b.phone);
    const childName = requireText(b.childName, 'childName', "your child's name", { min: 2, max: 60 });
    const cls = Number(b.cls);
    if (!Number.isInteger(cls) || cls < 1 || cls > 12) throw bad("Choose your child's class.", 'cls');
    const subject = requireOneOf(str(b.subject), SCHOOL_SUBJECTS, 'subject', 'a subject');
    if (t.class_from == null) throw bad(`${t.first_name} teaches college students only.`, 'cls');
    if (!(t.class_from <= cls && cls <= t.class_to)) {
      throw bad(`${t.first_name} teaches Class ${t.class_from}–${t.class_to}. Please pick another tutor for Class ${cls}.`, 'cls');
    }
    if (!json(t.school_subjects).includes(subject)) throw bad(`${t.first_name} doesn't teach ${subject}.`, 'subject');
    const mode = str(b.mode);
    checkMode(t, mode);
    const area = mode === 'home' ? requireText(b.area, 'area', 'your area or locality', { min: 2, max: 80 }) : null;
    const timeSlot = requireOneOf(str(b.timeSlot), DEMO_TIME_SLOTS, 'timeSlot', 'a preferred time');

    const dup = db.prepare(`SELECT 1 FROM demo_requests WHERE parent_user_id = ? AND tutor_id = ?
      AND lower(child_name) = lower(?) AND status = 'pending'`).get(req.user.id, t.id, childName);
    if (dup) throw conflict(`You already have a demo request with ${t.first_name} for ${childName}. Please wait for a reply.`);

    const info = db.prepare(`INSERT INTO demo_requests
      (parent_user_id, tutor_id, parent_name, phone, child_name, class, subject, mode, area, time_slot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(req.user.id, t.id, parentName, phone, childName, cls, subject, mode, area, timeSlot);
    if (!req.user.name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(parentName, req.user.id);
    res.status(201).json({ id: Number(info.lastInsertRowid), message: `Demo request sent to ${t.first_name}. You'll hear back soon.` });
  }));

  // ---------- One-hour / topic classes ----------
  r.post('/sessions', h((req, res) => {
    const b = req.body || {};
    const t = bookableTutor(b.tutorId, req.user.id);
    const level = requireOneOf(str(b.level), SESSION_LEVELS, 'level', 'a level');
    const subject = requireOneOf(str(b.subject), SUBJECTS_BY_LEVEL[level], 'subject', 'a subject');
    if (!teachesLevel(t, level, subject)) throw bad(`${t.first_name} doesn't teach ${subject} for ${level}.`, 'subject');
    const kind = requireOneOf(str(b.kind), Object.keys(SESSION_KINDS), 'kind', 'a class type');
    if (t.hour_price == null) throw bad(`${t.first_name} doesn't take one-hour classes.`, 'kind');
    const studentName = requireText(b.studentName, 'studentName', 'the student’s name', { min: 2, max: 60 });
    const phone = phoneField(b.phone);
    const topic = requireText(b.topic, 'topic', 'the topic', { min: 3, max: 120 });
    const confusing = str(b.confusing).slice(0, 500) || null;
    const day = str(b.day);
    if (!isDateStr(day)) throw bad('Choose a day.', 'day');
    const hour = Number(b.startHour);
    if (!Number.isInteger(hour)) throw bad('Choose a start time.', 'startHour');
    const mode = str(b.mode);
    checkMode(t, mode);
    const area = mode === 'home' ? requireText(b.area, 'area', 'your area or locality', { min: 2, max: 80 }) : null;

    const id = tx(db, () => {
      if (!isSlotFree(db, t, kind, day, hour)) {
        throw conflict('That time is no longer free. Please pick another slot.', 'startHour');
      }
      const price = kind === 'topic' ? t.topic_price : t.hour_price;
      const info = db.prepare(`INSERT INTO sessions (student_user_id, tutor_id, level, subject, topic, confusing, kind,
        price, day, start_hour, duration_hours, mode, area, student_name, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(req.user.id, t.id, level, subject, topic, confusing, kind, price, day, hour,
          SESSION_KINDS[kind].minutes / 60, mode, area, studentName, phone);
      return Number(info.lastInsertRowid);
    });
    res.status(201).json({ id, message: `Class requested. ${t.first_name} will confirm soon.` });
  }));

  r.get('/sessions', h((req, res) => {
    const rows = db.prepare(`SELECT s.*, t.first_name, t.last_name FROM sessions s JOIN tutors t ON t.id = s.tutor_id
      WHERE s.student_user_id = ? ORDER BY s.day DESC, s.start_hour DESC`).all(req.user.id);
    res.json({ sessions: rows.map((s) => sessionView(s, req.user.id)) });
  }));

  function sessionView(s, userId) {
    const code = s.mode === 'home' && s.status === 'booked' ? activeVisitCode(db, { sessionId: s.id }) : null;
    const t = getTutor(db, s.tutor_id);
    const elig = s.status === 'completed' ? reviewEligibility(db, userId, s.tutor_id) : null;
    return {
      id: s.id, tutorId: s.tutor_id, tutorName: `${s.first_name} ${s.last_name}`, level: s.level, subject: s.subject,
      topic: s.topic, confusing: s.confusing, kind: s.kind, price: s.price, day: s.day, startHour: s.start_hour,
      durationHours: s.duration_hours, mode: s.mode, area: s.area, status: s.status,
      visitCode: code?.code ?? null,
      homePaused: s.mode === 'home' && !!t.home_paused,
      canReview: !!elig?.eligible, hasReview: !!elig?.existing,
    };
  }

  r.post('/sessions/:id/confirm', h((req, res) => {
    const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(Number(req.params.id));
    if (!s || s.student_user_id !== req.user.id) throw notFound('Class not found.');
    if (s.status !== 'please_confirm') throw bad('This class is not waiting for your confirmation.');
    const attended = req.body?.attended === true;
    db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(attended ? 'completed' : 'not_attended', s.id);
    res.json({
      ok: true,
      message: attended ? 'Thanks! You can now rate this class.' : "Noted. We'll check with the tutor.",
    });
  }));

  r.post('/sessions/:id/cancel', h((req, res) => {
    const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(Number(req.params.id));
    if (!s || s.student_user_id !== req.user.id) throw notFound('Class not found.');
    if (!['waiting', 'booked'].includes(s.status)) throw bad('This class can no longer be cancelled.');
    tx(db, () => {
      db.prepare("UPDATE sessions SET status = 'cancelled' WHERE id = ?").run(s.id);
      db.prepare('UPDATE visit_codes SET active = 0 WHERE session_id = ?').run(s.id);
    });
    res.json({ ok: true, message: 'Class cancelled.' });
  }));

  // ---------- My tutors (demo requests, active tutors, past classes) ----------
  r.get('/my-tutors', h((req, res) => {
    const pending = db.prepare(`SELECT d.*, t.first_name, t.last_name FROM demo_requests d JOIN tutors t ON t.id = d.tutor_id
      WHERE d.parent_user_id = ? AND d.status IN ('pending','declined') ORDER BY d.created_at DESC`).all(req.user.id)
      .map((d) => ({
        id: d.id, tutorId: d.tutor_id, tutorName: `${d.first_name} ${d.last_name}`, childName: d.child_name,
        cls: d.class, subject: d.subject, mode: d.mode, timeSlot: d.time_slot, status: d.status, createdAt: d.created_at,
      }));

    const enrolments = db.prepare('SELECT * FROM enrolments WHERE parent_user_id = ? ORDER BY created_at DESC').all(req.user.id);
    const active = enrolments.map((e) => {
      const t = getTutor(db, e.tutor_id);
      const logs = db.prepare('SELECT * FROM class_logs WHERE enrolment_id = ? ORDER BY class_date DESC, id DESC').all(e.id)
        .map((l) => ({ id: l.id, date: l.class_date, topic: l.topic, parentConfirmed: l.parent_confirmed == null ? null : !!l.parent_confirmed }));
      const elig = reviewEligibility(db, req.user.id, e.tutor_id);
      const code = e.mode === 'home' && e.status === 'active' ? activeVisitCode(db, { enrolmentId: e.id }) : null;
      return {
        id: e.id, tutorId: e.tutor_id, tutorName: fullName(t), tutorPhotoUrl: publicTutor(db, t).photoUrl,
        childName: e.child_name, cls: e.class, subject: e.subject, mode: e.mode, area: e.area, status: e.status,
        logs,
        confirmedClasses: elig.confirmedClasses,
        reviewUnlockAt: REVIEW_UNLOCK_CLASSES,
        canReview: elig.eligible,
        hasReview: !!elig.existing,
        visitCode: code?.code ?? null,
        homePaused: e.mode === 'home' && !!t.home_paused,
      };
    });
    res.json({ pending, active: active.filter((a) => a.status === 'active'), past: active.filter((a) => a.status === 'ended') });
  }));

  r.post('/class-logs/:id/confirm', h((req, res) => {
    const l = db.prepare(`SELECT l.*, e.parent_user_id FROM class_logs l JOIN enrolments e ON e.id = l.enrolment_id
      WHERE l.id = ?`).get(Number(req.params.id));
    if (!l || l.parent_user_id !== req.user.id) throw notFound('Class not found.');
    if (l.parent_confirmed != null) throw bad('You have already answered for this class.');
    if (typeof req.body?.attended !== 'boolean') throw bad('Please answer Yes or No.');
    db.prepare('UPDATE class_logs SET parent_confirmed = ? WHERE id = ?').run(req.body.attended ? 1 : 0, l.id);
    res.json({
      ok: true,
      message: req.body.attended ? 'Class confirmed. Thank you!' : "Noted. This class won't count, and we'll let the tutor know.",
    });
  }));

  // ---------- Reviews ----------
  r.get('/tutors/:id/review-eligibility', h((req, res) => {
    const t = getTutor(db, Number(req.params.id));
    if (!t) throw notFound('Tutor not found.');
    const e = reviewEligibility(db, req.user.id, t.id);
    res.json({
      eligible: e.eligible, needed: e.needed, confirmedClasses: e.confirmedClasses, levelLabel: e.levelLabel ?? null,
      existing: e.existing ? { rating: e.existing.rating, comment: e.existing.comment, recommend: !!e.existing.recommend } : null,
      tutorName: fullName(t),
    });
  }));

  r.put('/tutors/:id/review', h((req, res) => {
    const t = getTutor(db, Number(req.params.id));
    if (!t) throw notFound('Tutor not found.');
    const e = reviewEligibility(db, req.user.id, t.id);
    if (!e.eligible) {
      throw forbidden(e.via === 'tuition'
        ? `Reviews unlock after ${REVIEW_UNLOCK_CLASSES} classes that you have confirmed. ${e.needed} to go.`
        : 'Only families whose child studied with this tutor can leave a review.');
    }
    const b = req.body || {};
    const rating = Number(b.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw bad('Tap 1 to 5 stars.', 'rating');
    const comment = str(b.comment);
    if (comment.length < REVIEW_MIN_CHARS) throw bad(`Please write at least ${REVIEW_MIN_CHARS} characters about your experience.`, 'comment');
    if (comment.length > 1000) throw bad('Please keep your review under 1000 characters.', 'comment');
    if (typeof b.recommend !== 'boolean') throw bad('Would you recommend this tutor? Please choose Yes or No.', 'recommend');

    const removedBefore = db.prepare('SELECT id FROM reviews WHERE tutor_id = ? AND family_user_id = ? AND removed = 1').get(t.id, req.user.id);
    if (removedBefore) throw forbidden('Your earlier review was removed for breaking our review policy, so you cannot review this tutor again.');

    const reviewerName = (req.user.name || 'Parent').split(' ')[0];
    if (e.existing) {
      db.prepare(`UPDATE reviews SET rating = ?, comment = ?, recommend = ?, level_label = ?, classes_attended = ?, topic = ?,
        updated_at = datetime('now') WHERE id = ?`)
        .run(rating, comment, b.recommend ? 1 : 0, e.levelLabel, e.classesAttended, e.topic, e.existing.id);
      return res.json({ ok: true, message: 'Your review has been updated.' });
    }
    db.prepare(`INSERT INTO reviews (tutor_id, family_user_id, rating, comment, recommend, level_label, classes_attended, topic, reviewer_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.id, req.user.id, rating, comment, b.recommend ? 1 : 0, e.levelLabel, e.classesAttended, e.topic, reviewerName);
    res.status(201).json({ ok: true, message: 'Thank you! Your verified review is live.' });
  }));

  // ---------- Report a safety concern ----------
  r.post('/reports', h(async (req, res) => {
    const b = req.body || {};
    const t = getTutor(db, Number(b.tutorId));
    if (!t) throw notFound('Tutor not found.');
    const reason = requireOneOf(str(b.reason), REPORT_REASONS, 'reason', 'what happened');
    const details = str(b.details).slice(0, 2000) || null;
    if (reason === 'Something else' && !details) throw bad('Please tell us briefly what happened.', 'details');

    const linked = db.prepare(`SELECT 1 FROM demo_requests WHERE parent_user_id = ? AND tutor_id = ?
      UNION SELECT 1 FROM enrolments WHERE parent_user_id = ? AND tutor_id = ?
      UNION SELECT 1 FROM sessions WHERE student_user_id = ? AND tutor_id = ?`)
      .get(req.user.id, t.id, req.user.id, t.id, req.user.id, t.id);
    if (!linked) throw forbidden('You can report a tutor you have booked or requested a demo from. For emergencies call 112.');

    const enrolmentId = b.enrolmentId ? Number(b.enrolmentId) : null;
    const sessionId = b.sessionId ? Number(b.sessionId) : null;
    if (enrolmentId && !db.prepare('SELECT 1 FROM enrolments WHERE id = ? AND parent_user_id = ? AND tutor_id = ?').get(enrolmentId, req.user.id, t.id)) {
      throw bad('That tuition does not belong to you.');
    }
    if (sessionId && !db.prepare('SELECT 1 FROM sessions WHERE id = ? AND student_user_id = ? AND tutor_id = ?').get(sessionId, req.user.id, t.id)) {
      throw bad('That class does not belong to you.');
    }

    const id = tx(db, () => {
      const info = db.prepare(`INSERT INTO reports (reporter_user_id, tutor_id, enrolment_id, session_id, reason, details)
        VALUES (?, ?, ?, ?, ?, ?)`).run(req.user.id, t.id, enrolmentId, sessionId, reason, details);
      // Immediately pause ALL home visits from this tutor until an admin reviews it.
      db.prepare('UPDATE tutors SET home_paused = 1 WHERE id = ?').run(t.id);
      return Number(info.lastInsertRowid);
    });
    await alertSafetyTeam(config, `Safety report #${id} about ${fullName(t)} (tutor #${t.id})`, {
      reason, details, reporterPhone: req.user.phone,
    });
    res.status(201).json({
      id,
      message: 'Our safety team will call you within 2 hours. Home visits from this tutor are paused.',
    });
  }));

  return r;
}
