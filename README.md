# Akash Pandey — Physics & Chemistry Tuitions

A marketing website for **Akash Pandey**, a Physics & Chemistry tutor for Class 11 & 12
(Boards / JEE / NEET), built with Next.js (App Router) + Tailwind CSS.

## Features

- **Landing page** — Hero, About, Subjects/Batches, Testimonials, and a lead capture section.
- **AI Test Paper Analyzer** (`#analyzer`) — A student/parent uploads a photo of a graded test
  paper (or types a description), and the AI returns:
  - Overall summary & score
  - Strengths and silly mistakes
  - Weak topics with specific, actionable recommendations
  - A 7-day fix-it study plan
  - A motivational note

  This uses Claude's vision + text understanding via the Anthropic API
  (`lib/analyzer.js`, `app/api/analyze/route.js`). If no API key is configured, it falls back to
  a clearly-labeled **demo mode** so the page still works out of the box.
- **Lead capture** (`#contact`) — A form that saves every enquiry (name, phone, email, class,
  subject interest, message) so Akash never misses a potential student. Includes a spam
  honeypot field.
- **Admin dashboard** (`/admin`) — A simple password-protected page to view captured leads.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Visit `http://localhost:3000`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | For real AI analysis | Get one from [console.anthropic.com](https://console.anthropic.com/). Without it, the analyzer runs in demo mode. |
| `ADMIN_PASSWORD` | For `/admin` | Password to view captured leads. |
| `LEADS_WEBHOOK_URL` | Recommended for production | Every new lead is also POSTed as JSON here. Point this at a Zapier/Make webhook, a Slack incoming webhook, or a Google Sheets webhook so leads land somewhere durable — **especially important on serverless hosting** (see below). |

## How leads are stored

Leads are saved to `data/leads.json` on the server's filesystem. This works well on a
traditional Node server (e.g. a VPS, Railway, Render). On **serverless** platforms like Vercel,
the filesystem is read-only at runtime, so local storage silently fails — set
`LEADS_WEBHOOK_URL` in that case so leads are still captured (e.g. forwarded into a Google Sheet
or Slack channel). You can wire up any HTTPS endpoint that accepts a JSON POST.

## How the AI analyzer works

1. The visitor uploads up to 3 photos of a test paper and/or types a description in
   `components/TestAnalyzer.js`.
2. `app/api/analyze/route.js` receives the images/text, validates size & type, and calls
   `analyzeTestPaper()` in `lib/analyzer.js`.
3. That function sends the images (as base64) plus context to the Claude API with a system
   prompt instructing it to return a strict JSON analysis (strengths, weak topics, study plan,
   etc.), which is then rendered in the UI.

To change the model used, edit the `MODEL` constant in `lib/analyzer.js`.

## Customizing content

All business details (name, phone, WhatsApp number, email, subjects, testimonials, stats) live
in one place: `lib/siteConfig.js`. Update that file to personalize the site — no need to touch
the components.

## Tech stack

- Next.js 16 (App Router, Route Handlers)
- Tailwind CSS
- `@anthropic-ai/sdk` for the AI analyzer

## Deployment

Any Node-compatible host works (Vercel, Render, Railway, a VPS with PM2, etc.):

```bash
npm run build
npm run start
```

Remember to set `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`, and (recommended) `LEADS_WEBHOOK_URL` as
environment variables on your hosting platform.
