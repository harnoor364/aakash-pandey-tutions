import fs from 'node:fs';
import { Router } from 'express';
import {
  BOARDS, DISTRICTS, SCHOOL_SUBJECTS, SESSION_KINDS, SESSION_LEVELS, SUBJECTS_BY_LEVEL,
  COLLEGE_SUBJECTS,
} from '../../../shared/constants.js';
import { json } from '../db.js';
import {
  canTeachOnline, freeSlots, getTutor, homeEligibility, nextFree, publicTutor,
} from '../rules.js';
import { bad, h, notFound, str } from '../util.js';

export function publicRoutes({ db, auth, uploads, config }) {
  const r = Router();

  // ---- Login with mobile + OTP ----
  r.post('/auth/otp', h(async (req, res) => {
    const out = await auth.requestOtp(req.body?.phone);
    res.json({ ok: true, message: 'We sent a 4-digit code by SMS.', ...out });
  }));

  r.post('/auth/verify', h((req, res) => {
    const { token, user } = auth.verifyOtp(req.body?.phone, req.body?.otp);
    res.json({ token, user: meView(user) });
  }));

  r.get('/me', auth.requireAuth, h((req, res) => res.json({ user: meView(req.user) })));

  r.post('/me/role', auth.requireAuth, h((req, res) => {
    const role = str(req.body?.role);
    if (!['parent', 'tutor', 'admin'].includes(role)) throw bad('Please choose Parent/Student or Tutor.', 'role');
    if (role === 'admin' && !config.adminPhones.includes(req.user.phone)) {
      throw bad('This number is not registered as a Padhai Punjab admin.', 'role');
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.user.id);
    res.json({ user: meView(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  }));

  r.patch('/me', auth.requireAuth, h((req, res) => {
    const name = str(req.body?.name).slice(0, 60);
    if (!name) throw bad('Please enter your name.', 'name');
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
    res.json({ user: meView(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  }));

  function meView(u) {
    const tutor = db.prepare('SELECT id, first_name, last_name, home_safe_status, id_status FROM tutors WHERE user_id = ?').get(u.id);
    return {
      id: u.id,
      phone: u.phone,
      name: u.name,
      role: u.role,
      isAdminPhone: config.adminPhones.includes(u.phone),
      tutor: tutor ? { id: tutor.id, name: `${tutor.first_name} ${tutor.last_name}`, homeSafeStatus: tutor.home_safe_status, idStatus: tutor.id_status } : null,
    };
  }

  // ---- Find tutors ----
  r.get('/tutors', auth.requireAuth, h((req, res) => {
    const city = str(req.query.city);
    const cls = req.query.cls ? Number(req.query.cls) : null;
    const subject = str(req.query.subject);
    const board = str(req.query.board);
    const mode = str(req.query.mode); // 'home' | 'online' | ''
    const sort = str(req.query.sort) || 'best';

    if (city && !DISTRICTS.includes(city)) throw bad('Unknown city.', 'city');
    if (cls != null && !(cls >= 1 && cls <= 12)) throw bad('Class must be 1 to 12.', 'cls');
    if (subject && !SCHOOL_SUBJECTS.includes(subject) && !COLLEGE_SUBJECTS.includes(subject)) throw bad('Unknown subject.', 'subject');
    if (board && !BOARDS.includes(board)) throw bad('Unknown board.', 'board');
    if (mode && !['home', 'online'].includes(mode)) throw bad('Tuition type must be Home or Online.', 'mode');

    const rows = db.prepare('SELECT * FROM tutors WHERE suspended = 0 AND user_id != ?').all(req.user.id);
    const list = rows.filter((t) => {
      if (city && t.city !== city) return false;
      if (cls != null && !(t.class_from <= cls && cls <= t.class_to)) return false;
      if (subject && !json(t.school_subjects).includes(subject) && !json(t.college_subjects).includes(subject)) return false;
      if (board && !json(t.boards).includes(board)) return false;
      const home = homeEligibility(db, t).ok;
      const online = canTeachOnline(t);
      // Home search: ONLY tutors with all 8 safety checks approved (and not paused).
      if (mode === 'home') return home;
      if (mode === 'online') return online;
      return home || online;
    }).map((t) => publicTutor(db, t, { userId: req.user.id }));

    list.sort(sorter(sort));
    list.forEach((t, i) => { t.rank = i + 1; });
    res.json({ tutors: list, total: list.length });
  }));

  function sorter(sort) {
    if (sort === 'fee') return (a, b) => a.monthlyFee - b.monthlyFee || b.rating.trustScore - a.rating.trustScore;
    if (sort === 'experience') return (a, b) => b.experienceYears - a.experienceYears || b.rating.trustScore - a.rating.trustScore;
    return (a, b) => b.rating.trustScore - a.rating.trustScore || b.rating.count - a.rating.count || a.id - b.id;
  }

  // ---- One-hour / topic classes ----
  r.get('/session-tutors', auth.requireAuth, h((req, res) => {
    const level = str(req.query.level);
    const subject = str(req.query.subject);
    const kind = str(req.query.kind) || 'hour';
    if (!SESSION_LEVELS.includes(level)) throw bad('Choose Class 9, 10, 11, 12 or College.', 'level');
    if (!SUBJECTS_BY_LEVEL[level].includes(subject)) throw bad('Choose a subject for this level.', 'subject');
    if (!SESSION_KINDS[kind]) throw bad('Choose a class type.', 'kind');

    const rows = db.prepare('SELECT * FROM tutors WHERE suspended = 0 AND hour_price IS NOT NULL AND user_id != ?').all(req.user.id);
    const list = rows.filter((t) => teachesLevel(t, level, subject))
      .filter((t) => canTeachOnline(t) || homeEligibility(db, t).ok)
      .map((t) => {
        const p = publicTutor(db, t, { userId: req.user.id });
        return { ...p, price: kind === 'topic' ? t.topic_price : t.hour_price, nextFree: nextFree(db, t, kind) };
      })
      .sort((a, b) => b.rating.trustScore - a.rating.trustScore || a.price - b.price);
    list.forEach((t, i) => { t.rank = i + 1; });
    res.json({ tutors: list });
  }));

  r.get('/tutors/:id/slots', auth.requireAuth, h((req, res) => {
    const t = getTutor(db, Number(req.params.id));
    if (!t || t.suspended) throw notFound('Tutor not found.');
    const kind = SESSION_KINDS[req.query.kind] ? req.query.kind : 'hour';
    res.json({ days: freeSlots(db, t, kind) });
  }));

  // ---- Tutor profile + reviews ----
  r.get('/tutors/:id', auth.requireAuth, h((req, res) => {
    const t = getTutor(db, Number(req.params.id));
    const isOwner = t && t.user_id === req.user.id;
    if (!t || (t.suspended && !isOwner && req.user.role !== 'admin')) throw notFound('Tutor not found.');
    const reviews = db.prepare(`SELECT id, rating, comment, recommend, level_label, classes_attended, topic,
        reviewer_name, created_at, updated_at FROM reviews
      WHERE tutor_id = ? AND removed = 0 ORDER BY created_at DESC, id DESC`).all(t.id)
      .map(reviewView);
    res.json({ tutor: publicTutor(db, t, { userId: req.user.id }), reviews });
  }));

  // Profile photos are the only files readable by any logged-in user.
  r.get('/files/photo/:tutorId', h((req, res) => {
    const t = getTutor(db, Number(req.params.tutorId));
    if (!t?.photo_file) throw notFound('No photo.');
    const p = uploads.pathFor(t.photo_file);
    if (!fs.existsSync(p)) throw notFound('No photo.');
    res.set('Cache-Control', 'private, max-age=3600');
    res.sendFile(p);
  }));

  return r;
}

export function teachesLevel(t, level, subject) {
  if (level === 'College') return json(t.college_subjects).includes(subject);
  const cls = Number(level.replace('Class ', ''));
  return t.class_from != null && t.class_from <= cls && cls <= t.class_to && json(t.school_subjects).includes(subject);
}

export function reviewView(r) {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    recommend: !!r.recommend,
    levelLabel: r.level_label,
    classesAttended: r.classes_attended,
    topic: r.topic,
    reviewerName: r.reviewer_name,
    verified: true,
    createdAt: r.created_at,
    edited: r.updated_at !== r.created_at,
  };
}
