# Padhai Punjab

**ਤੁਹਾਡੇ ਬੱਚੇ ਲਈ ਸਹੀ ਅਧਿਆਪਕ** — The right teacher for your child.

Padhai Punjab is an iPhone and Android app that helps parents in Punjab find trusted tutors for home or online
tuition. It also lets Class 9–12 and college students book one-hour or single-topic classes. Safety and trust
come first: home tutors must pass 8 safety checks, and only families whose child actually studied with a tutor
can review them.

```
padhai-punjab/
├── mobile/   Expo (React Native) app for iOS and Android: expo-router, TypeScript
├── server/   Node.js API: Express + SQLite. Every trust and safety rule is enforced here.
└── shared/   Constants and validation used by both, such as districts, subjects, the trust score and PIN rules
```

## Quick start

Requirements: Node 22.13+ (the server uses the built-in `node:sqlite`).

```bash
# 1. API (fills the database with sample data on first run)
cd server
npm install
DEV_FIXED_OTP=1234 npm run dev        # http://localhost:4000

# 2. App
cd ../mobile
npm install
npx expo start                        # press i (iOS simulator), a (Android emulator), or scan the QR code with Expo Go
```

On a physical phone using Expo Go, the app finds the API on the same machine as the Expo dev server. For anything
else, set `EXPO_PUBLIC_API_URL=https://api.your-domain.in` before `expo start` or `eas build`.

### Demo accounts (sample data)

Log in with any of these numbers. In dev mode the OTP is shown on screen. It is also printed in the server log,
or it is always `1234` if you set `DEV_FIXED_OTP=1234`.

| Mobile | Role | What you'll see |
|---|---|---|
| 9876500001 | Parent | An active home tutor with a **visit code**, "Review unlocks … 2 to go", a pending demo, a booked class, and a class waiting for "Please confirm" |
| 9876500002 | Tutor (Navjot Kaur) | A new tutor: "ID check pending", 2 of 8 safety checks done, a demo request and a class request |
| 9815010000 | Tutor (Harpreet Kaur) | 🛡 Home-safe verified, 30 reviews, an active home student to log classes for |
| 9876500000 | Admin | Tutor queue, safety reports, and review moderation |
| Any other 10-digit number starting with 6–9 | New user | Choose Parent/Student or Tutor, then go through the 5-step tutor sign-up |

`npm run seed` (in `server/`) wipes the database and loads the sample data again.

## What's in the app

**Parent / Student**: four bottom tabs
1. **Find Tutors**: filter by city (all 23 Punjab districts), class, subject, board and home/online. Sort by best
   ranked, fee or experience. Each card shows its rank ("#1 in your search"), trust badges, fees and availability.
   You can save a tutor with the heart, or book a free demo using a fully validated form.
2. **1-Hour Classes**: level pills (Class 9–12, College) with subjects that change per level, and example topics
   you can tap. Choose a one-hour class (60 min) or a full topic class (up to 2 h). Each tutor shows their price and
   "Next free: Today, 6 pm". Booking uses real free slots for the next 7 days. The **My booked classes** list tracks
   each class: Waiting for tutor → Booked → Please confirm → Completed.
3. **Saved**
4. **My Tutors & Reviews**: pending demos, active tutors with class logs (Yes, confirm / No), the review progress
   bar, the large **Home visit code**, past classes, and "Report a safety concern" everywhere.

**Tutor**: a 5-step sign-up wizard with a progress bar, then six tabs: Demos, Classes, Students (log each class),
Reviews, Safety (the 8 checks) and Profile (preview as parents see it, and edit).

**Admin**: the review queue (selfie and ID photo side by side, every document, references with a call button, and
approve or reject with a reason), safety reports (call the parent, keep the pause, lift it or suspend the tutor), and
review removal for policy violations only, with a log of every removal.

## Trust and safety rules (enforced by the server)

All of these live in `server/src/rules.js` and the route handlers, and `server/test/api.test.js` covers them.

