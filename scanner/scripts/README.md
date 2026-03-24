# Scanner Scripts

Lightweight Python utilities that handle the mechanical parts of scanning — formatting, deduplication, and (future) automated fetching. All intelligence lives in the Claude prompt, not in these scripts.

---

## MVP: formatter.py

The only script you need today. Takes messy job listings from any source and produces standardized markdown for the scanner prompt.

### Usage

```bash
# From clipboard (copy job listings, then run)
python formatter.py --clipboard

# From a file
python formatter.py --file listings.txt

# From stdin (pipe from another command)
cat listings.txt | python formatter.py --stdin

# Save to file
python formatter.py --clipboard > batch.md

# Limit batch size (default: 20)
python formatter.py --clipboard --max 10
```

### What It Does

1. Reads raw text (messy, unstructured job listings)
2. Splits into individual listings (handles multiple formats: numbered, separated by lines, etc.)
3. Extracts fields: title, company, location, posted date, source, summary, link
4. Outputs standardized markdown batch ready for the scanner prompt

### What It Handles

- Numbered lists ("1. Senior PM at TechCorp...")
- Separated blocks (--- or blank lines between listings)
- Labeled fields ("Title: ...", "Company: ...")
- Mixed formats (some structured, some freeform)
- URLs (auto-detects source from LinkedIn/Indeed/Glassdoor links)

### Dependencies

**None.** Uses Python standard library only. Requires Python 3.6+.

---

## Configuration

Copy `config.example.yaml` to `config.yaml` for customization. Currently only used for `max_per_batch` setting. Future scripts will use RSS feed URLs and email settings.

---

## Future Scripts (Not Yet Built)

Documented here for when they're needed:

### rss_monitor.py
- Fetch RSS feeds from job boards (Indeed, etc.)
- Apply keyword pre-filters (exclude "intern", "director", etc.)
- Deduplicate against previously seen listings
- Output daily batch markdown
- Run via cron for automated morning digests
- **Deps:** feedparser, pyyaml

### email_parser.py
- Connect to email via IMAP
- Parse job alert emails (Indeed, LinkedIn, Glassdoor formats)
- Extract listings from HTML email bodies
- Credentials via environment variables only
- **Deps:** beautifulsoup4 (+ stdlib imaplib, email)

### dedup.py
- Track seen listings in `~/.pursuit/seen_jobs.json`
- Deduplicate by normalized (company + title) hash
- Purge old entries: `--purge-older-than 30`
- Used standalone or imported by other scripts

### feedback_tracker.py
- Log PURSUE/SKIP decisions: `python feedback_tracker.py log --job "..." --action pursued`
- Generate decision pattern summary for the scanner prompt
- Weekly stats: `python feedback_tracker.py stats`
- Powers the learning loop (scanner gets smarter over time)

---

## Adding New Source Parsers

When building future scripts, follow these patterns:

1. **Output format:** Always produce the same markdown batch format (see `sample-batch-input.md`)
2. **Independence:** Each script should work standalone
3. **Credentials:** Environment variables only, never in config files
4. **Cap output:** Respect `max_per_batch` — quality over volume
5. **Fail gracefully:** If a source is down or parsing fails, log the error and continue with available data
