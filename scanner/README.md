# Scanner

**Status:** ✅ Working (MVP — Profile + Prompt + Formatter)

**Purpose:** Personalized job shortlisting. The thing LinkedIn, TrueUp, and every job board fails at.

They optimize for **"find as many jobs as possible."** We optimize for **"find the right 3-5 worth your time."**

---

## The Problem With Job Boards

LinkedIn shows you 500 results. Indeed sends you 20 alerts a day. TrueUp surfaces "trending" jobs. None of them know:

- What you're actually confident in vs. where you want to stretch
- That "Staff PM" at a startup means something different than at Google
- That you'd take a pay cut for meaningful equity but not for a boring role
- That you've learned to avoid companies with 3+ PMs on the same product
- That your integrations skills transfer to healthcare even though you've never worked in healthcare

**They match keywords. The Scanner matches identity.**

---

## How It Works

### Step 1: Create Your Profile (One Time, 10 Minutes)

Copy [`my-profile-template.md`](my-profile-template.md) → rename to `my-profile.md` → fill it in.

This is NOT a keyword list. It's your professional identity:
- Who you are and what you're known for
- Confidence zones and growth areas
- Leveling nuance ("Staff at a startup ≈ Senior at FAANG")
- Compensation range and flexibility
- Risk appetite (safe plays vs stretch bets)
- Personal red flags from experience

**Be specific. Be honest. The Scanner works better when you are.**

### Step 2: Collect Job Listings

Three ways to get listings into the Scanner:

| Situation | What to Do |
|-----------|------------|
| Browsing LinkedIn/Indeed | Copy listings → `python scripts/formatter.py --clipboard` |
| Job alert emails | Copy email text → `python scripts/formatter.py --stdin` |
| Someone sent you a few links | Paste directly into scanner prompt (no script needed) |

The formatter produces standardized markdown. Small batches (2-3 listings) can go straight to the prompt without formatting.

### Step 3: Scan

1. Open Claude (claude.ai, Claude in Chrome, or Claude Desktop)
2. Paste the contents of [`scanner-prompt.md`](scanner-prompt.md)
3. Paste your profile (`my-profile.md`)
4. Paste your formatted batch of listings
5. Get back a filtered table with EVALUATE / MAYBE / SKIP decisions

### Step 4: Hand Off to Evaluator

Take your EVALUATE listings to the [Evaluator](../evaluator/):
- Has a LinkedIn post? → Run [LinkedIn Evaluator](../evaluator/linkedin-evaluator-prompt.md) (Step 1)
- Has JD text? → Run [Job Fit Evaluator](../evaluator/HLL-job-eval-prompt.md) (Step 2)

```
Scanner (filter down) → Evaluator (deep analysis) → Pursue or Pass
```

---

## Quick Start

```bash
# 1. Create your profile
cp scanner/my-profile-template.md scanner/my-profile.md
# Edit my-profile.md with your details

# 2. Format some listings (choose one)
python scanner/scripts/formatter.py --clipboard        # from clipboard
python scanner/scripts/formatter.py --file listings.txt # from file
cat listings.txt | python scanner/scripts/formatter.py --stdin  # from pipe

# 3. Paste into Claude:
#    - scanner-prompt.md
#    - my-profile.md
#    - formatted batch output
#
# 4. Review EVALUATE listings → send to Evaluator
```

No dependencies to install. `formatter.py` uses Python standard library only (Python 3.6+).

---

## What the Scanner Outputs

A filtered table with narrative reasoning:

```
| # | Company | Role | Match | Risk | Action | Key Signal |
|---|---------|------|-------|------|--------|------------|
| 1 | Acme Health | Sr PM, Integrations | Direct | Safe | EVALUATE | Core match + right level |
| 2 | CloudScale | Staff PM, Platform | Direct | Stretch | EVALUATE | Platform match, level up |
| 3 | MegaCorp | Director of PM | — | — | SKIP | 2 levels above target |
```

For each EVALUATE listing: **narrative reasoning** ("This is your integrations story applied to healthcare"), risk assessment, and things to watch for in the Evaluator.

Stats line: `Scanned: 8 | Evaluate: 3 | Maybe: 1 | Skipped: 4`

See [`examples/`](examples/) for full examples.

---

## Philosophy

- **Filter down, not collect more.** If >50% of a batch gets EVALUATE, the filtering is too loose.
- **Identity over keywords.** "Senior PM, Integrations" and "Product Lead, Partnerships & Ecosystem" might be the same role for the same person.
- **Adjacent is OK.** Structural skills transfer across domains. The Evaluator validates this deeper.
- **Level nuance matters.** "Staff" means different things at different companies. The profile captures this.
- **The Evaluator exists downstream.** The Scanner doesn't need to do deep analysis. Just answer: "Is this worth 5 more minutes?"
- **Human decides.** Scanner recommends. You choose which EVALUATEs to pursue.

---

## Files

```
scanner/
├── README.md                  ← You are here
├── scanner-prompt.md          ← The Claude prompt (core intelligence)
├── my-profile-template.md     ← Copy and customize (your identity)
├── examples/
│   ├── README.md              ← Example format guide
│   ├── sample-profile.md      ← Filled-in example profile
│   ├── sample-batch-input.md  ← Example batch of 8 listings
│   └── sample-scanner-output.md ← What the scanner produces
└── scripts/
    ├── README.md              ← Script documentation
    ├── formatter.py           ← Universal input formatter (MVP)
    ├── requirements.txt       ← Dependencies (none for MVP)
    └── config.example.yaml    ← Configuration template
```

---

## Future Enhancements

These are planned but not yet built. The MVP works today without them.

### 1. RSS/Email Automation
Automatically fetch job listings from RSS feeds (Indeed) and parse job alert emails (LinkedIn, Glassdoor). Daily digest via cron. Eliminates manual copy-paste for recurring sources.

### 2. Learning Loop
Track what you actually PURSUE vs SKIP over time. Auto-generate "Decision Patterns" summary that feeds back into the scanner prompt. Scanner gets smarter without you manually updating criteria.

### 3. Deduplication
Track seen listings across scanner runs. Don't resurface the same job from Monday's scan on Tuesday. Normalize company + title for fuzzy matching.

### 4. Company Intelligence
Enrich listings with funding stage, team size, tech stack, recent news. Help the Scanner make better pre-filter decisions without needing it in the JD.

### 5. Source Integrations
LinkedIn Jobs API, TrueUp, newsletter parsing, Slack channel monitoring. More sources, same quality filter.

---

## Contributing

Want to improve the Scanner?

- **Share examples** — real scans with outcomes help everyone calibrate
- **Improve the prompt** — better filtering logic, edge case handling
- **Build future enhancements** — see list above, open an issue first to discuss
- **Add source parsers** — new email formats, new job boards

**Remember:** The Scanner filters DOWN. If your contribution makes it surface MORE jobs, it's moving in the wrong direction.

---

**The Scanner doesn't replace your judgment. It gives you a shorter, smarter list to judge.**
