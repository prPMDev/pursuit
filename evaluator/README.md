# Job Evaluators

**Status:** ✅ Working - Tested and refined over multiple real job evaluations

**Purpose:** Reduce 10-15 minutes of "should I apply?" analysis into under 2 minutes with AI-powered intelligence and fit assessment.

---

## Two-Step Evaluation Process

### Step 1: LinkedIn Post Intelligence (New!)

**When:** Someone sends you a LinkedIn job post OR you find one yourself

**What:** Run [`linkedin-evaluator-prompt.md`](linkedin-evaluator-prompt.md) in Claude in Chrome to get comprehensive intelligence:

- **Poster credibility** - Are they active on LinkedIn? Worth reaching out?
- **Network analysis** - Who do you know at the company? (1st/2nd degree)
- **Message history** - When did you last talk to each connection? (Warm vs Cold)
- **Timing signals** - How fresh is the post? Is the role still active?
- **Hiring manager access** - Can you DM them directly?
- **Entry strategy** - Ranked list of best paths in (warm referral → cool contact → cold)
- **Initial fit assessment** - Is this even worth pursuing?

**Output:** Intelligence report with recommendation (PURSUE / MAYBE / PASS)

**Time:** 3-5 minutes (runs autonomously in background)

### Step 2: Job Description Fit Analysis

**When:** You decided to PURSUE after Step 1 (or you already have the JD text)

**What:** Run [`prompt.md`](prompt.md) to get detailed fit assessment:

1. **Match Percentage** - Realistic fit score (60-70% is strong, not 90%+)
2. **Strongest Stories** - Which experiences from your background align best
3. **Gap Analysis** - What's missing and how to bridge it
4. **Resume Positioning** - Surgical resume updates for this specific JD
5. **Decision Recommendation** - Final confirmation with reasoning

**Output:** Detailed fit analysis and resume positioning strategy

**Time:** Under 2 minutes

---

## How to Use

### LinkedIn Evaluator (Step 1) - Claude in Chrome

**Install Claude in Chrome:**
- Chrome Web Store: https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn
- Official page: https://claude.com/chrome
- **Requires:** Paid Claude subscription (Pro or Team)

**Create Shortcut (One-Time Setup) - Two Methods:**

**Method 1: Via Settings (Recommended)**
1. Install the extension from Chrome Web Store
2. Open the extension (click the Claude icon in your Chrome toolbar)
3. Log in with your Claude account
4. Click the **three dots** (menu) at the top of the extension
5. Go to **Settings**
6. Click **Shortcuts**
7. Open [`linkedin-evaluator-prompt.md`](linkedin-evaluator-prompt.md)
8. **Customize** the "Your Background" section with your real details
9. Copy the entire customized prompt (from "WORKFLOW PROMPT STARTS HERE" section)
10. Paste into the Shortcuts page
11. Name it: `linkedin-evaluator`
12. Save

**Method 2: From Chat**
1. Open [`linkedin-evaluator-prompt.md`](linkedin-evaluator-prompt.md) and customize your background
2. Copy the entire customized prompt
3. In Claude in Chrome, paste and send it
4. **Hover over the prompt you just sent**
5. Click the **save icon** that appears
6. Name it: `linkedin-evaluator`

**Use:**
1. Navigate to LinkedIn post with job opportunity
2. Open Claude in Chrome panel
3. Type `/linkedin-evaluator` and press Enter
4. Step away - Claude runs autonomously
5. Come back to read intelligence report

### Job Evaluator (Step 2) - Any Claude Interface

