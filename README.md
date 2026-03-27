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

1. **Profile Setup** — conversational onboarding captures your background and non-negotiables. You provide 3 example listings (love, hate, torn) to calibrate the scanner.
2. **Get Listings** — auto-fetch from LinkedIn/Indeed (3/day cap) or paste manually from any source.
3. **Scan** — AI filters each listing: **Consider** (worth your time), **Maybe** (borderline), or **Pass** (filtered out). Each gets a narrative explanation and risk tag.
4. **Evaluate** — on-demand deep analysis: match type, level fit, red flags, and a Pursue/Maybe/Pass decision.
5. **Decide** — Pass, Save, or Pursue. Decisions are logged immutably. Reset your search focus anytime without losing history.

---

## Philosophy

- **Anti-mass-apply.** 3 fetches/day, not 300. The nudges are intentional.
- **Identity over keywords.** "Integrations PM" and "Platform Partnerships" might be the same role for the same person.
- **Adjacent is OK.** Structural skills transfer across domains.
- **Local-first.** Your data stays on your machine. No accounts, no cloud, no tracking.

---

## Contributing

See [CLAUDE.md](CLAUDE.md) for development guidelines. Track decisions in [GitHub Issues](../../issues).

## License

MIT
