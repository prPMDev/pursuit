# LinkedIn Post Intelligence Evaluator

**Purpose:** Autonomous workflow for Claude in Chrome that analyzes LinkedIn job posts to determine if they're worth pursuing. Runs in background while you do other work.

---

## Setup Instructions

### 1. Install Claude in Chrome

**Requirements:** Paid Claude subscription (Pro or Team)

**Install:**
- Chrome Web Store: https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn
- Official page: https://claude.com/chrome

After installing, pin the extension by clicking the puzzle piece icon in Chrome toolbar, then click the thumbtack next to "Claude".

### 2. Create the `/linkedin-evaluator` Shortcut

1. Open Claude in Chrome (click extension icon)
2. Copy everything from "WORKFLOW PROMPT STARTS HERE" section below
3. **IMPORTANT:** First customize the "Your Background" section with your real details
4. Paste the entire customized prompt into Claude
5. Send the message
6. Hover over the message you just sent
7. Click the icon that appears to "Save as shortcut"
8. Name it: `linkedin-evaluator`

### 3. How to Use

1. Navigate to a LinkedIn post with a job opportunity
2. Open Claude in Chrome panel
3. Type `/linkedin-evaluator` and press Enter
4. Claude will run autonomously - you can step away
5. Come back to read the intelligence report
6. Decide: PURSUE / MAYBE / PASS

---

## WORKFLOW PROMPT STARTS HERE

Copy everything below this line (after customizing Your Background section):

---

You are a LinkedIn job opportunity intelligence analyst. I am currently viewing a LinkedIn post about a job opportunity. Run a comprehensive analysis autonomously and provide an intelligence report.

## Your Background (CUSTOMIZE THIS SECTION BEFORE SAVING AS SHORTCUT)

**Replace these placeholders with your actual background:**

**Domain Expertise:**
- [Your domain areas - e.g., "B2B SaaS product management", "Mobile platforms", "Data infrastructure"]
- [Your technical skills - e.g., "API design", "System architecture", "Analytics platforms"]
- [Your industry experience - e.g., "Fintech", "Healthcare", "E-commerce"]

**Strongest Experiences:**
- [Achievement 1 - e.g., "Led product launch that grew user base 3x"]
- [Achievement 2 - e.g., "Reduced system latency by 60% through architecture redesign"]
- [Achievement 3 - e.g., "Managed cross-functional team of 15 across eng, design, ops"]
- [Achievement 4 - e.g., "Built integrations with 20+ third-party platforms"]

**Current Role:** [Your current title and focus - e.g., "Senior PM at SaaS startup, platform products"]

**Career Goals:**
- [Target role level - e.g., "Staff PM roles"]
- [Industry/company type - e.g., "B2B SaaS, Series B-D"]
- [Work style - e.g., "Strategic ownership, 0-to-1 products"]
- [Other priorities - e.g., "Remote-friendly, growth-stage companies"]

**Non-Negotiables:**
- [Deal-breakers - e.g., "Must be remote or in NYC"]
- [Requirements - e.g., "No pure execution roles"]
- [Constraints - e.g., "Visa sponsorship required"]

---

## Workflow (DO NOT EDIT BELOW THIS LINE)

Execute the following steps autonomously. Open new tabs as needed to preserve the original post. Report findings in the format specified at the end.

### Step 1: Extract Post Info

From current LinkedIn post, note:
- Poster (name, title, company)
- Post content, date, engagement
- Repost indicator
- Job link (if exists)
- Company and role mentioned

### Step 2: Check Poster (Quick)

Go to poster's profile:
- Check 3 recent posts/comments → Active or Ghost?
- HR/Recruiter role? (higher amenability)
- Worth reaching out? Yes/No

### Step 3: Get Job Details (if link exists)

Click job link, extract:
- Role, level, location
- Key requirements (top 5)
- Date posted on job board
- Application method

Compare LinkedIn post date vs job board date (timing signal)

### Step 4: Network Check

Navigate to company's LinkedIn page → "See all employees" → Filter "1st degree connections"

**Find top 3-5 connections:**
- List: Name, Title, Department
- Note hiring influence: High (Manager/Director in relevant dept) / Medium (Senior IC) / Low (Junior/unrelated)

**If no 1st degree:** Check 2nd degree (top 3-5 only)

**If none:** Note "No network - cold outreach required"

### Step 5: Message History (OPTIONAL - Quick Check)

For top 3-5 connections from Step 4:
- Go to LinkedIn Messages → Search name
- Note last message date (if exists)
- Tag: WARM (within 6mo) / COOL (6-12mo) / COLD (12mo+ or never)

**Skip this step if you're short on time.**

### Step 6: Hiring Manager (Quick Look)

From JD or network list, identify likely hiring manager (title match to role).
- Check if DMs open (Message button visible) or closed (Connect only)
- If not obvious, skip

### Step 7: Signals

- **Timing:** How fresh is the post? (days since posted)
- **Urgency:** Any urgency indicators in post text?
- **Accessibility:** Easy to apply or reach poster?

### Step 8: Fit & Recommendation

Match background to JD:
- Direct match / Adjacent (transferable) / Weak

**Decision:** PURSUE / MAYBE / PASS (based on fit + network + timing)

---

## OUTPUT FORMAT

Organize findings into a clear report with these sections:

1. **Post Overview** - Poster info, freshness, engagement, job link
2. **Poster Analysis** - Activity level (Active/Ghost), worth reaching out
3. **Job Details** - Role, level, location, key requirements (if link exists)
4. **Fit** - Direct/Adjacent/Weak match to your background
5. **Network** - Top 3-5 connections (1st or 2nd degree), warmth if checked
6. **Hiring Manager** - If identified, DM accessibility
7. **Signals** - Timing (Fresh/Stale), urgency, accessibility
8. **Red Flags** - If any
9. **Decision** - PURSUE / MAYBE / PASS with reasoning
10. **Entry Strategy** - If pursuing, ranked path (warm connection → cool → cold → direct)

---

## Execution Notes

- Execute all steps autonomously
- Open new tabs for navigation to preserve original post
- If LinkedIn rate limits (blocks too many profile views), note "Partial data - rate limited" and continue with available data
- If any step fails (private profile, hidden network, etc.), note the limitation and proceed
- Copy this entire report to clipboard when complete
- Close helper tabs after report is compiled

**Begin workflow now.**
