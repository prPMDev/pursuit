# Job Evaluators

**Status:** ✅ Working - Tested and refined over multiple real job evaluations

**Purpose:** Reduce 10-15 minutes of "should I apply?" analysis into under 2 minutes with AI-powered intelligence and fit assessment.

---

## Two-Step Evaluation Process

### Step 1: LinkedIn Post Intelligence (New!)

**When:** Someone sends you a LinkedIn job post OR you find one yourself

**What:** Run [`linkedin-evaluator-prompt.md`](linkedin-evaluator-prompt.md) in Claude in Chrome to get network intelligence:

- **Poster credibility** - Are they active on LinkedIn? Worth reaching out?
- **Network analysis** - Who do you know at the company? (1st/2nd degree)
- **Message history (optional)** - When did you last talk to each connection? (Warm vs Cold)
- **Timing signals** - How fresh is the post? Is the role still active?
- **Hiring manager access** - Can you DM them directly?
- **Entry strategy** - Ranked list of best paths in (warm referral → cool contact → cold)

**Output:** Intelligence report with recommendation (PURSUE / MAYBE / PASS) based on network access and signals

**NOTE:** This does NOT analyze job fit - that's Step 2

**Time:** 3-5 minutes (runs autonomously in background)

### Step 2: Job Description Fit Analysis

**When:** You decided to PURSUE after Step 1 (or you already have the JD text)

**What:** Run [`HLL-job-eval-prompt.md`](HLL-job-eval-prompt.md) to get quick fit assessment:

1. **Match Type** - Direct / Adjacent / Stretch / Pass
2. **Level Fit** - Right fit / Too junior / Too senior
3. **Red Flags** - Execution-only, unrealistic requirements, non-negotiables violated
4. **Decision** - PURSUE / MAYBE / PASS with reasoning

**Output:** Quick fit categorization (saves detailed resume work for later)

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
8. Copy the entire prompt **as-is** (no customization needed)
9. Paste into the Shortcuts page
10. Name it: `linkedin-evaluator`
11. Save

**Method 2: From Chat**
1. Open [`linkedin-evaluator-prompt.md`](linkedin-evaluator-prompt.md)
2. Copy the entire prompt **as-is**
3. In Claude in Chrome, paste and send it
4. **Hover over the prompt you just sent**
5. Click the **save icon** that appears
6. Name it: `linkedin-evaluator`

**IMPORTANT - First Few Runs:**
For your first 2-3 runs, enable **"Ask before acting"** in Claude in Chrome:
1. Open Claude in Chrome settings (three dots menu)
2. Enable "Ask before acting"
3. This lets you approve each step (navigating to profiles, checking messages, etc.)
4. Once you trust the workflow, disable it for fully autonomous execution

**Use:**
1. Navigate to LinkedIn post with job opportunity
2. Open Claude in Chrome panel
3. Type `/linkedin-evaluator` and press Enter
4. Step away - Claude runs autonomously (or approve each step if "Ask before acting" is on)
5. Come back to read intelligence report

### Job Evaluator (Step 2) - Any Claude Interface

**Option 1: Claude.ai**
1. Go to [claude.ai](https://claude.ai)
2. Start a new conversation
3. Paste the contents of [`HLL-job-eval-prompt.md`](HLL-job-eval-prompt.md)
4. Follow up with the job description you want to evaluate
5. Review the analysis and decide

**Option 2: Claude in Chrome (for repeat use)**

Create `/job-evaluator` shortcut using either method:
- **Method 1:** Three dots > Settings > Shortcuts > Paste customized [`HLL-job-eval-prompt.md`](HLL-job-eval-prompt.md) > Save as `/job-evaluator`
- **Method 2:** Send customized prompt in chat > Hover > Click save icon > Name it `/job-evaluator`

Then use: Paste JD text, type `/job-evaluator`, instant analysis

---

## The Evaluator Framework

### LinkedIn Intelligence ([`linkedin-evaluator-prompt.md`](linkedin-evaluator-prompt.md))

**Key Features:**
- Autonomous workflow for Claude in Chrome
- Poster credibility analysis (active vs ghost profile)
- Network mapping (top 3-5 connections, 1st or 2nd degree)
- Message history checking - OPTIONAL (warm/cool/cold categorization)
- Hiring manager identification and DM access check
- Timing signal analysis (fresh vs stale posts)
- Entry strategy ranked by likelihood of success
- **Does NOT analyze job fit** - focuses only on network access and signals

### Job Fit Analysis ([`HLL-job-eval-prompt.md`](HLL-job-eval-prompt.md))

**Key Features:**
- Quick fit categorization: Direct / Adjacent / Stretch / Pass
- Level alignment check (right fit / too junior / too senior)
- High-level domain and experience matching
- Red flag detection (execution-only roles, unrealistic requirements)
- Decision framework (Pursue/Maybe/Pass with reasoning)
- **Lightweight** - saves detailed story/resume work for later (desktop/web project)

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

**LinkedIn Evaluator:**
- **No customization needed** - Just copy and use as-is
- Works the same for everyone (network intelligence is universal)

**Job Evaluator:**
- **Update the "My Background" section** with:
  - Your domain (e.g., "B2B SaaS product management, integrations")
  - Years of experience
  - Current and target level
  - Non-negotiables (remote requirements, visa needs, role type)
- That's it - keep it simple and high-level

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

These evaluators are built on principles that go against typical job search advice:

- **Adjacent is OK.** Structural skills transfer across domains. If you've built integrations in fintech, you can do it in healthcare. Domain is learnable.
- **Network first, fit second.** A warm connection at a 70% match beats no connection at a 90% match.
- **Quick filtering, deep work later.** Use these evaluators to filter fast (network intel + basic fit), save detailed resume/story work for desktop project after both pass.
- **Quality > volume.** Better to pursue 5 well-researched opportunities than spray 50 generic applications.

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
