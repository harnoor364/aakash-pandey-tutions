import { Router } from 'express';
import {
  ADDRESS_PROOF_TYPES, ID_TYPES, INTERVIEW_TIMES, POLICE_MAX_AGE_MONTHS, REFERENCE_RELATIONSHIPS,
  SAFETY_STEPS, isAadhaar, isIndianMobile, isPunjabPin, maskAadhaar,
} from '../../../shared/constants.js';
import { json, tx } from '../db.js';
import { alertSafetyTeam, sendSms } from '../notify.js';
import { gradeQuiz, quizForClient } from '../quiz.js';
import {
  STEP_KEYS, codeMatches, getTutor, homeEligibility, issueVisitCode, policeValidUntil, publicTutor,
  ratingStats,
} from '../rules.js';
import { validateTutorProfile } from '../tutorProfile.js';
import { fileOf } from '../uploads.js';
import {
  ApiError, addDays, addMonths, bad, clock, conflict, fullName, h, isDateStr, istParts, notFound,
  randomCode, requireOneOf, requireText, str, todayIst, weekdayOf,
} from '../util.js';
import { reviewView } from './public.js';

export function tutorRoutes({ db, auth, uploads, config }) {
  const r = Router();
  r.use(auth.requireAuth, auth.requireRole('tutor'));

  /** Remove any files multer stored for this request (used when validation fails). */
  const cleanup = (req) => {
    const all = [req.file, ...Object.values(req.files || {}).flat()].filter(Boolean);
    all.forEach((f) => uploads.remove(f.filename));
  };
  const withUploads = (mw, handler) => [mw, h(async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (e) {
      cleanup(req);
      throw e;
    }
  })];

  function myTutor(req) {
    const t = db.prepare('SELECT * FROM tutors WHERE user_id = ?').get(req.user.id);
    if (!t) throw new ApiError(404, 'Please finish tutor sign-up first.');
    return t;
  }

  // ---------- Sign-up wizard ----------
  r.get('/signup-status', h((req, res) => {
    const t = db.prepare('SELECT id FROM tutors WHERE user_id = ?').get(req.user.id);
    res.json({ hasProfile: !!t, phone: req.user.phone });
  }));

  r.post('/signup', ...withUploads(
    uploads.docs.fields([{ name: 'photo', maxCount: 1 }, { name: 'idDoc', maxCount: 1 }, { name: 'qualCert', maxCount: 1 }]),
    (req, res) => {
      // One phone number = one tutor account (also enforced by UNIQUE(user_id)).
      if (db.prepare('SELECT 1 FROM tutors WHERE user_id = ?').get(req.user.id)) {
        throw conflict('This mobile number already has a tutor account. Please log in to it instead.', 'phone');
      }
      const v = validateTutorProfile(req.body || {}, { signup: true });
      const photo = fileOf(req, 'photo');
      const idDoc = fileOf(req, 'idDoc');
      if (!photo) throw bad('Please add a clear profile photo of your face.', 'photo');
      if (!photo.mimetype.startsWith('image/')) throw bad('Profile photo must be an image (JPG or PNG).', 'photo');
      if (!idDoc) throw bad(`Please upload a photo of your ${v.id_type}.`, 'idDoc');
      const qual = fileOf(req, 'qualCert');

      const cols = { ...v, user_id: req.user.id, photo_file: photo.filename, id_doc_file: idDoc.filename, qual_cert_file: qual?.filename ?? null };
      const keys = Object.keys(cols);
      const info = db.prepare(`INSERT INTO tutors (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
        .run(...keys.map((k) => cols[k]));
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(`${v.first_name} ${v.last_name}`, req.user.id);
      res.status(201).json({
        id: Number(info.lastInsertRowid),
        message: 'Your profile is live with "ID check pending". Finish the 8 safety checks to unlock home tuition.',
      });
    },
  ));

  r.get('/me', h((req, res) => {
    const t = myTutor(req);
    const home = homeEligibility(db, t);
    res.json({
      profile: publicTutor(db, t),
      private: {
        email: t.email,
        phone: req.user.phone,
        idType: t.id_type,
        idStatus: t.id_status,
        idRejectReason: t.id_reject_reason,
        homeSafeStatus: t.home_safe_status,
        homeSafeReason: t.home_safe_reason,
        homePaused: !!t.home_paused,
        suspended: !!t.suspended,
        offersHome: !!t.offers_home,
        homeUnlocked: home.ok,
        policeValidUntil: policeValidUntil(db, t.id),
      },
    });
  }));

  r.put('/profile', h((req, res) => {
    const t = myTutor(req);
    const v = validateTutorProfile(req.body || {});
    const keys = Object.keys(v);
    db.prepare(`UPDATE tutors SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => v[k]), t.id);
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(`${v.first_name} ${v.last_name}`, req.user.id);
    res.json({ ok: true, message: 'Profile saved.' });
  }));

  r.post('/photo', ...withUploads(uploads.images.single('photo'), (req, res) => {
    const t = myTutor(req);
    if (!req.file) throw bad('Please choose a photo.', 'photo');
    db.prepare('UPDATE tutors SET photo_file = ? WHERE id = ?').run(req.file.filename, t.id);
    uploads.remove(t.photo_file);
    res.json({ ok: true, message: 'Profile photo updated.' });
  }));

  r.post('/id-document', ...withUploads(uploads.docs.single('idDoc'), (req, res) => {
    const t = myTutor(req);
    if (t.id_status === 'verified') throw bad('Your ID is already verified.');
    const idType = requireOneOf(str(req.body?.idType), ID_TYPES, 'idType', 'an ID type');
    if (!req.file) throw bad('Please upload a photo of your ID.', 'idDoc');
    db.prepare("UPDATE tutors SET id_type = ?, id_doc_file = ?, id_status = 'pending', id_reject_reason = NULL WHERE id = ?")
      .run(idType, req.file.filename, t.id);
    uploads.remove(t.id_doc_file);
    res.json({ ok: true, message: 'ID uploaded. We will check it in 1–2 working days.' });
  }));

  // ---------- Demo requests ----------
  r.get('/demo-requests', h((req, res) => {
    const t = myTutor(req);
    const rows = db.prepare(`SELECT * FROM demo_requests WHERE tutor_id = ?
      ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC`).all(t.id);
    res.json({
      requests: rows.map((d) => ({
        id: d.id, parentName: d.parent_name, childName: d.child_name, cls: d.class, subject: d.subject,
        mode: d.mode, area: d.area, timeSlot: d.time_slot, status: d.status, createdAt: d.created_at,
        // Phone is shared with the tutor only after they accept.
        phone: d.status === 'accepted' ? d.phone : null,
      })),
    });
  }));

  r.post('/demo-requests/:id/:action', h((req, res) => {
    const t = myTutor(req);
    const d = db.prepare('SELECT * FROM demo_requests WHERE id = ? AND tutor_id = ?').get(Number(req.params.id), t.id);
    if (!d) throw notFound('Request not found.');
    if (d.status !== 'pending') throw bad('You have already answered this request.');
    if (req.params.action === 'decline') {
      db.prepare("UPDATE demo_requests SET status = 'declined' WHERE id = ?").run(d.id);
      return res.json({ ok: true, message: 'Request declined. The parent will be told.' });
    }
    if (req.params.action !== 'accept') throw notFound();
    if (t.suspended) throw bad('Your account is suspended. Please contact support.');
    if (d.mode === 'home') {
      const e = homeEligibility(db, t);
      if (!e.ok) {
        throw bad(t.home_safe_status !== 'approved'
          ? 'You can accept home tuition only after all 8 safety checks are approved. You can still teach this family online.'
          : e.reason.replace('This tutor', 'You'));
      }
    }
    tx(db, () => {
      db.prepare("UPDATE demo_requests SET status = 'accepted' WHERE id = ?").run(d.id);
      const info = db.prepare(`INSERT INTO enrolments (demo_request_id, parent_user_id, tutor_id, child_name, class, subject, mode, area)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(d.id, d.parent_user_id, t.id, d.child_name, d.class, d.subject, d.mode, d.area);
      if (d.mode === 'home') issueVisitCode(db, { enrolmentId: Number(info.lastInsertRowid) });
    });
    res.json({ ok: true, message: `Accepted. ${d.child_name} is now in My Students. Call ${d.parent_name} on ${d.phone} to fix the demo.` });
  }));

  // ---------- One-hour / topic classes ----------
  r.get('/sessions', h((req, res) => {
    const t = myTutor(req);
    const rows = db.prepare(`SELECT * FROM sessions WHERE tutor_id = ?
      ORDER BY CASE status WHEN 'waiting' THEN 0 WHEN 'booked' THEN 1 ELSE 2 END, day, start_hour`).all(t.id);
    res.json({
      sessions: rows.map((s) => ({
        id: s.id, level: s.level, subject: s.subject, topic: s.topic, confusing: s.confusing, kind: s.kind,
        price: s.price, day: s.day, startHour: s.start_hour, durationHours: s.duration_hours, mode: s.mode,
        area: s.area, studentName: s.student_name, status: s.status,
        phone: ['booked', 'please_confirm', 'completed'].includes(s.status) ? s.phone : null,
        startsInFuture: startsInFuture(s),
      })),
    });
  }));

  const startsInFuture = (s) => {
    const now = istParts();
    return s.day > now.date || (s.day === now.date && s.start_hour > now.hour);
  };

  r.post('/sessions/:id/:action', h((req, res) => {
    const t = myTutor(req);
    const s = db.prepare('SELECT * FROM sessions WHERE id = ? AND tutor_id = ?').get(Number(req.params.id), t.id);
    if (!s) throw notFound('Class not found.');
    const action = req.params.action;

    if (action === 'decline') {
      if (s.status !== 'waiting') throw bad('Only new requests can be declined.');
      db.prepare("UPDATE sessions SET status = 'declined' WHERE id = ?").run(s.id);
      return res.json({ ok: true, message: 'Marked as not free. The student will be told to pick another tutor.' });
    }
    if (action === 'accept') {
      if (s.status !== 'waiting') throw bad('This request has already been answered.');
      if (t.suspended) throw bad('Your account is suspended. Please contact support.');
      if (s.mode === 'home') {
        const e = homeEligibility(db, t);
        if (!e.ok) throw bad('You can accept home classes only after all 8 safety checks are approved and home visits are not paused.');
      }
      tx(db, () => {
        db.prepare("UPDATE sessions SET status = 'booked' WHERE id = ?").run(s.id);
        if (s.mode === 'home') issueVisitCode(db, { sessionId: s.id });
      });
      return res.json({ ok: true, message: `Booked. ${s.student_name} will see it in their classes.` });
    }
    if (action === 'done') {
      if (s.status !== 'booked') throw bad('Only booked classes can be marked as done.');
      if (startsInFuture(s)) throw bad("You can mark this class done after it has started.");
      if (s.mode === 'home') {
        const e = homeEligibility(db, t);
        if (!e.ok) throw bad('Home visits are paused on your account. Please contact the safety team.');
        if (!codeMatches(db, { sessionId: s.id }, req.body?.visitCode)) {
          throw bad("That home visit code isn't right. Ask the student's parent for the 4-digit code.", 'visitCode');
        }
      }
      tx(db, () => {
        db.prepare("UPDATE sessions SET status = 'please_confirm' WHERE id = ?").run(s.id);
        db.prepare('UPDATE visit_codes SET active = 0 WHERE session_id = ?').run(s.id);
      });
      return res.json({ ok: true, message: 'Marked as done. The student will be asked to confirm.' });
    }
    throw notFound();
  }));

  // ---------- My students & class logs ----------
  r.get('/students', h((req, res) => {
    const t = myTutor(req);
    const rows = db.prepare(`SELECT e.*, d.parent_name, d.phone FROM enrolments e LEFT JOIN demo_requests d ON d.id = e.demo_request_id
      WHERE e.tutor_id = ? ORDER BY e.status, e.created_at DESC`).all(t.id);
    res.json({
      homePaused: !!t.home_paused,
      students: rows.map((e) => ({
        id: e.id, childName: e.child_name, cls: e.class, subject: e.subject, mode: e.mode, area: e.area,
        status: e.status, parentName: e.parent_name, phone: e.phone,
        logs: db.prepare('SELECT * FROM class_logs WHERE enrolment_id = ? ORDER BY class_date DESC, id DESC').all(e.id)
          .map((l) => ({ id: l.id, date: l.class_date, topic: l.topic, parentConfirmed: l.parent_confirmed == null ? null : !!l.parent_confirmed })),
      })),
    });
  }));

  r.post('/enrolments/:id/logs', h((req, res) => {
    const t = myTutor(req);
    const e = db.prepare('SELECT * FROM enrolments WHERE id = ? AND tutor_id = ?').get(Number(req.params.id), t.id);
    if (!e) throw notFound('Student not found.');
    if (e.status !== 'active') throw bad('This tuition has ended.');
    const date = str(req.body?.date) || todayIst();
    if (!isDateStr(date)) throw bad('Choose the class date.', 'date');
    if (date > todayIst()) throw bad("You can't log a class in the future.", 'date');
    if (date < addDays(todayIst(), -7)) throw bad('You can only log classes from the last 7 days.', 'date');
    const topic = requireText(req.body?.topic, 'topic', 'what you taught', { min: 3, max: 120 });
    if (db.prepare('SELECT 1 FROM class_logs WHERE enrolment_id = ? AND class_date = ?').get(e.id, date)) {
      throw conflict('You already logged a class for this student on that day.', 'date');
    }
    if (e.mode === 'home') {
      const el = homeEligibility(db, t);
      if (!el.ok) throw bad('Home visits are paused on your account. Please contact the safety team.');
      if (!codeMatches(db, { enrolmentId: e.id }, req.body?.visitCode)) {
        throw bad("That home visit code isn't right. Ask the parent for the 4-digit code shown in their app.", 'visitCode');
      }
    }
    tx(db, () => {
      db.prepare('INSERT INTO class_logs (enrolment_id, class_date, topic, tutor_confirmed, visit_code_used) VALUES (?, ?, ?, 1, ?)')
        .run(e.id, date, topic, e.mode === 'home' ? 1 : 0);
      // A new code is made after every home class.
      if (e.mode === 'home') issueVisitCode(db, { enrolmentId: e.id });
    });
    res.status(201).json({ ok: true, message: 'Class logged. The parent will be asked to confirm.' });
  }));

  r.post('/enrolments/:id/end', h((req, res) => {
    const t = myTutor(req);
    const e = db.prepare('SELECT * FROM enrolments WHERE id = ? AND tutor_id = ?').get(Number(req.params.id), t.id);
    if (!e) throw notFound('Student not found.');
    tx(db, () => {
      db.prepare("UPDATE enrolments SET status = 'ended' WHERE id = ?").run(e.id);
      db.prepare('UPDATE visit_codes SET active = 0 WHERE enrolment_id = ?').run(e.id);
    });
    res.json({ ok: true, message: 'Tuition ended. It moves to past classes for the family.' });
  }));

  // ---------- My reviews ----------
  r.get('/reviews', h((req, res) => {
    const t = myTutor(req);
    const reviews = db.prepare('SELECT * FROM reviews WHERE tutor_id = ? AND removed = 0 ORDER BY created_at DESC, id DESC').all(t.id);
    res.json({ stats: ratingStats(db, t.id), reviews: reviews.map(reviewView) });
  }));

  // ---------- Home tuition safety checks ----------
  const checkRow = (tutorId, step) => db.prepare('SELECT * FROM safety_checks WHERE tutor_id = ? AND step = ?').get(tutorId, step);

  function assertEditable(t) {
    if (t.home_safe_status === 'under_review') {
      throw bad('Your checks are under review. You can make changes once the review is finished.');
    }
  }

  function saveStep(t, step, data, file) {
    tx(db, () => {
      const old = checkRow(t.id, step);
      db.prepare(`INSERT INTO safety_checks (tutor_id, step, status, data, file, updated_at) VALUES (?, ?, 'done', ?, ?, datetime('now'))
        ON CONFLICT(tutor_id, step) DO UPDATE SET status = 'done', data = excluded.data, file = excluded.file, updated_at = excluded.updated_at`)
        .run(t.id, step, JSON.stringify(data), file ?? null);
      if (old?.file && old.file !== file) uploads.remove(old.file);
      // Changing anything after approval (or rejection) sends the profile back for review:
      // home tuition locks again until an admin re-approves.
      if (t.home_safe_status === 'approved' || t.home_safe_status === 'rejected') {
        db.prepare("UPDATE tutors SET home_safe_status = 'not_submitted' WHERE id = ?").run(t.id);
      }
    });
  }

  r.get('/safety', h((req, res) => {
    const t = myTutor(req);
    const rows = db.prepare('SELECT * FROM safety_checks WHERE tutor_id = ?').all(t.id);
    const byStep = Object.fromEntries(rows.map((row) => [row.step, row]));
    const steps = SAFETY_STEPS.map((s) => {
      const row = byStep[s.key];
      return { ...s, status: row?.status === 'done' ? 'done' : 'not_started', summary: row ? summary(s.key, json(row.data, {})) : null, updatedAt: row?.updated_at ?? null };
    });
    const done = steps.filter((s) => s.status === 'done').length;
    const until = policeValidUntil(db, t.id);
    res.json({
      steps, done, total: steps.length,
      status: t.home_safe_status, reason: t.home_safe_reason,
      canSubmit: done === steps.length && ['not_submitted', 'rejected'].includes(t.home_safe_status),
      policeValidUntil: until,
      policeRenewSoon: !!until && until <= addDays(todayIst(), 30),
      homePaused: !!t.home_paused,
    });
  }));

  function summary(step, d) {
    switch (step) {
      case 'aadhaar': return `Verified · ${d.masked}`;
      case 'selfie': return 'Live selfie taken';
      case 'police': return `Certificate ${d.certNumber} · valid until ${d.validUntil}`;
      case 'address': return `PIN ${d.pin} · ${d.proofType} (private)`;
      case 'qualification': return `${d.degree}, ${d.university}`;
      case 'references': return (d.refs || []).map((x) => x.name).join(' and ');
      case 'training': return 'Passed the child-safety quiz';
      case 'interview': return `${d.date} at ${d.time}`;
      default: return null;
    }
  }

  // 1. Aadhaar e-KYC — only the masked number is ever stored.
  r.post('/safety/aadhaar/start', h(async (req, res) => {
    const t = myTutor(req);
    assertEditable(t);
    const num = str(req.body?.aadhaar).replace(/\s/g, '');
    if (!/^\d{12}$/.test(num)) throw bad('Aadhaar number must be 12 digits.', 'aadhaar');
    if (!isAadhaar(num)) throw bad('Aadhaar numbers never start with 0 or 1. Please check the number.', 'aadhaar');
    const code = config.fixedOtp || randomCode();
    db.prepare(`INSERT INTO aadhaar_otps (tutor_id, last4, code_hash, expires_at, attempts) VALUES (?, ?, ?, ?, 0)
      ON CONFLICT(tutor_id) DO UPDATE SET last4 = excluded.last4, code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`)
      .run(t.id, num.slice(-4), auth.hash(`aadhaar:${t.id}:${code}`), clock.now() + 10 * 60 * 1000);
    // In production this call goes to a licensed UIDAI e-KYC provider, which sends the OTP
    // to the Aadhaar-linked mobile. The full number is used for that call only, never saved.
    await sendSms(config, req.user.phone, `${code} is your Aadhaar verification code for Padhai Punjab.`);
    res.json({ ok: true, message: 'OTP sent to your Aadhaar-linked mobile number.', ...(config.devMode ? { devOtp: code } : {}) });
  }));

  r.post('/safety/aadhaar/verify', h((req, res) => {
    const t = myTutor(req);
    assertEditable(t);
    const row = db.prepare('SELECT * FROM aadhaar_otps WHERE tutor_id = ?').get(t.id);
    if (!row) throw bad('Please enter your Aadhaar number first.', 'aadhaar');
    const otp = str(req.body?.otp);
    if (!/^\d{4,6}$/.test(otp)) throw bad('Enter the OTP you received.', 'otp');
    if (row.expires_at < clock.now()) throw bad('The OTP has expired. Please ask for a new one.', 'otp');
    if (row.attempts >= 5) throw bad('Too many wrong tries. Please ask for a new OTP.', 'otp');
    if (row.code_hash !== auth.hash(`aadhaar:${t.id}:${otp}`)) {
      db.prepare('UPDATE aadhaar_otps SET attempts = attempts + 1 WHERE tutor_id = ?').run(t.id);
      throw bad("That OTP isn't right. Please try again.", 'otp');
    }
    saveStep(t, 'aadhaar', { masked: maskAadhaar(row.last4), verifiedAt: new Date(clock.now()).toISOString() });
    db.prepare('DELETE FROM aadhaar_otps WHERE tutor_id = ?').run(t.id);
    res.json({ ok: true, message: 'Aadhaar verified.' });
  }));

  // 2. Live selfie — front camera only (the app offers no gallery option for this step).
  r.post('/safety/selfie', ...withUploads(uploads.images.single('selfie'), (req, res) => {
    const t = myTutor(req);
    assertEditable(t);
    if (!req.file) throw bad('Please take a selfie with your front camera.', 'selfie');
    if (str(req.body?.source) !== 'front-camera') throw bad('The selfie must be taken live with the front camera.', 'selfie');
    saveStep(t, 'selfie', { capturedAt: new Date(clock.now()).toISOString(), source: 'front-camera' }, req.file.filename);
    res.json({ ok: true, message: 'Selfie saved. We will match it to your Aadhaar photo.' });
  }));

  // 3. Police verification certificate
  r.post('/safety/police', ...withUploads(uploads.docs.single('certificate'), (req, res) => {
    const t = myTutor(req);
    assertEditable(t);
    const certNumber = requireText(req.body?.certNumber, 'certNumber', 'the certificate number', { min: 4, max: 40 });
    const issueDate = str(req.body?.issueDate);
    if (!isDateStr(issueDate)) throw bad('Enter the issue date as shown on the certificate.', 'issueDate');
    const today = todayIst();
    if (issueDate > today) throw bad("The issue date can't be in the future.", 'issueDate');
    if (issueDate < addMonths(today, -POLICE_MAX_AGE_MONTHS)) {
      throw bad(`The certificate must be issued in the last ${POLICE_MAX_AGE_MONTHS} months. Please get a new one from your Saanjh Kendra or the PP Saanjh portal.`, 'issueDate');
    }
    if (!req.file) throw bad('Please upload a photo or PDF of the certificate.', 'certificate');
    const validUntil = addMonths(issueDate, 12);
    saveStep(t, 'police', { certNumber, issueDate, validUntil }, req.file.filename);
    res.json({ ok: true, message: `Police certificate saved. Valid until ${validUntil}.`, validUntil });
  }));

  // 4. Current address (never shown to families)
  r.post('/safety/address', ...withUploads(uploads.docs.single('proof'), (req, res) => {
    const t = myTutor(req);
    assertEditable(t);
    const address = requireText(req.body?.address, 'address', 'your full address', { min: 15, max: 300 });
    const pin = str(req.body?.pin);
    if (!/^\d{6}$/.test(pin)) throw bad('PIN code must be 6 digits.', 'pin');
    if (!isPunjabPin(pin)) throw bad('Please enter a Punjab PIN code (it starts with 14, 15 or 16).', 'pin');
    const proofType = requireOneOf(str(req.body?.proofType), ADDRESS_PROOF_TYPES, 'proofType', 'a proof type');
    if (!req.file) throw bad('Please upload your address proof.', 'proof');
    saveStep(t, 'address', { address, pin, proofType }, req.file.filename);
    res.json({ ok: true, message: 'Address saved. It stays private.' });
  }));

  // 5. Qualification certificate
  r.post('/safety/qualification', ...withUploads(uploads.docs.single('certificate'), (req, res) => {
    const t = myTutor(req);
    assertEditable(t);
    const degree = requireText(req.body?.degree, 'degree', 'your degree', { min: 2, max: 80 });
    const university = requireText(req.body?.university, 'university', 'the university or board', { min: 2, max: 120 });
    if (!req.file) throw bad('Please upload your degree or mark sheet.', 'certificate');
    saveStep(t, 'qualification', { degree, university }, req.file.filename);
    res.json({ ok: true, message: 'Qualification saved.' });
  }));

  // 6. Two references
  r.post('/safety/references', h((req, res) => {
    const t = myTutor(req);
    assertEditable(t);
    const refs = Array.isArray(req.body?.refs) ? req.body.refs : [];
    if (refs.length !== 2) throw bad('Please add exactly two references.');
    if (req.body?.notFamily !== true) throw bad('Please confirm that neither reference is a family member.', 'notFamily');
    const clean = refs.map((ref, i) => {
      const n = i + 1;
      const name = requireText(ref?.name, `refs.${i}.name`, `reference ${n}'s name`, { min: 2, max: 60 });
      const mobile = str(ref?.mobile);
      if (!isIndianMobile(mobile)) throw bad(`Reference ${n}: enter a valid 10-digit mobile number.`, `refs.${i}.mobile`);
      if (mobile === req.user.phone) throw bad(`Reference ${n} can't be your own number.`, `refs.${i}.mobile`);
      const relationship = requireOneOf(str(ref?.relationship), REFERENCE_RELATIONSHIPS, `refs.${i}.relationship`, `how you know reference ${n}`);
      return { name, mobile, relationship };
    });
    if (clean[0].mobile === clean[1].mobile) throw bad('The two references must have different mobile numbers.', 'refs.1.mobile');
    saveStep(t, 'references', { refs: clean });
    res.json({ ok: true, message: 'References saved. Our team may call them.' });
  }));

  // 7. Child safety training + quiz (all answers must be correct)
  r.get('/safety/quiz', h((_req, res) => res.json({ questions: quizForClient() })));

  r.post('/safety/training', h((req, res) => {
    const t = myTutor(req);
    assertEditable(t);
    if (req.body?.readRules !== true) throw bad('Please read and accept the child-safety rules first.');
    const { passed, wrong } = gradeQuiz(req.body?.answers);
    if (!passed) {
      return res.status(422).json({
        passed: false, wrong,
        error: `${wrong} answer${wrong === 1 ? ' was' : 's were'} not right. Please read the rules again and retry — all answers must be correct.`,
      });
    }
    saveStep(t, 'training', { passedAt: new Date(clock.now()).toISOString() });
    res.json({ passed: true, message: 'Well done — you passed the child-safety quiz.' });
  }));

  // 8. Video interview slot
  r.get('/safety/interview-slots', h((_req, res) => res.json({ days: interviewDays(), times: INTERVIEW_TIMES })));

  function interviewDays() {
    const out = [];
    for (let i = 1; out.length < 5 && i <= 7; i++) {
      const d = addDays(todayIst(), i);
      if (weekdayOf(d) !== 'Sun') out.push(d);
    }
    return out;
  }

  r.post('/safety/interview', h((req, res) => {
    const t = myTutor(req);
    assertEditable(t);
    const date = str(req.body?.date);
    const time = str(req.body?.time);
    if (!interviewDays().includes(date)) throw bad('Pick a day from the next 5 working days (no Sundays).', 'date');
    if (!INTERVIEW_TIMES.includes(time)) throw bad('Pick 11 am, 3 pm or 6 pm.', 'time');
    saveStep(t, 'interview', { date, time });
    res.json({ ok: true, message: 'Interview booked. We will send the video link by SMS.' });
  }));

  r.post('/safety/submit', h(async (req, res) => {
    const t = myTutor(req);
    if (!['not_submitted', 'rejected'].includes(t.home_safe_status)) throw bad('Your checks are already submitted.');
    const done = db.prepare("SELECT step FROM safety_checks WHERE tutor_id = ? AND status = 'done'").all(t.id).map((x) => x.step);
    const missing = STEP_KEYS.filter((k) => !done.includes(k));
    if (missing.length) throw bad(`Please finish all 8 checks first. ${missing.length} left.`);
    db.prepare("UPDATE tutors SET home_safe_status = 'under_review', home_safe_reason = NULL WHERE id = ?").run(t.id);
    await alertSafetyTeam(config, `${fullName(t)} (tutor #${t.id}) submitted safety checks for review`, {});
    res.json({ ok: true, message: 'Submitted. Under review (3–5 working days).' });
  }));

  return r;
}
