import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  phone         TEXT NOT NULL UNIQUE,          -- one phone number = one account
  name          TEXT,
  role          TEXT CHECK (role IN ('parent','tutor','admin')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_codes (
  phone         TEXT PRIMARY KEY,
  code_hash     TEXT NOT NULL,
  expires_at    INTEGER NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_sent_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tutors (
  id                 INTEGER PRIMARY KEY,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id),   -- one tutor account per phone
  first_name         TEXT NOT NULL,
  last_name          TEXT NOT NULL,
  email              TEXT,
  photo_file         TEXT,
  city               TEXT NOT NULL,
  areas              TEXT NOT NULL DEFAULT '[]',
  qualification      TEXT NOT NULL,
  experience_years   INTEGER NOT NULL DEFAULT 0,
  languages          TEXT NOT NULL DEFAULT '[]',
  intro              TEXT NOT NULL,
  class_from         INTEGER,
  class_to           INTEGER,
  school_subjects    TEXT NOT NULL DEFAULT '[]',
  boards             TEXT NOT NULL DEFAULT '[]',
  college_subjects   TEXT NOT NULL DEFAULT '[]',
  offers_home        INTEGER NOT NULL DEFAULT 0,
  offers_online      INTEGER NOT NULL DEFAULT 0,
  monthly_fee        INTEGER NOT NULL,
  hour_price         INTEGER,
  topic_price        INTEGER,
  available_days     TEXT NOT NULL DEFAULT '[]',
  available_times    TEXT NOT NULL DEFAULT '[]',
  id_type            TEXT NOT NULL,
  id_doc_file        TEXT,
  qual_cert_file     TEXT,
  agreed_no_incentives INTEGER NOT NULL DEFAULT 0,
  agreed_background  INTEGER NOT NULL DEFAULT 0,
  id_status          TEXT NOT NULL DEFAULT 'pending' CHECK (id_status IN ('pending','verified','rejected')),
  id_reject_reason   TEXT,
  home_safe_status   TEXT NOT NULL DEFAULT 'not_submitted'
                     CHECK (home_safe_status IN ('not_submitted','under_review','approved','rejected')),
  home_safe_reason   TEXT,
  home_safe_approved_at TEXT,
  home_paused        INTEGER NOT NULL DEFAULT 0,   -- set by a safety report, cleared only by admin
  suspended          INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS safety_checks (
  tutor_id     INTEGER NOT NULL REFERENCES tutors(id),
  step         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('in_progress','done')),
  data         TEXT NOT NULL DEFAULT '{}',   -- JSON; never contains a full Aadhaar number
  file         TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tutor_id, step)
);

