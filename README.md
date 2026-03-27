# Pursuit

![Node](https://img.shields.io/badge/Node-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![AI](https://img.shields.io/badge/AI-Claude%20%7C%20GPT%20%7C%20Gemini-blueviolet)
![Status](https://img.shields.io/badge/Status-v1%20Working-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

**Job search system built on one belief: you should pursue 5 great fits, not spray 500 applications.**

Pursuit uses AI to filter job listings against your professional identity — not keywords. It runs locally, keeps your data on your machine, and caps fetches at 3/day so you spend time pursuing, not pulling.

---

## Quick Start

```bash
cd app && npm install
cp .env.example .env    # Add your API key (Anthropic, OpenAI, or Gemini)
npm start               # http://localhost:3000
```

On first run, a guided setup builds your professional profile and calibrates the scanner with example listings you provide.

### Auto-fetch from LinkedIn/Indeed (optional)

```bash
npm run login           # Opens Chrome — log into LinkedIn/Indeed, then close
```

Pursuit uses your existing browser session (not your credentials). Chrome must be closed during fetches — Puppeteer can't share a running profile.

---

## How It Works

### 1. Profile Setup (one-time)
A conversational flow captures your background, logistics, and non-negotiables. You provide 3 example listings (love, hate, torn) to calibrate the AI scanner.

### 2. Get Listings
- **Fetch Jobs** — Puppeteer browses LinkedIn/Indeed with your search queries. Capped at 3/day.
- **Add Jobs** — Paste listings manually from any source. No Chrome needed.

### 3. Scan
AI reads your profile + calibration examples + the batch and filters each listing:
- **Consider** — worth 5 more minutes of your time
- **Maybe** — borderline, worth a second look
- **Pass** — filtered out

Each job gets a narrative explanation plus risk tagging (Safe Play vs Stretch).

### 4. Evaluate (on-demand)
Click any job to run the evaluator for deep analysis: match type, level fit, red flags, and a Pursue/Maybe/Pass decision with reasoning.

### 5. Decide and Track
Pass, Save, or Pursue each job. Decisions are logged immutably. Reset your search focus anytime without losing your decision history.

---

## Features

| Feature | Status |
|---------|--------|
| AI scanner with 3-gate filtering | Shipped |
| Multi-provider AI (Anthropic, OpenAI, Gemini) | Shipped |
| LinkedIn + Indeed auto-fetch | Shipped |
| Manual job paste | Shipped |
| Deep evaluator with dossier generation | Shipped |
| Dedup with configurable expiration | Shipped |
| Force reset when search focus changes | Shipped |
| Inline table actions (Pass/Save/Evaluate) | Shipped |
| Decision log with modal viewer | Shipped |
| SQLite migration | Planned |
| Application strategy engine | Planned |
| Content generation (cover letters, etc.) | Planned |

---

## Architecture

```
app/
  server.js            Express server + all API routes
  browser.js           Puppeteer scraper (LinkedIn, Indeed)
  setup.js             Guided onboarding flow
  public/              Frontend (vanilla JS + Tabulator, no build step)
    js/                Modular ES6 (app, job-list, job-detail, settings, etc.)
    styles.css         Design system (warm stone palette, 4px grid)

scanner/               Scanner prompt system
  scanner-prompt.md    3-gate filter prompt (non-negotiables → profile match → decision)
  my-profile-template.md

evaluator/             Evaluator prompt system
  system.md            Evaluator system prompt
  initial-eval.md      First-pass evaluation
  follow-up.md         Deep-dive follow-up

data/                  All local, gitignored
  profile.md           Your professional profile
  settings.json        Search config, AI provider, fetch history
  .seen-jobs.json      Dedup cache (auto-expires after configurable days)
  decisions.md         Immutable decision log
  jobs/                Raw fetched listings
  scans/               Scanner output batches
  dossiers/            Per-job dossiers (created at runtime)
  evaluations/         Deep evaluation results
  references/          Calibration examples (love/hate/torn)

generator/             Content generation (planned)
strategist/            Application strategy (planned)
tracking/              Pipeline tracking (planned)
```

---

## Configuration

### AI Provider

Pursuit supports three AI providers. Configure in Settings or `.env`:

| Provider | Models | Key format |
|----------|--------|------------|
| **Anthropic** (default) | Claude Sonnet, Opus, Haiku | `sk-ant-...` |
| **OpenAI** | GPT-4o, GPT-4 Turbo | `sk-proj-...` |
| **Google Gemini** | Gemini 2.0 Flash, 2.5 Pro | `AIza...` |

### Data Management

Settings modal includes:
- **Dedup expiration** — seen jobs auto-expire after N days (default 7) so reposted listings resurface
- **Clear Seen Jobs Cache** — light reset, keeps your jobs and decisions
- **Reset All Job Data** — clears everything except decisions and profile
- **Reset Profile** — restart onboarding

When you change search titles or locations, Pursuit prompts you to clear the dedup cache.

### System Checks

On startup, Pursuit checks:
- **API key** — required for scan/evaluate. Configurable in Settings UI.
- **Chrome binary** — required for Fetch Jobs. Add Jobs + Scan work without it.
- **Chrome profile** — falls back to temporary profile if not found.

Exposed at `/api/health`. Re-checked on failure, no polling.

---

## Philosophy

- **Anti-mass-apply.** 3 fetches/day, not 300. The nudges are intentional.
- **Identity over keywords.** "Integrations PM" and "Platform Partnerships" might be the same role for the same person.
- **Adjacent is OK.** Structural skills transfer across domains.
- **Local-first.** Your data stays on your machine. No accounts, no cloud, no tracking.
- **Quality over volume.** The scanner should return 5-10 relevant jobs, not 50.

---

## Contributing

Pursuit is open-source. Everything committed here should be generic, reusable, and free of personal information. See [CLAUDE.md](CLAUDE.md) for development guidelines.

Track decisions and architecture in [GitHub Issues](../../issues).

## License

MIT
