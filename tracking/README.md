# Tracking (Planned)

**Status:** 🚧 Not yet built

**Purpose:** Job opportunity pipeline management. Track what you've applied for, who you contacted, what happened. Never lose track of follow-ups.

---

## Vision

You've evaluated jobs. You've built application strategies. You've applied.

Now you need to track:
- Which jobs did I apply for?
- What stage am I in? (Applied → Phone screen → Onsite → Offer/Reject)
- Who did I reach out to for referrals? Did they respond?
- When should I follow up?
- What happened? (Outcomes, lessons learned)

---

## Key Features (Wishlist)

### 1. Opportunity Pipeline
- **Status tracking:** Not Applied → Applied → Screening → Interview → Offer/Reject
- **Timeline:** When did I apply? When did they respond? Next follow-up date?
- **Notes:** Interview feedback, red flags, cultural observations
- **Outcome:** Offer details (salary, equity, benefits) or rejection reasons

### 2. Contact Management
- Who did I contact at each company? (Referrals, hiring managers, recruiters)
- What's the status of each outreach? (Sent → Responded → Call scheduled)
- When to follow up?
- Relationship notes (how I know them, context)

### 3. Follow-Up Automation
- Remind me when to follow up (1 week after application, 3 days after interview, etc.)
- Draft follow-up messages based on stage
- Track what I promised to send (references, work samples, case studies)

### 4. Analytics/Insights
- Application → Interview conversion rate
- Which sourcing methods work best? (Referrals vs cold apply vs recruiter reach-out)
- Time to offer (how long does my job search take on average?)
- Lessons learned (what worked, what didn't)

---

## Possible Approaches

### Option 1: Notion Database
- Simple, flexible, no code required
- Databases for Opportunities + Contacts
- Manual entry but powerful views/filtering
- Can integrate with Strategist module

### Option 2: Airtable
- More structured than Notion
- Better for relational data (linking opportunities to contacts)
- Built-in automation/reminders
- API for integration with other modules

### Option 3: Custom App/Script
- Full control over features
- Could auto-populate from email (parse application confirmations)
- Higher effort, more powerful
- Probably overkill for most users

### Option 4: Spreadsheet (Google Sheets / Excel)
- Low-tech, universally accessible
- Easy to customize
- No fancy automation but gets the job done
- Can be enhanced with scripts (Apps Script, Python)

---

## Why Not Build This Yet?

Focus is on **decision-making** (Evaluator) and **strategy** (Strategist) first. Tracking is important but not the bottleneck.

**Priority:** Evaluator → Strategist → Scanner → Tracking

That said, many people already have tracking systems (spreadsheets, Notion, etc.). This module should integrate with what you already use, not replace it.

---

## Integration with Other Modules

- **Evaluator:** When you evaluate a job, option to "Add to pipeline" (creates tracking entry)
- **Strategist:** Strategy notes (referrals, positioning) stored in tracking database
- **Scanner:** New jobs automatically added to "Not Yet Evaluated" status

The tracking module is the **connective tissue** between the other modules.

---

## Contributing

If you want to build this module:
- Start simple: A Notion template or Google Sheet
- Define the schema (what fields are essential?)
- Build views/filters for common workflows (active applications, overdue follow-ups, etc.)
- Consider integration points with Evaluator/Strategist

Open an issue or PR to discuss design.

---

**The tracking module should reduce anxiety, not create busywork.**