CREATE TABLE IF NOT EXISTS aadhaar_otps (
  tutor_id     INTEGER PRIMARY KEY REFERENCES tutors(id),
  last4        TEXT NOT NULL,
  code_hash    TEXT NOT NULL,
  expires_at   INTEGER NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS demo_requests (
  id             INTEGER PRIMARY KEY,
  parent_user_id INTEGER NOT NULL REFERENCES users(id),
  tutor_id       INTEGER NOT NULL REFERENCES tutors(id),
  parent_name    TEXT NOT NULL,
  phone          TEXT NOT NULL,
  child_name     TEXT NOT NULL,
  class          INTEGER NOT NULL,
  subject        TEXT NOT NULL,
  mode           TEXT NOT NULL CHECK (mode IN ('home','online')),
  area           TEXT,
  time_slot      TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrolments (
  id               INTEGER PRIMARY KEY,
  demo_request_id  INTEGER REFERENCES demo_requests(id),
  parent_user_id   INTEGER NOT NULL REFERENCES users(id),
  tutor_id         INTEGER NOT NULL REFERENCES tutors(id),
  child_name       TEXT NOT NULL,
  class            INTEGER NOT NULL,
  subject          TEXT NOT NULL,
  mode             TEXT NOT NULL CHECK (mode IN ('home','online')),
  area             TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS class_logs (
  id                INTEGER PRIMARY KEY,
  enrolment_id      INTEGER NOT NULL REFERENCES enrolments(id),
  class_date        TEXT NOT NULL,
  topic             TEXT NOT NULL,
  tutor_confirmed   INTEGER NOT NULL DEFAULT 1,
  parent_confirmed  INTEGER,            -- NULL = waiting, 1 = yes, 0 = no
  visit_code_used   INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id               INTEGER PRIMARY KEY,
  student_user_id  INTEGER NOT NULL REFERENCES users(id),
  tutor_id         INTEGER NOT NULL REFERENCES tutors(id),
  level            TEXT NOT NULL,
  subject          TEXT NOT NULL,
  topic            TEXT NOT NULL,
  confusing        TEXT,
  kind             TEXT NOT NULL CHECK (kind IN ('hour','topic')),
  price            INTEGER NOT NULL,
  day              TEXT NOT NULL,       -- YYYY-MM-DD (India time)
  start_hour       INTEGER NOT NULL,
  duration_hours   INTEGER NOT NULL,
  mode             TEXT NOT NULL CHECK (mode IN ('home','online')),
  area             TEXT,
  student_name     TEXT NOT NULL,
  phone            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'waiting'
                   CHECK (status IN ('waiting','booked','declined','please_confirm','completed','not_attended','cancelled')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Home visit codes are visible ONLY to the parent/student. A fresh code replaces the
-- old one after every class.
CREATE TABLE IF NOT EXISTS visit_codes (
  id            INTEGER PRIMARY KEY,
  enrolment_id  INTEGER REFERENCES enrolments(id),
  session_id    INTEGER REFERENCES sessions(id),
  code          TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id                INTEGER PRIMARY KEY,
  tutor_id          INTEGER NOT NULL REFERENCES tutors(id),
  family_user_id    INTEGER NOT NULL REFERENCES users(id),
  rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           TEXT NOT NULL,
  recommend         INTEGER NOT NULL,
  level_label       TEXT NOT NULL,     -- e.g. "Class 10 · Maths" or "College · Java"
  classes_attended  INTEGER,
  topic             TEXT,
  reviewer_name     TEXT,
  removed           INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tutor_id, family_user_id)    -- one review per family per tutor
);

CREATE TABLE IF NOT EXISTS review_removals (
  id             INTEGER PRIMARY KEY,
  review_id      INTEGER NOT NULL REFERENCES reviews(id),
  admin_user_id  INTEGER NOT NULL REFERENCES users(id),
  reason         TEXT NOT NULL,
  snapshot       TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_tutors (
  user_id   INTEGER NOT NULL REFERENCES users(id),
  tutor_id  INTEGER NOT NULL REFERENCES tutors(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, tutor_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id                INTEGER PRIMARY KEY,
  reporter_user_id  INTEGER NOT NULL REFERENCES users(id),
  tutor_id          INTEGER NOT NULL REFERENCES tutors(id),
  enrolment_id      INTEGER REFERENCES enrolments(id),
  session_id        INTEGER REFERENCES sessions(id),
  reason            TEXT NOT NULL,
  details           TEXT,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','pause_kept','pause_lifted','tutor_suspended')),
  parent_contacted  INTEGER NOT NULL DEFAULT 0,
  admin_notes       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_log (
  id             INTEGER PRIMARY KEY,
  admin_user_id  INTEGER NOT NULL REFERENCES users(id),
  action         TEXT NOT NULL,
  target         TEXT NOT NULL,
  details        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tutors_city ON tutors(city);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_day ON sessions(tutor_id, day);
CREATE INDEX IF NOT EXISTS idx_logs_enrolment ON class_logs(enrolment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tutor ON reviews(tutor_id);
`;

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

/** Run fn inside a transaction; rolls back on throw. */
export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const json = (v, fallback = []) => {
  if (v == null) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
};
