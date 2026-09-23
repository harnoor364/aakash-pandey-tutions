import fs from 'node:fs';
import { Router } from 'express';
import { SAFETY_STEPS } from '../../../shared/constants.js';
import { json, tx } from '../db.js';
import { STEP_KEYS, getTutor, publicTutor } from '../rules.js';
import { bad, fullName, h, notFound, requireText, str } from '../util.js';
import { reviewView } from './public.js';

export const REVIEW_REMOVAL_REASONS = [
  'Abusive, hateful or sexual language',
  'Shares personal or contact details',
  'Spam or advertising',
  'Not about the tutoring',
  'Paid, rewarded or fake review',
];

export function adminRoutes({ db, auth, uploads }) {
  const r = Router();
  r.use(auth.requireAuth, auth.requireRole('admin'));

  const log = (req, action, target, details) => db.prepare(
    'INSERT INTO admin_log (admin_user_id, action, target, details) VALUES (?, ?, ?, ?)',
  ).run(req.user.id, action, target, details ? JSON.stringify(details) : null);

  const fileUrl = (name) => (name ? `/admin/files/${name}` : null);

  // Private documents are only readable here, by admins.
  r.get('/files/:name', h((req, res) => {
    const p = uploads.pathFor(req.params.name);
    if (!fs.existsSync(p)) throw notFound('File not found.');
    res.set('Cache-Control', 'no-store');
    res.sendFile(p);
  }));

  r.get('/queue', h((_req, res) => {
    const rows = db.prepare(`SELECT * FROM tutors WHERE home_safe_status = 'under_review' OR id_status = 'pending'
      ORDER BY CASE home_safe_status WHEN 'under_review' THEN 0 ELSE 1 END, created_at`).all();
    res.json({
      tutors: rows.map((t) => ({
        id: t.id, name: fullName(t), city: t.city, photoUrl: fileUrl(t.photo_file),
        homeSafeStatus: t.home_safe_status, idStatus: t.id_status, createdAt: t.created_at,
        stepsDone: db.prepare("SELECT COUNT(*) AS n FROM safety_checks WHERE tutor_id = ? AND status = 'done'").get(t.id).n,
      })),
    });
  }));

  r.get('/tutors/:id', h((req, res) => {
    const t = getTutor(db, Number(req.params.id));
    if (!t) throw notFound('Tutor not found.');
    const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(t.user_id);
    const rows = db.prepare('SELECT * FROM safety_checks WHERE tutor_id = ?').all(t.id);
    const checks = SAFETY_STEPS.map((s) => {
      const row = rows.find((x) => x.step === s.key);
      return { key: s.key, title: s.title, done: row?.status === 'done', data: row ? json(row.data, {}) : null, fileUrl: fileUrl(row?.file), updatedAt: row?.updated_at ?? null };
    });
    res.json({
      tutor: publicTutor(db, t),
      private: {
        phone: user.phone, email: t.email, idType: t.id_type, idStatus: t.id_status, idRejectReason: t.id_reject_reason,
        idDocUrl: fileUrl(t.id_doc_file), qualCertUrl: fileUrl(t.qual_cert_file), photoUrl: fileUrl(t.photo_file),
        homeSafeStatus: t.home_safe_status, homeSafeReason: t.home_safe_reason, homePaused: !!t.home_paused,
        suspended: !!t.suspended,
      },
      checks,
      reports: db.prepare('SELECT id, reason, status, created_at FROM reports WHERE tutor_id = ? ORDER BY id DESC').all(t.id),
    });
  }));

  r.post('/tutors/:id/id-check', h((req, res) => {
    const t = getTutor(db, Number(req.params.id));
    if (!t) throw notFound('Tutor not found.');
    if (req.body?.approve === true) {
      db.prepare("UPDATE tutors SET id_status = 'verified', id_reject_reason = NULL WHERE id = ?").run(t.id);
      log(req, 'id_verified', `tutor:${t.id}`);
      return res.json({ ok: true, message: `${t.first_name}'s ID is verified.` });
    }
    const reason = requireText(req.body?.reason, 'reason', 'a reason the tutor will see', { min: 5, max: 300 });
    db.prepare("UPDATE tutors SET id_status = 'rejected', id_reject_reason = ? WHERE id = ?").run(reason, t.id);
    log(req, 'id_rejected', `tutor:${t.id}`, { reason });
    res.json({ ok: true, message: 'ID rejected. The tutor will be asked to upload again.' });
  }));

  r.post('/tutors/:id/home-safe', h((req, res) => {
    const t = getTutor(db, Number(req.params.id));
    if (!t) throw notFound('Tutor not found.');
    if (t.home_safe_status !== 'under_review') throw bad('This tutor has not submitted their checks for review.');
    if (req.body?.approve === true) {
      const done = db.prepare("SELECT step FROM safety_checks WHERE tutor_id = ? AND status = 'done'").all(t.id).map((x) => x.step);
      if (STEP_KEYS.some((k) => !done.includes(k))) throw bad('All 8 checks must be done before approval.');
      if (t.id_status !== 'verified') throw bad("Verify the tutor's ID first.");
      db.prepare("UPDATE tutors SET home_safe_status = 'approved', home_safe_reason = NULL, home_safe_approved_at = datetime('now') WHERE id = ?").run(t.id);
      log(req, 'home_safe_approved', `tutor:${t.id}`);
      return res.json({ ok: true, message: `${t.first_name} is now 🛡 Home-safe verified. Home tuition is unlocked.` });
    }
    const reason = requireText(req.body?.reason, 'reason', 'a reason the tutor will see', { min: 5, max: 300 });
    db.prepare("UPDATE tutors SET home_safe_status = 'rejected', home_safe_reason = ? WHERE id = ?").run(reason, t.id);
    log(req, 'home_safe_rejected', `tutor:${t.id}`, { reason });
    res.json({ ok: true, message: 'Rejected. The tutor will see your reason.' });
  }));

  // ---------- Safety reports ----------
  r.get('/reports', h((_req, res) => {
    const rows = db.prepare(`SELECT r.*, u.phone AS reporter_phone, u.name AS reporter_name, t.first_name, t.last_name, t.home_paused, t.suspended
      FROM reports r JOIN users u ON u.id = r.reporter_user_id JOIN tutors t ON t.id = r.tutor_id
      ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC`).all();
    res.json({
      reports: rows.map((x) => ({
        id: x.id, tutorId: x.tutor_id, tutorName: `${x.first_name} ${x.last_name}`, reason: x.reason, details: x.details,
        status: x.status, reporterName: x.reporter_name, reporterPhone: x.reporter_phone, parentContacted: !!x.parent_contacted,
        adminNotes: x.admin_notes, createdAt: x.created_at, homePaused: !!x.home_paused, tutorSuspended: !!x.suspended,
      })),
    });
  }));

  r.post('/reports/:id', h((req, res) => {
    const rep = db.prepare('SELECT * FROM reports WHERE id = ?').get(Number(req.params.id));
    if (!rep) throw notFound('Report not found.');
    const action = str(req.body?.action);
    const notes = str(req.body?.notes).slice(0, 2000) || null;
    const setNotes = () => notes && db.prepare('UPDATE reports SET admin_notes = ? WHERE id = ?').run(notes, rep.id);

    if (action === 'contacted') {
      db.prepare('UPDATE reports SET parent_contacted = 1 WHERE id = ?').run(rep.id);
      setNotes();
      log(req, 'report_parent_contacted', `report:${rep.id}`, { notes });
      return res.json({ ok: true, message: 'Marked as contacted.' });
    }
    if (action === 'keep_pause') {
      tx(db, () => {
        db.prepare("UPDATE reports SET status = 'pause_kept' WHERE id = ?").run(rep.id);
        db.prepare('UPDATE tutors SET home_paused = 1 WHERE id = ?').run(rep.tutor_id);
        setNotes();
      });
      log(req, 'report_keep_pause', `report:${rep.id}`, { notes });
      return res.json({ ok: true, message: 'Home visits stay paused.' });
    }
    if (action === 'lift_pause') {
      const otherOpen = db.prepare("SELECT COUNT(*) AS n FROM reports WHERE tutor_id = ? AND id != ? AND status IN ('open','pause_kept')").get(rep.tutor_id, rep.id).n;
      if (otherOpen) throw bad(`This tutor has ${otherOpen} other open report${otherOpen > 1 ? 's' : ''}. Resolve those before lifting the pause.`);
      if (!notes) throw bad('Please add a note explaining why the pause is safe to lift.', 'notes');
      tx(db, () => {
        db.prepare("UPDATE reports SET status = 'pause_lifted' WHERE id = ?").run(rep.id);
        db.prepare('UPDATE tutors SET home_paused = 0 WHERE id = ?').run(rep.tutor_id);
        setNotes();
      });
      log(req, 'report_lift_pause', `report:${rep.id}`, { notes });
      return res.json({ ok: true, message: 'Pause lifted. Home visits can continue.' });
    }
    if (action === 'suspend') {
      tx(db, () => {
        db.prepare("UPDATE reports SET status = 'tutor_suspended' WHERE id = ?").run(rep.id);
        db.prepare('UPDATE tutors SET suspended = 1, home_paused = 1 WHERE id = ?').run(rep.tutor_id);
        // Stop all upcoming bookings and invalidate visit codes.
        db.prepare("UPDATE sessions SET status = 'cancelled' WHERE tutor_id = ? AND status IN ('waiting','booked')").run(rep.tutor_id);
        db.prepare("UPDATE demo_requests SET status = 'declined' WHERE tutor_id = ? AND status = 'pending'").run(rep.tutor_id);
        db.prepare(`UPDATE visit_codes SET active = 0 WHERE enrolment_id IN (SELECT id FROM enrolments WHERE tutor_id = ?)
          OR session_id IN (SELECT id FROM sessions WHERE tutor_id = ?)`).run(rep.tutor_id, rep.tutor_id);
        setNotes();
      });
      log(req, 'tutor_suspended', `tutor:${rep.tutor_id}`, { report: rep.id, notes });
      return res.json({ ok: true, message: 'Tutor suspended. They are hidden from all searches.' });
    }
    throw bad('Unknown action.');
  }));

  // ---------- Reviews (removal only for policy violations, always logged) ----------
  r.get('/reviews', h((req, res) => {
    const tutorId = req.query.tutorId ? Number(req.query.tutorId) : null;
    const rows = db.prepare(`SELECT r.*, t.first_name, t.last_name FROM reviews r JOIN tutors t ON t.id = r.tutor_id
      WHERE r.removed = 0 ${tutorId ? 'AND r.tutor_id = ?' : ''} ORDER BY r.created_at DESC LIMIT 200`).all(...(tutorId ? [tutorId] : []));
    const removals = db.prepare(`SELECT m.*, u.phone AS admin_phone FROM review_removals m JOIN users u ON u.id = m.admin_user_id
      ORDER BY m.id DESC LIMIT 100`).all();
    res.json({
      reasons: REVIEW_REMOVAL_REASONS,
      reviews: rows.map((x) => ({ ...reviewView(x), tutorId: x.tutor_id, tutorName: `${x.first_name} ${x.last_name}` })),
      removals: removals.map((m) => ({ id: m.id, reviewId: m.review_id, reason: m.reason, adminPhone: m.admin_phone, createdAt: m.created_at, snapshot: json(m.snapshot, {}) })),
    });
  }));

  r.post('/reviews/:id/remove', h((req, res) => {
    const rv = db.prepare('SELECT * FROM reviews WHERE id = ? AND removed = 0').get(Number(req.params.id));
    if (!rv) throw notFound('Review not found.');
    const reason = str(req.body?.reason);
    if (!REVIEW_REMOVAL_REASONS.includes(reason)) {
      throw bad('Reviews can only be removed for a policy violation. Please choose one.', 'reason');
    }
    tx(db, () => {
      db.prepare('UPDATE reviews SET removed = 1 WHERE id = ?').run(rv.id);
      db.prepare('INSERT INTO review_removals (review_id, admin_user_id, reason, snapshot) VALUES (?, ?, ?, ?)')
        .run(rv.id, req.user.id, reason, JSON.stringify({ rating: rv.rating, comment: rv.comment, tutorId: rv.tutor_id }));
    });
    log(req, 'review_removed', `review:${rv.id}`, { reason });
    res.json({ ok: true, message: 'Review removed and logged.' });
  }));

  return r;
}
