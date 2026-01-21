# Job Evaluator

**Status:** ✅ Working - Tested and refined over multiple real job evaluations

**Purpose:** Reduce 10-15 minutes of "should I apply?" analysis into under 2 minutes with AI-powered fit assessment.

---

## What It Does

Paste a job description. Get instant analysis:

1. **Match Percentage** - Realistic fit score (60-70% is strong, not 90%+)
2. **Strongest Stories** - Which experiences from your background align best
3. **Gap Analysis** - What's missing and how to bridge it
4. **Resume Positioning** - Surgical resume updates for this specific JD
5. **Decision Recommendation** - Pursue, Maybe, or Pass (with reasoning)

---

## How to Use

### Option 1: Claude.ai
1. Go to [claude.ai](https://claude.ai)
2. Start a new conversation
3. Paste the contents of [`prompt.md`](prompt.md)
4. Follow up with the job description you want to evaluate
5. Review the analysis and decide

### Option 2: Claude in Chrome (Recommended for Speed)
1. Install [Claude in Chrome](https://chromewebkit.com/claude) (official Anthropic extension)
2. Save [`prompt.md`](prompt.md) as a custom prompt
3. Trigger it whenever you encounter a job posting
4. Instant analysis without leaving the page

---

## The Prompt Framework

See [`prompt.md`](prompt.md) for the full prompt.

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

**Before:** 10-15 minutes of manual JD analysis, cross-referencing resume, wondering about fit

**After:** Under 2 minutes for comprehensive fit analysis + positioning strategy

**Accuracy:** Tested on 20+ real job postings. Match recommendations align with human intuition but surface insights often missed in manual review.

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
- Write your cover letter (strategist module will help, future)
- Track your applications (tracking module will handle this, future)
- Guarantee you get the job (no tool can do that)

**What this DOES do:**
- Save you time on fit analysis
- Surface your strongest positioning angles
- Give you confidence to pursue or permission to pass
- Reduce guilt-driven rabbit holes

---

## Contributing

If you use this evaluator and find it valuable:
- Share examples (anonymize company names if needed)
- Suggest prompt improvements
- Document edge cases or failures
- Contribute evaluation templates for specific industries/roles

---

## Next Steps

Once you've evaluated a job and decided to **Pursue**:
- Move to the **Strategist** module (future - will help with referrals, resume tailoring, cover letter)
- Log it in the **Tracking** module (future - opportunity pipeline management)

For now: Use the evaluator to decide what's worth your time. Then execute your application strategy manually.

---

**The evaluator doesn't replace your judgment. It amplifies it.**