**Option 1: Claude.ai**
1. Go to [claude.ai](https://claude.ai)
2. Start a new conversation
3. Paste the contents of [`prompt.md`](prompt.md)
4. Follow up with the job description you want to evaluate
5. Review the analysis and decide

**Option 2: Claude in Chrome (for repeat use)**

Create `/job-evaluator` shortcut using either method:
- **Method 1:** Three dots > Settings > Shortcuts > Paste customized [`prompt.md`](prompt.md) > Save as `/job-evaluator`
- **Method 2:** Send customized prompt in chat > Hover > Click save icon > Name it `/job-evaluator`

Then use: Paste JD text, type `/job-evaluator`, instant analysis

---

## The Evaluator Framework

### LinkedIn Intelligence ([`linkedin-evaluator-prompt.md`](linkedin-evaluator-prompt.md))

**Key Features:**
- Autonomous workflow for Claude in Chrome
- Poster credibility analysis (activity, amenability)
- Network mapping with warm/cool/cold categorization
- Message history checking (when did you last contact each person)
- Hiring manager identification and DM access check
- Timing signal analysis (fresh vs stale posts)
- Entry strategy ranked by likelihood of success

### Job Fit Analysis ([`prompt.md`](prompt.md))

**Key Features:**
- Structured fit analysis (not vibes-based)
- Story-first matching (your experiences > keyword bingo)
- Realistic expectations (60-70% fit is strong)
- Actionable recommendations (not just "you should apply")
- Decision framework (Pursue/Maybe/Pass with reasoning)

---

## Examples

See [`examples/`](examples/) for real job evaluations:
- Senior PM roles
- Platform/Integration positions
- Partnerships roles
- Domain-shift opportunities (B2B SaaS → fintech, etc.)

Each example shows:
- Original JD
- Evaluator output
- Actual decision made
- Outcome (if applied)

---

## Customization

The prompt is designed to be **personalized to you**. To adapt it:

1. Replace the sample background with your own experiences
2. Update the skill framework with your strengths
3. Adjust the "Pass" criteria to match your non-negotiables
4. Tune the match percentage thresholds to your comfort level

The evaluator is only as good as the context you give it about yourself.

---

## Performance

**The Old Way (Manual):**
- 10-15 minutes per LinkedIn post:
  - Check if poster is credible
  - Look up who you know at company
  - Search LinkedIn messages to remember last contact
  - Check when job was posted
  - Figure out if there's a way in
  - Read JD and wonder about fit
  - Cross-reference resume
  - Overthink and procrastinate

**The New Way (Two-Step Evaluation):**
- **Step 1 (LinkedIn Intel):** 3-5 minutes autonomous analysis → PURSUE/MAYBE/PASS decision
- **Step 2 (Job Fit):** Under 2 minutes for detailed fit analysis and resume positioning
- **Total:** 5-7 minutes for complete intelligence + strategy

**Accuracy:** Tested on 20+ real job postings. Recommendations align with human intuition but surface network insights and timing signals often missed in manual review.

---

## Philosophy

This evaluator is built on principles that go against typical job search advice:

- **60-70% fit is enough.** Don't self-select out because you're "only" 70% qualified.
- **Structural skills transfer.** If you've built integrations in fintech, you can build them in e-commerce. Domain is learnable.
- **Story > keywords.** The evaluator finds narrative threads in your background, not just keyword matches.
- **Quality > volume.** Better to pursue 5 well-matched jobs than spray 50 generic applications.

---

## Limitations

**What this does NOT do:**
- Automatically apply for you (that's mass-apply spam)
- Send messages to your connections (you still need to reach out manually)
- Write your cover letter (strategist module will help, future)
- Track your applications (tracking module will handle this, future)
- Guarantee you get the job (no tool can do that)

**What this DOES do:**
- Save you 10+ minutes of manual intelligence gathering per post
- Map your network with warm/cool/cold signals
- Surface your strongest positioning angles
- Give you a ranked entry strategy
- Give you confidence to pursue or permission to pass
- Reduce guilt-driven rabbit holes and analysis paralysis

---

## Contributing

If you use this evaluator and find it valuable:
- Share examples (anonymize company names if needed)
- Suggest prompt improvements
- Document edge cases or failures
- Contribute evaluation templates for specific industries/roles

---

## Next Steps

**After Step 1 (LinkedIn Intel):**
- If **PURSUE** → Run Step 2 (Job Fit Analysis)
- If **MAYBE** → Do more research or save for later
- If **PASS** → Move on guilt-free

**After Step 2 (Job Fit):**
- If confirmed **PURSUE** → Reach out to warm connections using entry strategy
- Move to the **Strategist** module (future - will help with referrals, resume tailoring, cover letter)
- Log it in the **Tracking** module (future - opportunity pipeline management)

For now: Use the two-step evaluation to decide what's worth your time and how to get in. Then execute your outreach and application strategy manually.

---

**These evaluators don't replace your judgment. They amplify it.**
