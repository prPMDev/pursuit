# Scanner (Planned)

**Status:** 🚧 Not yet built

**Purpose:** Automatically find job opportunities that match your criteria. Stop manual LinkedIn scrolling.

---

## Vision

Instead of spending hours searching for jobs, the scanner should:
1. Monitor job boards (LinkedIn, company career pages, aggregators)
2. Filter based on your criteria (role type, location, company stage, must-haves)
3. Surface only relevant opportunities
4. Feed into the Evaluator for fit analysis

---

## Possible Approaches

### Option 1: RSS/API Monitoring
- Subscribe to job board RSS feeds or APIs
- Filter based on keywords, location, company criteria
- Daily digest of new matches

### Option 2: Web Scraping
- Scrape company career pages directly
- Monitor specific company lists (Series B startups, platform companies, etc.)
- Alert when new roles appear

### Option 3: Integration with Existing Tools
- Hook into LinkedIn job alerts
- Parse email job notifications
- Extract opportunities from newsletters/communities

---

## Key Features (Wishlist)

- **Criteria-based filtering:** Only surface jobs that meet non-negotiables
- **Company intelligence:** Enrich with funding stage, tech stack, team size
- **Deduplication:** Don't show the same job from multiple sources
- **Integration with Evaluator:** Auto-evaluate new jobs, surface top matches
- **Notifications:** Daily/weekly digest, not real-time spam

---

## Why Not Build This Yet?

The **Evaluator** is the foundation. Once you have a reliable fit assessment framework, the scanner becomes valuable. Building a scanner without a good evaluator just creates noise.

**Priority:** Evaluator → Strategist → Scanner → Tracking

---

## Contributing

If you want to build this module:
- Decide on the approach (RSS, scraping, integration)
- Define the filtering criteria (how to represent "must-haves" vs "nice-to-haves")
- Consider privacy/rate-limiting (don't abuse job board APIs)
- Integrate with the evaluator prompt

Open an issue or PR to discuss design before building.

---

**The scanner should save time, not create more noise. Quality > volume.**
