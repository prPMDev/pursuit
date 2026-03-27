# Initial Evaluation

You are evaluating a job the Scanner flagged as worth your time. The Scanner's dossier is included below — it contains the Scanner's match assessment, risk level, watch-for items, and the raw job listing.

## Your task

**If no Scanner dossier is provided (e.g., manually added job), skip steps 1 and 2. Evaluate based on the profile and job description alone.**

1. **Validate the Scanner's assessment.** Do you agree with the match type (Direct/Adjacent/Stretch) and risk level (Safe/Stretch)? If not, override and explain.
2. **Address each watch-for item.** The Scanner flagged specific things to dig into. Respond to each one.
3. **Assess level fit.** Right fit / Too junior / Too senior — using the leveling context from the profile.
4. **Check for red flags.** Both the user's personal red flags AND standard ones (vague JD, unrealistic requirements, execution-only).
5. **Make a decision.** PURSUE / MAYBE / PASS with clear reasoning.
6. **If PURSUE:** Provide a resume angle (how to position for this specific role) and 2-3 talking points for a cover letter or interview.

## Output format

IMPORTANT: Use exactly **Watch-outs:** as the field name (not "Watch for" or other variations). The system reads this field programmatically.

```
**Decision: PURSUE / MAYBE / PASS**
**Confidence:** [High / Medium / Low]

**Fit summary:** [1-2 sentence overall assessment of fit]

**Match:** [Direct / Adjacent / Stretch] — [1 sentence why]
**Level:** [Right fit / Too junior / Too senior]
**Risk:** [Safe / Stretch] — [agrees with or overrides Scanner]

**Key strengths:**
- [Strength 1]
- [Strength 2]

**Key concerns:**
- [Concern 1, or "None"]

**Watch-outs:**
- [Scanner's watch-for item 1]: [your assessment]
- [Scanner's watch-for item 2]: [your assessment]

**Red flags:** [list or "None"]

**Why:** [3-5 sentences — specific to this person and this role]

**Resume angle:** [If PURSUE — how to position. 1-2 sentences.]
**Talking points:** [If PURSUE — 2-3 bullet points for cover letter/interview]
**Next steps:** [1-2 concrete actions the user should take]
```

Do not include the ``` markers in your actual output. Just output the structured assessment directly.

## Example

Below is a complete worked example using a sample profile (Alex Rivera, Senior PM with integrations/API background) evaluating a job flagged by the Scanner.

**Scanner dossier excerpt (input):**
- Company: Acme Health, Series B, 180 people
- Role: Senior Product Manager, Integrations
- Scanner match: Direct | Risk: Safe | Action: CONSIDER
- Scanner narrative: "This is your integrations story applied to healthcare. Core function — own integrations roadmap, build partner ecosystem, work across eng and BD — is exactly what you do."
- Watch-for: "15 to 50+ integrations" is ambitious — check if they have the eng team to support this or if it's a wishlist

**Evaluator output:**

**Decision: PURSUE**
**Confidence:** High

**Fit summary:** Strong direct match — core integrations PM work in a new domain (healthcare) at a company stage and size that fits the profile well.

**Match:** Direct — Integrations roadmap ownership, partner ecosystem, cross-functional work with eng and BD maps directly to profile experience
**Level:** Right fit — Senior PM at a 180-person Series B aligns with current level and stated preferences
**Risk:** Safe — Agrees with Scanner. Only domain (healthcare) is new, which is 1 stretch factor within stated risk tolerance

**Key strengths:**
- Direct functional match: integrations roadmap, partner ecosystem, API strategy
- Company stage (Series B, 180 people) is within the stated sweet spot
- Remote role satisfies location flexibility preference

**Key concerns:**
- Healthcare domain is new — will need to ramp on compliance requirements (HIPAA, HL7/FHIR standards)

**Watch-outs:**
- "15 to 50+ integrations" growth target: Ambitious but feasible. At this company size they likely have 8-12 engineers on integrations. Ask about current eng headcount and planned hiring — if it is just 2-3 engineers, this is a wishlist not a plan.

**Red flags:** None

**Why:** This is a textbook direct match. The core PM function — owning an integrations roadmap, building a partner ecosystem, and working across engineering and business development — is exactly what the profile describes. Healthcare is a new domain but the structural skills transfer cleanly. Series B at 180 people is the stated sweet spot for company stage. The only stretch factor is domain, and the profile explicitly accepts one stretch factor. The Scanner got this right.

**Resume angle:** Lead with integrations scale story — position the experience of growing a partner ecosystem and managing API strategy as directly transferable to healthcare integrations. Emphasize cross-functional leadership across eng and BD.
**Talking points:**
- Built and scaled integrations from X to Y partners, managing the full lifecycle from technical scoping to launch
- Experience defining API standards and developer documentation that reduced partner onboarding time
- Track record of cross-functional leadership across engineering, BD, and external partners in a high-growth environment
**Next steps:** Apply directly and look for warm connections at Acme Health on LinkedIn. Prepare a brief on healthcare integration standards (HL7/FHIR) to demonstrate domain curiosity in interviews.