| Rule | Where |
|---|---|
| A tutor never appears in home searches or takes a home booking unless **all 8 checks are admin-approved**, the police certificate is still valid (1 year), home visits aren't paused by a report, and the account isn't suspended | `homeEligibility()` |
| Tuition review unlocks only after **4 classes the tutor logged AND the parent confirmed** | `reviewEligibility()` |
| One-hour/topic rating unlocks only after the tutor marks it done **AND** the student confirms they attended | `reviewEligibility()` |
| One review per family per tutor (editable); a comment of at least 20 characters; the recommend answer is required | `UNIQUE(tutor_id, family_user_id)`, `PUT /parent/tutors/:id/review` |
| Ranking uses a Bayesian trust score: `(8 × 4.0 + sum) ÷ (8 + n)` | `shared/constants.js → trustScore()` |
| Home visit code: 4 random digits, **only returned to the parent**. It is required to log a home class or mark a home class done, and a new code is made after every class | `issueVisitCode()`, `codeMatches()` |
| A safety report **immediately pauses all home visits** from that tutor and alerts the safety team. Only an admin can lift the pause, and they must write a note | `POST /parent/reports`, `POST /admin/reports/:id` |
| Aadhaar: 12 digits that can't start with 0 or 1. **Only the masked "XXXX XXXX 1234" is stored** | `POST /tutor/safety/aadhaar/*` |
| Police certificate issued within the last 6 months and not in the future; the app shows "valid until" and a renewal reminder | `POST /tutor/safety/police` |
| Punjab PIN codes start with 14, 15 or 16. You need 2 references with different numbers, not your own number, and no family members. The quiz needs all 5 answers correct, and its answers never reach the app. Interview slots are the next 5 days except Sunday, at 11 am, 3 pm or 6 pm | `routes/tutor.js` |
| Changing a check after approval sends the profile back for review, and home tuition locks again | `saveStep()` |
| One phone number = one account = one tutor profile | `UNIQUE(phone)`, `UNIQUE(user_id)` |
| Documents go into a private folder that is never served statically. Only admins can read them; the profile photo is the only public file | `uploads.js`, `GET /admin/files/:name` |
| A tutor sees a parent's phone number only after accepting their request | `routes/tutor.js` |

```bash
cd server && npm test     # 14 integration tests over the real HTTP API
cd mobile && npm run typecheck
```

## Data model

`users`, `tutors`, `safety_checks`, `demo_requests`, `enrolments`, `class_logs (tutor_confirmed, parent_confirmed)`,
`sessions`, `visit_codes`, `reviews`, `review_removals`, `saved_tutors`, `reports` and `admin_log`. See
`server/src/db.js`.

## Going to production

| Setting | Purpose |
|---|---|
| `NODE_ENV=production` | Turns off on-screen OTPs and the automatic sample data |
| `AUTH_SECRET` | Required. A long random string used to sign login tokens |
| `ADMIN_PHONES` | Comma-separated mobile numbers that may choose the Admin role |
| `SMS_WEBHOOK_URL` / `SMS_WEBHOOK_TOKEN` | Your SMS gateway (MSG91, Gupshup, …) for OTPs. The server sends it `{ to, message }` |
| `SAFETY_WEBHOOK_URL` | Where to send instant safety alerts (Slack, Google Chat, …) |
| `DATA_DIR` | Where the SQLite database and the private documents are stored. Use a persistent, backed-up volume |

Things that still need a real provider before launch:
- **Aadhaar e-KYC**: `POST /tutor/safety/aadhaar/start` currently sends its own OTP. Replace that call with a
  licensed UIDAI e-KYC provider (a KUA/ASA partner). The rest of the flow, including storing only the masked number,
  stays the same.
- **Face match**: the admin compares the selfie and ID photo side by side. An automatic face-match API can be added
  to the same screen.
- **Police certificates** are checked by hand against the PP Saanjh portal.

Build the apps with EAS: `cd mobile && npx eas-cli@latest build --platform all`. The app id is
`in.padhaipunjab.app`; change it in `app.json` before you publish.
