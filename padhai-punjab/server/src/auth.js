import crypto from 'node:crypto';
import { isIndianMobile, isOtp } from '../../shared/constants.js';
import { ApiError, bad, clock, randomCode, str } from './util.js';
import { sendSms } from './notify.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function makeAuth(db, config) {
  const secret = config.secret;
  const hash = (s) => crypto.createHmac('sha256', secret).update(s).digest('hex');

  function sign(userId) {
    const payload = Buffer.from(JSON.stringify({ uid: userId, exp: clock.now() + TOKEN_TTL_MS })).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  function verify(token) {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (data.exp < clock.now()) return null;
      return data.uid;
    } catch {
      return null;
    }
  }

  async function requestOtp(rawPhone) {
    const phone = str(rawPhone);
    if (!isIndianMobile(phone)) {
      throw bad('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.', 'phone');
    }
    const existing = db.prepare('SELECT last_sent_at FROM otp_codes WHERE phone = ?').get(phone);
    if (existing && clock.now() - existing.last_sent_at < OTP_RESEND_MS) {
      throw new ApiError(429, 'Please wait 30 seconds before asking for a new code.', 'phone');
    }
    const code = config.fixedOtp || randomCode();
    db.prepare(`INSERT INTO otp_codes (phone, code_hash, expires_at, attempts, last_sent_at)
                VALUES (?, ?, ?, 0, ?)
                ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash,
                  expires_at = excluded.expires_at, attempts = 0, last_sent_at = excluded.last_sent_at`)
      .run(phone, hash(`${phone}:${code}`), clock.now() + OTP_TTL_MS, clock.now());
    await sendSms(config, phone, `${code} is your Padhai Punjab login code. It expires in 5 minutes. Do not share it with anyone.`);
    return config.devMode ? { devOtp: code } : {};
  }

  function verifyOtp(rawPhone, rawCode) {
    const phone = str(rawPhone);
    const code = str(rawCode);
    if (!isIndianMobile(phone)) throw bad('Enter a valid 10-digit mobile number.', 'phone');
    if (!isOtp(code)) throw bad('Enter the 4-digit code we sent you.', 'otp');
    const row = db.prepare('SELECT * FROM otp_codes WHERE phone = ?').get(phone);
    if (!row) throw bad('Please ask for a new code first.', 'otp');
    if (row.expires_at < clock.now()) throw bad('This code has expired. Tap "Resend code" to get a new one.', 'otp');
    if (row.attempts >= OTP_MAX_ATTEMPTS) throw bad('Too many wrong tries. Tap "Resend code" to get a new one.', 'otp');
    if (row.code_hash !== hash(`${phone}:${code}`)) {
      db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?').run(phone);
      throw bad("That code isn't right. Please check the SMS and try again.", 'otp');
    }
    db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone);
    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
      const r = db.prepare('INSERT INTO users (phone) VALUES (?)').run(phone);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid);
    }
    return { token: sign(user.id), user };
  }

  /** Express middleware: attaches req.user (or 401). */
  function requireAuth(req, _res, next) {
    const header = req.get('authorization') || '';
    const uid = verify(header.replace(/^Bearer\s+/i, ''));
    const user = uid && db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!user) return next(new ApiError(401, 'Please log in again.'));
    req.user = user;
    next();
  }

  const requireRole = (...roles) => (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'This part of the app is not available for your account type.'));
    }
    next();
  };

  return { sign, verify, requestOtp, verifyOtp, requireAuth, requireRole, hash };
}
