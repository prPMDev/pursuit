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

### Step 1: Extract Current Post Information

From the LinkedIn post currently visible:
- Poster's name and title
- Poster's company
- Full post content (all text)
- Date posted (or time ago - e.g., "2 days ago")
- Engagement metrics (number of likes, comments)
- Check if this is a repost (look for "reposted this" or similar indicator)
- Extract job link URL if present (or note "No direct link")
- Company name mentioned in post
- Role title mentioned in post

### Step 2: Analyze Poster's LinkedIn Profile

Navigate to the poster's LinkedIn profile (click their name from the post).

**Activity Analysis (last 90 days):**
- Scroll through their activity feed
- Count approximate number of posts published
- Count approximate number of comments made
- Categorize activity level:
  - **Active:** 10+ interactions per month (posts + comments)
  - **Moderate:** 3-10 interactions per month
  - **Low:** 1-3 interactions per month
  - **Ghost:** 0 interactions (profile exists but inactive)

**Amenability Signals:**
- Check for "Open to Work" badge or hiring indicators
- Note if they're in HR/Recruiting/Talent Acquisition role
- Assess engagement style from recent posts/comments (helpful vs promotional vs unresponsive)
- Check if profile is complete (photo, headline, about section)
- Note if they have Premium or Recruiter badge

**Amenability Score:**
- **High:** Active user + HR/Recruiter role OR very engaged in comments
- **Medium:** Moderate activity + professional engagement
- **Low:** Ghost profile OR only promotional posts with no engagement

**Recommendation on poster:**
- Worth reaching out to directly? (Yes/No)
- If No, why? (Inactive, unlikely to respond, etc.)

### Step 3: Navigate to Job Posting (If Link Exists)

If the post contains a job link:
- Click the link (may open company careers page or job board like Greenhouse, Lever, etc.)
- Extract:
  - Full job title
  - Seniority level (IC/Manager, Junior/Mid/Senior/Staff)
  - Location(s)
  - Key requirements (top 5-7 bullet points)
  - Date posted on job board (if visible)
  - Application method (Easy Apply / External ATS / Email / Referral encouraged)

**Timing Signal:**
- Compare job board posting date with LinkedIn post date
- If gap is >7 days: Note "Late signal - role may be partially filled"
- If gap is <3 days: Note "Fresh signal - likely early in search"
- If dates match: Note "Aligned timing"

If no job link:
- Note "No direct job link - will need to search company careers page"

### Step 4: Company Network Analysis

Navigate to the company's LinkedIn page (search for company name).

**1st Degree Connections:**
- Click "See all employees" or use LinkedIn search: `[company name] site:linkedin.com/in/`
- Filter for "1st degree connections" (your connections)
- List ALL 1st degree connections found:
  - Full name
  - Current title
  - Department (if visible - e.g., Engineering, Product, Sales)
  - Potential hiring influence:
    - **High:** Manager/Director/VP in relevant department
    - **Medium:** Senior IC or adjacent team lead
    - **Low:** Junior IC or unrelated department

**2nd Degree Connections:**
- Filter for "2nd degree connections"
- List top 10 most relevant (prioritize by title/department relevance):
  - Full name
  - Current title
  - Mutual connection (who connects you)
  - Potential hiring influence (High/Medium/Low)

If network is hidden or shows 0 connections:
- Note "Company network not visible - may need cold outreach"

### Step 5: Message History Check (1st Degree Only)

For EACH 1st degree connection identified in Step 4:
- Navigate to LinkedIn Messages (top navigation)
- Search for their name in message search
- If conversation exists:
  - Note date of last message (sent or received)
  - Note who sent last message (you or them)
  - Categorize relationship warmth:
    - **WARM:** Last contact within 6 months
    - **COOL:** Last contact 6-12 months ago
    - **COLD:** Last contact 12+ months ago
- If no conversation exists:
  - Categorize as: **COLD - Never Contacted**

**Output for each connection:**
- Name | Last contact: [Date or "Never"] | Warmth: [WARM/COOL/COLD] | Last interaction: [You sent / They sent / N/A]

### Step 6: Identify Hiring Manager

From network analysis and job posting details:
- Identify most likely hiring manager based on:
  - Title alignment (e.g., "Engineering Manager" for eng role, "Director of Product" for PM role)
  - Department match
  - Recent LinkedIn posts about hiring or team growth
  - Mentioned in job posting

If hiring manager identified:
- Navigate to their profile
- Check DM accessibility:
  - **DMs Open:** "Message" button visible
  - **DMs Closed:** Only "Connect" or "Follow" button visible
- Note their activity level (Active/Moderate/Low/Ghost using same criteria as Step 2)

If hiring manager NOT identified:
- Note "Hiring manager not identified - may need to research further"

### Step 7: Posting Signal Analysis

**Timing Signals:**
- Days since LinkedIn post: [Calculate from date in Step 1]
  - <3 days: **Fresh**
  - 3-7 days: **Active**
  - 7-14 days: **Aging**
  - 14+ days: **Stale**

**Urgency Signals (check post content for keywords):**
- Urgent keywords: "urgent", "ASAP", "immediate", "actively hiring", "multiple positions", "hiring now"
- Repost indicator (from Step 1): If poster reposted = increased urgency
- Engagement level: High likes/comments may indicate competitive role

