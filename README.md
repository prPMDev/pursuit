# Pursuit

**Job search dashboard. Quality over volume. Fit over desperation.**

Pursuit is a local-first tool that finds the 3-5 jobs worth your time — not 500 to spray at. It uses Claude to filter job listings against your professional identity, not keywords.

---

## Prerequisites

- **Node.js 18+**
- **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com/)
- **Chrome or Chromium** — required for auto-fetching jobs from LinkedIn/Indeed (optional if you paste listings manually)

## Setup

```bash
cd app
npm install
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
npm start
```

Open [http://localhost:3000](http://localhost:3000). On first run, Pursuit walks you through a 5-minute setup conversation to build your professional profile and calibrate the scanner.

### Chrome login (for auto-fetch)

If you want Pursuit to browse LinkedIn/Indeed for you:

```bash
npm run login
```

This opens a visible Chrome window. Log into LinkedIn and Indeed, then close the browser. Your session cookies are saved in your Chrome profile — Pursuit uses your existing logged-in session, not your credentials.

**Note:** Chrome must be closed when Pursuit fetches. Puppeteer can't share a profile with a running Chrome instance. If Chrome is open, it falls back to a temporary profile (no saved logins).

---

## How it works

### 1. Build your profile (one-time setup)

A conversational flow asks about your background, logistics, and non-negotiables. You paste 3 example listings (one you love, one you hate, one you're torn on) to calibrate the scanner. Result: a professional profile in `data/profile.md` and reference examples in `data/references/`.

### 2. Get listings

Two ways:
- **Fetch Jobs** — Puppeteer opens Chrome with your logged-in session, browses LinkedIn/Indeed using your configured search queries, scrapes job cards + JD summaries. Capped at 3 fetches/day.
- **Add Jobs** — Paste listings manually from any source. No Chrome needed.

### 3. Scan

Claude reads your profile + reference examples + the batch of listings and filters each one:
- **CONSIDER** — worth 5 more minutes of your time
- **MAYBE** — borderline, worth a second look
- **PASS** — filtered out

Each job gets a narrative explanation ("this is your integrations story applied to healthcare") plus risk tagging (Safe Play vs Stretch).

### 4. Evaluate (on-demand)

Click any job and run the evaluator for deep analysis: match type, level fit, red flags, and a PURSUE/MAYBE/PASS decision with reasoning.

### 5. Decide and track

Pursue, Pass, or Save each job. Track through Applied → Interview → Offered/Rejected. Decisions are logged to `data/decisions.md`.

---

## Project structure

```
app/
  server.js          Express server + API routes
  browser.js         Puppeteer job scraper (LinkedIn, Indeed)
  setup.js           Conversational setup flow definitions
  public/            Frontend (vanilla JS, no build step)
    index.html       HTML shell
    styles.css       Design system
    js/              Modular JS (app, job-list, job-detail, etc.)

scanner/
  scanner-prompt.md  Scanner system prompt
  my-profile-template.md  Profile template

evaluator/
  HLL-job-eval-prompt.md  Evaluator system prompt

data/                Local data (gitignored except structure)
  profile.md         Your professional profile
  settings.json      Search queries + fetch history
  jobs/              Raw fetched listings (markdown)
  scans/             Scanner output (parsed into job list)
  evaluations/       Evaluator results (one per job)
  references/        Reference examples for calibration
  decisions.md       Decision log
```

## System checks

On startup, Pursuit checks:
- **API key** — required for scan/evaluate. Shown in topbar if missing.
- **Chrome binary** — required for Fetch Jobs. If not found, Fetch is disabled but Add Jobs + Scan still work.
- **Chrome profile** — if not found, fetches use a temporary profile (no saved logins).

These are checked once at startup and exposed at `/api/health`. No polling or periodic pings — re-checked on failure.

---

## Philosophy

- **Anti-mass-apply.** 3 fetches/day, not 300. The nudges are intentional.
- **Identity over keywords.** "Integrations PM" and "Platform Partnerships" might be the same role for the same person.
- **Adjacent is OK.** Structural skills transfer across domains.
- **Local-first.** Your data stays on your machine. No accounts, no cloud, no tracking.

---

## License

MIT
