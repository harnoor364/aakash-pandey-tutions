import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { trustScore } from '../../shared/constants.js';
import { createApp, loadConfig } from '../src/app.js';
import { openDb } from '../src/db.js';
import { QUIZ } from '../src/quiz.js';
import { seed } from '../src/seed.js';
import { addDays, addMonths, todayIst } from '../src/util.js';

let server; let base; let db; let tmp;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'padhai-'));
  const config = { ...loadConfig({ NODE_ENV: 'test', DATA_DIR: tmp }), quiet: true, fixedOtp: null };
  db = openDb(':memory:');
  seed(db);
  const { app } = createApp(config, db);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function call(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(base + url, { method, headers, body: payload });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function login(phone, role) {
  const otp = await call('POST', '/auth/otp', { body: { phone } });
  assert.equal(otp.status, 200, JSON.stringify(otp.data));
  const v = await call('POST', '/auth/verify', { body: { phone, otp: otp.data.devOtp } });
  assert.equal(v.status, 200);
  if (role && v.data.user.role !== role) {
    const r = await call('POST', '/me/role', { token: v.data.token, body: { role } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
  return v.data.token;
}

const tutorByName = (first) => db.prepare('SELECT * FROM tutors WHERE first_name = ?').get(first);
const png = () => new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' });

describe('login', () => {
  test('rejects numbers that are not Indian mobiles', async () => {
    for (const phone of ['5876500000', '98765', '98765000001', 'abcdefghij']) {
      const r = await call('POST', '/auth/otp', { body: { phone } });
      assert.equal(r.status, 400);
      assert.equal(r.data.field, 'phone');
    }
  });

  test('wrong OTP is refused, right OTP logs in, admin role needs an admin phone', async () => {
    const sent = await call('POST', '/auth/otp', { body: { phone: '9123456780' } });
    const other = String((Number(sent.data.devOtp) + 1) % 10000).padStart(4, '0');
    const wrong = await call('POST', '/auth/verify', { body: { phone: '9123456780', otp: other } });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.data.field, 'otp');
    const resend = await call('POST', '/auth/otp', { body: { phone: '9123456780' } });
    assert.equal(resend.status, 429, 'resend is rate-limited');
    const token = await login('9123456789');
    const admin = await call('POST', '/me/role', { token, body: { role: 'admin' } });
    assert.equal(admin.status, 400);
  });
});

describe('home tuition safety', () => {
  test('home search shows only tutors with all 8 checks approved', async () => {
    const token = await login('9876500001');
    const r = await call('GET', '/tutors?mode=home', { token });
    assert.equal(r.status, 200);
    const names = r.data.tutors.map((t) => t.firstName);
    assert.ok(names.includes('Harpreet'));
    assert.ok(!names.includes('Neha'), 'Neha has not finished safety checks');
    assert.ok(!names.includes('Simran'));
    r.data.tutors.forEach((t) => assert.equal(t.badges.homeSafe, true));

    const online = await call('GET', '/tutors?mode=online&city=Ludhiana', { token });
    assert.ok(online.data.tutors.some((t) => t.firstName === 'Neha' && !t.homeAvailable && !t.badges.homeSafe));
  });

  test('a home demo cannot be booked with an unapproved tutor', async () => {
    const token = await login('9876500001');
    const neha = tutorByName('Neha');
    const r = await call('POST', '/parent/demo-requests', {
      token,
      body: { tutorId: neha.id, parentName: 'Gurpreet Kaur', phone: '9876500001', childName: 'Ekam', cls: 5, subject: 'English', mode: 'home', area: 'Dugri', timeSlot: 'Evening (5–9 pm)' },
    });
    assert.equal(r.status, 400);
    assert.equal(r.data.field, 'mode');
  });

  test('visit code: parent-only, required to log, rotates after each class', async () => {
    const parent = await login('9555000001', 'parent');
    const harpreet = tutorByName('Harpreet');
    const demo = await call('POST', '/parent/demo-requests', {
      token: parent,
      body: { tutorId: harpreet.id, parentName: 'Baljit Singh', phone: '9555000001', childName: 'Noor', cls: 10, subject: 'Maths', mode: 'home', area: 'Model Town', timeSlot: 'Evening (5–9 pm)' },
    });
    assert.equal(demo.status, 201, JSON.stringify(demo.data));

    const tutor = await login('9815010000');
    const accept = await call('POST', `/tutor/demo-requests/${demo.data.id}/accept`, { token: tutor });
    assert.equal(accept.status, 200, JSON.stringify(accept.data));

    const mine = await call('GET', '/parent/my-tutors', { token: parent });
    const enrol = mine.data.active.find((a) => a.tutorId === harpreet.id);
    assert.match(enrol.visitCode, /^\d{4}$/);

    const students = await call('GET', '/tutor/students', { token: tutor });
    assert.ok(!JSON.stringify(students.data).includes(`"visitCode"`), 'tutor never receives the code');

    const noCode = await call('POST', `/tutor/enrolments/${enrol.id}/logs`, { token: tutor, body: { topic: 'Real numbers' } });
    assert.equal(noCode.status, 400);
    assert.equal(noCode.data.field, 'visitCode');

    const ok = await call('POST', `/tutor/enrolments/${enrol.id}/logs`, { token: tutor, body: { topic: 'Real numbers', visitCode: enrol.visitCode } });
    assert.equal(ok.status, 201);
    assert.equal(ok.data.message, 'Class logged. The parent will be asked to confirm.');

    const after = await call('GET', '/parent/my-tutors', { token: parent });
    const newCode = after.data.active.find((a) => a.id === enrol.id).visitCode;
    assert.notEqual(newCode, enrol.visitCode);

    // Old code no longer works.
    const reuse = await call('POST', `/tutor/enrolments/${enrol.id}/logs`, { token: tutor, body: { topic: 'Polynomials', date: addDays(todayIst(), -1), visitCode: enrol.visitCode } });
    assert.equal(reuse.status, 400);
  });

  test('a safety report pauses all home visits until an admin lifts it', async () => {
    const parent = await login('9876500001');
    const harpreet = tutorByName('Harpreet');
    const r = await call('POST', '/parent/reports', {
      token: parent, body: { tutorId: harpreet.id, reason: 'Came without a booking or visit code', details: 'Test' },
    });
    assert.equal(r.status, 201);
    assert.match(r.data.message, /within 2 hours/);

    const home = await call('GET', '/tutors?mode=home', { token: parent });
    assert.ok(!home.data.tutors.some((t) => t.id === harpreet.id));

    const admin = await login('9876500000');
    const noNote = await call('POST', `/admin/reports/${r.data.id}`, { token: admin, body: { action: 'lift_pause' } });
    assert.equal(noNote.status, 400);
    const lift = await call('POST', `/admin/reports/${r.data.id}`, { token: admin, body: { action: 'lift_pause', notes: 'Spoke to family; misunderstanding about timing.' } });
    assert.equal(lift.status, 200);
    const again = await call('GET', '/tutors?mode=home', { token: parent });
    assert.ok(again.data.tutors.some((t) => t.id === harpreet.id));
  });

  test('strangers cannot report a tutor they never booked', async () => {
    const token = await login('9555000077', 'parent');
    const r = await call('POST', '/parent/reports', { token, body: { tutorId: tutorByName('Ritika').id, reason: 'Something else', details: 'x' } });
    assert.equal(r.status, 403);
  });
});

describe('verified reviews', () => {
  test('tuition review unlocks only after 4 classes logged by tutor AND confirmed by parent', async () => {
    const parent = await login('9876500001');
    const harpreet = tutorByName('Harpreet');
    const body = { rating: 5, comment: 'Very patient teacher, explains every step clearly.', recommend: true };

    let e = await call('GET', `/parent/tutors/${harpreet.id}/review-eligibility`, { token: parent });
    assert.equal(e.data.eligible, false);
    assert.equal(e.data.needed, 2);
    const locked = await call('PUT', `/parent/tutors/${harpreet.id}/review`, { token: parent, body });
    assert.equal(locked.status, 403);

    // Confirm the pending seeded log (3 confirmed) — still locked.
    const mine = await call('GET', '/parent/my-tutors', { token: parent });
    const enrol = mine.data.active.find((a) => a.tutorId === harpreet.id && a.childName === 'Jasleen');
    const pending = enrol.logs.find((l) => l.parentConfirmed === null);
    assert.equal((await call('POST', `/parent/class-logs/${pending.id}/confirm`, { token: parent, body: { attended: true } })).status, 200);
    assert.equal((await call('POST', `/parent/class-logs/${pending.id}/confirm`, { token: parent, body: { attended: true } })).status, 400, 'cannot answer twice');
    e = await call('GET', `/parent/tutors/${harpreet.id}/review-eligibility`, { token: parent });
    assert.equal(e.data.needed, 1);

    // Tutor logs a 4th class with the visit code; parent says "No" — still locked.
    const tutor = await login('9815010000');
    const code = (await call('GET', '/parent/my-tutors', { token: parent })).data.active.find((a) => a.id === enrol.id).visitCode;
    const log = await call('POST', `/tutor/enrolments/${enrol.id}/logs`, { token: tutor, body: { topic: 'Triangles', visitCode: code } });
    assert.equal(log.status, 201);
    let logs = (await call('GET', '/parent/my-tutors', { token: parent })).data.active.find((a) => a.id === enrol.id).logs;
    await call('POST', `/parent/class-logs/${logs[0].id}/confirm`, { token: parent, body: { attended: false } });
    e = await call('GET', `/parent/tutors/${harpreet.id}/review-eligibility`, { token: parent });
    assert.equal(e.data.eligible, false);

    // Another class, confirmed "Yes" → unlocked.
    const code2 = (await call('GET', '/parent/my-tutors', { token: parent })).data.active.find((a) => a.id === enrol.id).visitCode;
    await call('POST', `/tutor/enrolments/${enrol.id}/logs`, { token: tutor, body: { topic: 'Circles', date: addDays(todayIst(), -1), visitCode: code2 } });
    logs = (await call('GET', '/parent/my-tutors', { token: parent })).data.active.find((a) => a.id === enrol.id).logs;
    const fresh = logs.find((l) => l.parentConfirmed === null);
    await call('POST', `/parent/class-logs/${fresh.id}/confirm`, { token: parent, body: { attended: true } });
    e = await call('GET', `/parent/tutors/${harpreet.id}/review-eligibility`, { token: parent });
    assert.equal(e.data.eligible, true);

    const short = await call('PUT', `/parent/tutors/${harpreet.id}/review`, { token: parent, body: { ...body, comment: 'Good teacher' } });
    assert.equal(short.status, 400);
    assert.equal(short.data.field, 'comment');

    const created = await call('PUT', `/parent/tutors/${harpreet.id}/review`, { token: parent, body });
    assert.equal(created.status, 201);
    const edited = await call('PUT', `/parent/tutors/${harpreet.id}/review`, { token: parent, body: { ...body, rating: 4 } });
    assert.equal(edited.status, 200);
    const count = db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE tutor_id = ? AND family_user_id = (SELECT id FROM users WHERE phone = ?)').get(harpreet.id, '9876500001').n;
    assert.equal(count, 1, 'one review per family per tutor');

    const profile = await call('GET', `/tutors/${harpreet.id}`, { token: parent });
    const mineReview = profile.data.reviews[0];
    assert.equal(mineReview.verified, true);
    assert.equal(mineReview.levelLabel, 'Class 10 · Maths');
    assert.equal(mineReview.classesAttended, 4);
  });

  test('one-hour class rating unlocks only after tutor marks done AND student confirms', async () => {
    const student = await login('9555000002', 'parent');
    const arjun = tutorByName('Arjun');
    const slots = await call('GET', `/tutors/${arjun.id}/slots?kind=hour`, { token: student });
    const day = slots.data.days.find((d) => d.hours.length);
    const book = await call('POST', '/parent/sessions', {
      token: student,
      body: { tutorId: arjun.id, level: 'College', subject: 'Java', topic: 'OOP – inheritance', kind: 'hour', day: day.day, startHour: day.hours[0], mode: 'online', studentName: 'Ravi', phone: '9555000002' },
    });
    assert.equal(book.status, 201, JSON.stringify(book.data));

    // Same slot can't be double-booked.
    const dup = await call('POST', '/parent/sessions', {
      token: student,
      body: { tutorId: arjun.id, level: 'College', subject: 'Java', topic: 'Threads', kind: 'hour', day: day.day, startHour: day.hours[0], mode: 'online', studentName: 'Ravi', phone: '9555000002' },
    });
    assert.equal(dup.status, 409);

    const tutor = await login('9815010010');
    assert.equal((await call('POST', `/tutor/sessions/${book.data.id}/accept`, { token: tutor })).status, 200);
    const early = await call('POST', `/tutor/sessions/${book.data.id}/done`, { token: tutor });
    assert.equal(early.status, 400, 'cannot mark a future class done');

    db.prepare('UPDATE sessions SET day = ? WHERE id = ?').run(addDays(todayIst(), -1), book.data.id);
    let e = await call('GET', `/parent/tutors/${arjun.id}/review-eligibility`, { token: student });
    assert.equal(e.data.eligible, false);
    assert.equal((await call('POST', `/tutor/sessions/${book.data.id}/done`, { token: tutor })).status, 200);
    e = await call('GET', `/parent/tutors/${arjun.id}/review-eligibility`, { token: student });
    assert.equal(e.data.eligible, false, 'student has not confirmed yet');
    assert.equal((await call('POST', `/parent/sessions/${book.data.id}/confirm`, { token: student, body: { attended: true } })).status, 200);
    e = await call('GET', `/parent/tutors/${arjun.id}/review-eligibility`, { token: student });
    assert.equal(e.data.eligible, true);
    assert.equal(e.data.levelLabel, 'College · Java');
  });

  test('trust score ranks 30 reviews at 4.8 above 2 reviews at 5.0', async () => {
    assert.equal(trustScore([5, 5]), (32 + 10) / 10);
    assert.ok(trustScore(Array(90).fill(4.8)) > trustScore([5, 5]));
    const token = await login('9876500001');
    const r = await call('GET', '/tutors?city=Ludhiana', { token });
    const rank = (n) => r.data.tutors.find((t) => t.firstName === n).rank;
    assert.ok(rank('Harpreet') < rank('Neha'));
    assert.equal(r.data.tutors[0].rank, 1);
  });

  test('admin can remove a review only with a policy reason, and it is logged', async () => {
    const admin = await login('9876500000');
    const list = await call('GET', '/admin/reviews', { token: admin });
    const id = list.data.reviews[0].id;
    assert.equal((await call('POST', `/admin/reviews/${id}/remove`, { token: admin, body: { reason: 'I disagree' } })).status, 400);
    assert.equal((await call('POST', `/admin/reviews/${id}/remove`, { token: admin, body: { reason: 'Spam or advertising' } })).status, 200);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM review_removals WHERE review_id = ?').get(id).n, 1);
  });
});

describe('tutor sign-up and safety checks', () => {
  let token;
  const phone = '9555000100';
  const profile = {
    firstName: 'Test', lastName: 'Tutor', city: 'Patiala', areas: JSON.stringify(['Tripuri']), qualification: 'M.Sc.',
    experienceYears: '3', languages: JSON.stringify(['Punjabi']), intro: 'I teach Maths with patience and lots of practice questions for every chapter.',
    classFrom: '6', classTo: '10', schoolSubjects: JSON.stringify(['Maths']), boards: JSON.stringify(['PSEB']), collegeSubjects: '[]',
    offersHome: 'true', offersOnline: 'true', monthlyFee: '2000', hourPrice: '', topicPrice: '',
    availableDays: JSON.stringify(['Mon']), availableTimes: JSON.stringify(['evening']), idType: 'PAN',
    agreeNoIncentives: 'true', agreeBackground: 'true',
  };
  const form = (fields, files = {}) => {
    const f = new FormData();
    Object.entries(fields).forEach(([k, v]) => f.append(k, v));
    Object.entries(files).forEach(([k, v]) => f.append(k, v, `${k}.png`));
    return f;
  };

  before(async () => { token = await login(phone, 'tutor'); });

  test('validates the wizard and blocks a second account for the same number', async () => {
    const shortIntro = await call('POST', '/tutor/signup', { token, form: form({ ...profile, intro: 'Too short' }, { photo: png(), idDoc: png() }) });
    assert.equal(shortIntro.data.field, 'intro');
    const lowFee = await call('POST', '/tutor/signup', { token, form: form({ ...profile, monthlyFee: '400' }, { photo: png(), idDoc: png() }) });
    assert.equal(lowFee.data.field, 'monthlyFee');
    const topicLow = await call('POST', '/tutor/signup', { token, form: form({ ...profile, hourPrice: '500', topicPrice: '400' }, { photo: png(), idDoc: png() }) });
    assert.equal(topicLow.data.field, 'topicPrice');
    const collegeNoPrice = await call('POST', '/tutor/signup', { token, form: form({ ...profile, collegeSubjects: JSON.stringify(['Java']) }, { photo: png(), idDoc: png() }) });
    assert.equal(collegeNoPrice.data.field, 'hourPrice');
    const noAgree = await call('POST', '/tutor/signup', { token, form: form({ ...profile, agreeBackground: 'false' }, { photo: png(), idDoc: png() }) });
    assert.equal(noAgree.data.field, 'agreeBackground');

    const ok = await call('POST', '/tutor/signup', { token, form: form(profile, { photo: png(), idDoc: png() }) });
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
    const dup = await call('POST', '/tutor/signup', { token, form: form(profile, { photo: png(), idDoc: png() }) });
    assert.equal(dup.status, 409);

    const me = await call('GET', '/tutor/me', { token });
    assert.equal(me.data.private.idStatus, 'pending');
    assert.equal(me.data.profile.homeAvailable, false, 'home tuition stays locked');
  });

  test('each safety step enforces its rules; submit needs all 8', async () => {
    const early = await call('POST', '/tutor/safety/submit', { token });
    assert.equal(early.status, 400);

    assert.equal((await call('POST', '/tutor/safety/aadhaar/start', { token, body: { aadhaar: '123456789012' } })).status, 400);
    assert.equal((await call('POST', '/tutor/safety/aadhaar/start', { token, body: { aadhaar: '0234567890' } })).status, 400);
    const start = await call('POST', '/tutor/safety/aadhaar/start', { token, body: { aadhaar: '2345 6789 1234' } });
    assert.equal(start.status, 200);
    assert.equal((await call('POST', '/tutor/safety/aadhaar/verify', { token, body: { otp: start.data.devOtp } })).status, 200);
    const stored = db.prepare("SELECT data FROM safety_checks WHERE step = 'aadhaar' AND tutor_id = (SELECT id FROM tutors WHERE first_name = 'Test')").get();
    assert.ok(!stored.data.includes('23456789'), 'full Aadhaar never stored');
    assert.ok(stored.data.includes('XXXX XXXX 1234'));

    const noSource = await call('POST', '/tutor/safety/selfie', { token, form: form({}, { selfie: png() }) });
    assert.equal(noSource.status, 400);
    assert.equal((await call('POST', '/tutor/safety/selfie', { token, form: form({ source: 'front-camera' }, { selfie: png() }) })).status, 200);

    const future = await call('POST', '/tutor/safety/police', { token, form: form({ certNumber: 'PB12345', issueDate: addDays(todayIst(), 1) }, { certificate: png() }) });
    assert.equal(future.data.field, 'issueDate');
    const old = await call('POST', '/tutor/safety/police', { token, form: form({ certNumber: 'PB12345', issueDate: addMonths(todayIst(), -7) }, { certificate: png() }) });
    assert.equal(old.data.field, 'issueDate');
    const police = await call('POST', '/tutor/safety/police', { token, form: form({ certNumber: 'PB12345', issueDate: addMonths(todayIst(), -1) }, { certificate: png() }) });
    assert.equal(police.status, 200);
    assert.equal(police.data.validUntil, addMonths(addMonths(todayIst(), -1), 12));

    const addr = { address: '#12, Street 4, Tripuri Town', proofType: 'Electricity bill' };
    assert.equal((await call('POST', '/tutor/safety/address', { token, form: form({ ...addr, pin: '110001' }, { proof: png() }) })).data.field, 'pin');
    assert.equal((await call('POST', '/tutor/safety/address', { token, form: form({ ...addr, pin: '147001' }, { proof: png() }) })).status, 200);

    assert.equal((await call('POST', '/tutor/safety/qualification', { token, form: form({ degree: 'M.Sc. Maths', university: 'Punjabi University' }, { certificate: png() }) })).status, 200);

    const ref = (mobile, relationship = 'College professor') => ({ name: 'Dr Kaur', mobile, relationship });
    assert.equal((await call('POST', '/tutor/safety/references', { token, body: { notFamily: true, refs: [ref(phone), ref('9417000001')] } })).status, 400);
    assert.equal((await call('POST', '/tutor/safety/references', { token, body: { notFamily: true, refs: [ref('9417000001'), ref('9417000001')] } })).status, 400);
    assert.equal((await call('POST', '/tutor/safety/references', { token, body: { notFamily: true, refs: [ref('9417000001', 'Brother'), ref('9417000002')] } })).status, 400);
    assert.equal((await call('POST', '/tutor/safety/references', { token, body: { notFamily: true, refs: [ref('9417000001'), ref('9417000002')] } })).status, 200);

    const quiz = await call('GET', '/tutor/safety/quiz', { token });
    assert.ok(!JSON.stringify(quiz.data).includes('"answer"'), 'answers never sent to the app');
    const right = QUIZ.map((q) => q.answer);
    const oneWrong = [...right]; oneWrong[0] = (oneWrong[0] + 1) % 3;
    const fail = await call('POST', '/tutor/safety/training', { token, body: { readRules: true, answers: oneWrong } });
    assert.equal(fail.status, 422);
    assert.equal(fail.data.wrong, 1);
    assert.equal((await call('POST', '/tutor/safety/training', { token, body: { readRules: true, answers: right } })).status, 200);

    const slots = await call('GET', '/tutor/safety/interview-slots', { token });
    assert.equal(slots.data.days.length, 5);
    assert.ok(slots.data.days.every((d) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 0));
    assert.equal((await call('POST', '/tutor/safety/interview', { token, body: { date: slots.data.days[0], time: '10:00' } })).status, 400);
    assert.equal((await call('POST', '/tutor/safety/interview', { token, body: { date: slots.data.days[0], time: '15:00' } })).status, 200);

    const s = await call('GET', '/tutor/safety', { token });
    assert.equal(s.data.done, 8);
    assert.equal(s.data.canSubmit, true);
    const submit = await call('POST', '/tutor/safety/submit', { token });
    assert.equal(submit.status, 200);
    assert.match(submit.data.message, /3–5 working days/);
    assert.equal((await call('POST', '/tutor/safety/interview', { token, body: { date: slots.data.days[1], time: '11:00' } })).status, 400, 'locked while under review');
  });

  test('admin approval unlocks home tuition; documents are admin-only', async () => {
    const t = tutorByName('Test');
    const parent = await login('9876500001');
    let home = await call('GET', '/tutors?mode=home&city=Patiala', { token: parent });
    assert.ok(!home.data.tutors.some((x) => x.id === t.id));

    const admin = await login('9876500000');
    const detail = await call('GET', `/admin/tutors/${t.id}`, { token: admin });
    assert.equal(detail.status, 200);
    const selfie = detail.data.checks.find((c) => c.key === 'selfie');
    assert.ok(selfie.fileUrl);
    assert.equal((await call('GET', selfie.fileUrl, { token: parent })).status, 403, 'parents cannot read documents');
    assert.equal((await call('GET', selfie.fileUrl, { token: admin })).status, 200);

    const needsId = await call('POST', `/admin/tutors/${t.id}/home-safe`, { token: admin, body: { approve: true } });
    assert.equal(needsId.status, 400);
    assert.equal((await call('POST', `/admin/tutors/${t.id}/id-check`, { token: admin, body: { approve: true } })).status, 200);
    assert.equal((await call('POST', `/admin/tutors/${t.id}/home-safe`, { token: admin, body: { approve: true } })).status, 200);

    home = await call('GET', '/tutors?mode=home&city=Patiala', { token: parent });
    const found = home.data.tutors.find((x) => x.id === t.id);
    assert.ok(found?.badges.homeSafe && found.badges.idVerified);
    assert.equal(found.rating.count, 0);
  });
});
