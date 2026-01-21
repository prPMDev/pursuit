# Strategist (Planned)

**Status:** 🚧 Not yet built

**Purpose:** Once you decide to pursue a job, build your application strategy. Referrals, positioning, resume tailoring, interview prep.

---

## Vision

You've used the **Evaluator** and decided: "Yes, I'm pursuing this."

Now what?

The **Strategist** helps you:
1. Find referral pathways (who do you know at this company? 1st/2nd degree connections?)
2. Tailor your resume (surgical edits based on evaluator output)
3. Draft positioning angles (cover letter, cold emails, LinkedIn reach-outs)
4. Prep for interviews (questions to expect, stories to prepare, company research)

---

## Key Features (Wishlist)

### 1. Referral Pathfinding
- Parse LinkedIn connections to find 1st/2nd degree paths to the company
- Surface mutual connections with context (how you know them, relationship strength)
- Draft referral request messages (personalized, not templated spam)

### 2. Resume Tailoring
- Take evaluator output (keywords, story angles, positioning recommendations)
- Generate surgical resume edits (before/after bullets)
- Ensure ATS compatibility (keyword density without keyword stuffing)

### 3. Positioning Strategy
- Generate cover letter angles (not full letter - just the hook/story)
- Draft cold email templates for reaching out to hiring managers
- LinkedIn connection request messages
- "Why this company" research summary

### 4. Interview Prep Head Start
- Based on JD, predict likely interview questions
- Map your stories (BUPARL/STAR format) to expected questions
- Company research: recent news, product launches, competitor analysis
- Interviewer research (if you know who's interviewing you)

---

## Why Not Build This Yet?

The **Evaluator** needs to be solid first. If you're pursuing the wrong jobs, strategy doesn't matter.

**Priority:** Evaluator → Strategist → Scanner → Tracking

But this is next. Once the evaluator is stable, building the strategist makes sense.

---

## Possible Approaches

### Option 1: AI-Assisted Prompt Templates
- Create Claude/GPT prompts for each strategy step
- User copies output from Evaluator → feeds into Strategist prompts
- Modular, easy to customize

### Option 2: Integrated Workflow
- Script that takes Evaluator output → generates resume diff → drafts outreach messages
- More automated, less copy-paste
- Requires tighter integration between modules

### Option 3: Notion/Database Integration
- Store opportunities in a database (Notion, Airtable, etc.)
- Strategist reads from database, writes strategy notes back
- Enables tracking over time (see Tracking module)

---

## Contributing

If you want to build this module:
- Start with one piece: referral pathfinding OR resume tailoring OR positioning
- Don't try to build everything at once
- Focus on quality output, not automation for automation's sake
- Test with real job applications, not hypotheticals

Open an issue or PR to discuss design.

---

**The strategist should make your pursuit intentional, not just faster.**