**Accessibility Signals (check post content):**
- "DM me" or "message me" mentioned = **High accessibility**
- "Apply here" with Easy Apply = **Medium accessibility**
- External ATS or complex process = **Lower accessibility**
- "Referrals encouraged" mentioned = **Referral-friendly**

**Overall Urgency Assessment:** High / Medium / Low

### Step 8: Fit Analysis & Intelligence Report

**Map job requirements to my background:**
- Identify which of my strongest experiences align with top requirements
- Calculate fit percentage:
  - 70%+ = Strong fit (structural skills match, domain is learnable)
  - 50-70% = Decent fit (some gaps but bridgeable)
  - <50% = Weak fit (significant gaps)
- Note structural skill matches (transferable across domains)
- Note domain gaps (industry-specific knowledge missing)

**Compile findings into structured report below.**

---

## OUTPUT FORMAT

Provide the intelligence report in this exact format:

```markdown
# LinkedIn Post Intelligence Report
## [Company Name] - [Role Title]

---

### POST OVERVIEW
- **Poster:** [Name], [Title] at [Company]
- **Posted:** [Date/Time ago] | **Freshness:** [Fresh/Active/Aging/Stale]
- **Engagement:** [X likes, Y comments]
- **Repost:** [Yes/No]
- **Job Link:** [URL or "Not provided"]

---

### POSTER ANALYSIS
- **Activity Level:** [Active/Moderate/Low/Ghost]
  - Posts (90 days): ~[X]
  - Comments (90 days): ~[Y]
- **Amenability Score:** [High/Medium/Low]
- **Signals:**
  - [e.g., "Open to Work badge", "Recruiter role", "Engaged commenter", etc.]
- **Worth Direct Outreach:** [Yes/No]
- **Reasoning:** [1-2 sentences]

---

### JOB POSTING DETAILS
[If link exists, otherwise note "No job link provided"]

- **Role:** [Full title]
- **Level:** [Junior/Mid/Senior/Staff/Manager/etc.]
- **Location:** [Location(s)]
- **Posted on Job Board:** [Date] | **Timing Gap:** [X days from LinkedIn post or "Aligned"]
- **Application Method:** [Easy Apply / External ATS / Email / Referral encouraged]

**Top Requirements:**
1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]
4. [Requirement 4]
5. [Requirement 5]

---

### FIT ANALYSIS
- **Overall Fit:** [X%]
- **Structural Skill Matches:** [List 3-5 transferable skills that align]
- **Domain Gaps:** [What industry/context knowledge is missing - note if learnable]
- **Strongest Stories from My Background:**
  1. [Experience/Achievement] → Maps to [Requirement]
  2. [Experience/Achievement] → Maps to [Requirement]
  3. [Experience/Achievement] → Maps to [Requirement]

---

### NETWORK INTELLIGENCE

**1st Degree Connections: [X total]**

[If connections found:]
1. **[Name]** - [Title] | Last contact: [Date or "Never"] | **[WARM/COOL/COLD]** | Hiring influence: [High/Medium/Low]
2. [Repeat for each connection]

[If no connections:]
- No 1st degree connections found at [Company]

**2nd Degree Connections (Top 5):**

[If connections found:]
1. **[Name]** - [Title] | Via: [Mutual connection] | Influence: [High/Medium/Low]
2. [Repeat for top 5]

[If no connections:]
- Limited 2nd degree visibility

**Hiring Manager:**
- **[Name]** - [Title] | DMs: [Open/Closed] | Activity: [Active/Moderate/Low]
  OR
- Not identified - requires further research

---

### ENTRY STRATEGY

**Recommended Path:**
1. [e.g., "Reach out to [WARM Connection Name] - last spoke 2 months ago, high likelihood of response"]
2. [e.g., "If no response in 48hr, try [COOL Connection Name] via mutual connection [Mutual Name]"]
3. [e.g., "Direct message hiring manager [Name] - DMs open, active on LinkedIn"]
   OR
   [e.g., "No warm connections - cold outreach required via LinkedIn/company email"]

**Timing Recommendation:** [Apply now / Wait for referral / Research more / Pass]

**Urgency Level:** [High/Medium/Low]
- Reasoning: [e.g., "Fresh post + urgent keywords + repost = competitive but active search"]

---

### RED FLAGS
[If any concerns identified, list them. Otherwise:]
- None identified

[Examples of red flags:]
- "Job posted 3 weeks ago on job board but LinkedIn post today - may be backfill or slow search"
- "Poster is ghost profile with 0 activity in 90 days - low response likelihood"
- "No 1st/2nd degree connections + DMs closed - difficult access"
- "Vague JD with unrealistic requirements (10 years for mid-level role)"

---

### RECOMMENDATION: [PURSUE / MAYBE / PASS]

**Reasoning:** [2-4 sentences explaining why based on fit, network access, timing, and signals]

**Next Steps If Pursuing:**
- [e.g., "Run /job-evaluator with JD text for detailed resume positioning"]
- [e.g., "Reach out to [Warm Connection] within 24hr"]
- [e.g., "Research company's recent product launches before applying"]

---

**Report generated by LinkedIn Post Intelligence Evaluator**
```

---

## Execution Notes

- Execute all steps autonomously
- Open new tabs for navigation to preserve original post
- If LinkedIn rate limits (blocks too many profile views), note "Partial data - rate limited" and continue with available data
- If any step fails (private profile, hidden network, etc.), note the limitation and proceed
- Copy this entire report to clipboard when complete
- Close helper tabs after report is compiled

**Begin workflow now.**
