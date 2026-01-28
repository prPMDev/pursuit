# Tracking

**Status:** ✅ Working - Notion Template

**Purpose:** Job opportunity pipeline management. Track what you're pursuing, who you've contacted, and what stage you're in. Never lose track of follow-ups.

---

## Overview

After the evaluators give you a **PURSUE** decision, you need somewhere to track that opportunity. This module uses Notion as the tracking system with two linked databases:

1. **Opportunity Tracker** - Companies and roles you're pursuing
2. **Contact Tracker** - People at those companies (hiring managers, referrals, recruiters)

The databases are **related** - each contact links to an opportunity, giving you a complete view of your pipeline.

---

## Recommended Schema

### 1. Opportunity Tracker

Track companies and roles in your pipeline.

| Field | Type | Purpose | Source |
|-------|------|---------|--------|
| Company Name | Title | Primary identifier | Job post |
| Job URL | URL | Link to job posting | LinkedIn/careers page |
| Role | Text | Job title | Job post |
| Status | Select | Pipeline stage | Manual |
| Location | Select | Work location | Job post |
| Industry/Theme | Select | Domain category | Job post |
| Why a Good Fit | Text | Fit reasoning | HLL Evaluator |
| Network First | Select | Network access level | LinkedIn Evaluator |
| Date Added | Date | When added to pipeline | Auto |
| Tailored Resume | Files | Custom resume for this role | Manual |
| Contacts | Relation | People at this company | Link to Contact Tracker |

### 2. Contact Tracker

Track people at each company and your outreach status.

| Field | Type | Purpose | Source |
|-------|------|---------|--------|
| Name | Title | Contact's name | LinkedIn Evaluator |
| Company | Relation | Links to Opportunity | Link to Opportunity Tracker |
| Role | Text | Their job title | LinkedIn |
| LinkedIn URL | URL | Profile link | LinkedIn Evaluator |
| Email | Email | Contact email | Hunter.io, research |
| Contact Type | Select | How you know them | LinkedIn Evaluator |
| Outreach Status | Select | Where you are in outreach | Manual |
| Last Contacted | Date | For follow-up timing | Manual |
| Notes | Text | Context, conversation notes | Manual |

---

## How Evaluator Outputs Map to Notion

When you get a **PURSUE** from both evaluators, here's what goes where:

### From LinkedIn Evaluator → Notion

| Evaluator Output | → | Notion Field |
|------------------|---|--------------|
| Company name | → | Company Name (Opportunity) |
| Job post URL | → | Job URL (Opportunity) |
| Network access assessment | → | Network First (Opportunity) |
| Hiring manager name | → | New Contact entry |
| Hiring manager LinkedIn | → | LinkedIn URL (Contact) |
| Warm connections (top 3-5) | → | New Contact entries |
| Entry strategy notes | → | Notes (Contact) |

### From HLL Evaluator → Notion

| Evaluator Output | → | Notion Field |
|------------------|---|--------------|
| Role title | → | Role (Opportunity) |
| Fit assessment | → | Why a Good Fit (Opportunity) |
| Match type (Direct/Adjacent/Stretch) | → | Can inform Status priority |

---

## Setup

Create two Notion databases matching the schemas above, then link them via a Relation property. The key is having **Opportunities ↔ Contacts** connected so you can see all people at each company.

---

## Workflow

```
LinkedIn Post
     ↓
┌─────────────────────┐
│ LinkedIn Evaluator  │ → PURSUE / PASS
│ (network intel)     │
└─────────────────────┘
     ↓ (if PURSUE)
┌─────────────────────┐
│ HLL Evaluator       │ → PURSUE / MAYBE / PASS
│ (job fit)           │
└─────────────────────┘
     ↓ (if PURSUE)
┌─────────────────────┐
│ Add to Notion       │
│ - Create Opportunity│
│ - Add Contacts      │
│ - Set Status        │
└─────────────────────┘
     ↓
Work the opportunity
(outreach, apply, interview)
```

---

## Tips

- **Update Last Contacted** every time you reach out - this powers follow-up reminders
- **Use Notes liberally** - capture conversation context, what they said, what you promised
- **Move Contacts to Closed** when they're no longer relevant (declined to help, role filled, etc.)
- **Don't over-track** - only add opportunities you're genuinely pursuing (this is anti-mass-apply)

---

## Integration with Other Modules

- **Evaluator** outputs flow into Notion when you decide to PURSUE
- **Strategist** (future) will help craft outreach messages using Contact data
- **Scanner** (future) could auto-add opportunities to "Not Started" status

---

## Known Limitations

**Notion MCP (Claude Code/Desktop):** Creating entries via MCP is currently unreliable (~40% failure rate due to parameter formatting issues - [tracked here](https://github.com/makenotion/notion-mcp-server/issues/74)). Workaround: MCP works for reading/querying; use manual entry for creates until Anthropic fixes this.

## Alternative Approaches

The same schema works in Airtable, Google Sheets, or a custom app. The key is having **two linked entities** (Opportunities ↔ Contacts) with status tracking for both.
