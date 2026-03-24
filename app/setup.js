/**
 * Pursuit — First-Time Setup & Calibration
 *
 * Conversational onboarding flow that builds the user's profile
 * and reference examples through a guided chat with Claude.
 *
 * Not a form. A conversation.
 */

// Setup conversation steps
export const SETUP_STEPS = [
  {
    id: 'welcome',
    prompt: null, // No Claude call — just UI
    message: `Welcome to Pursuit.

I help you find the right 3-5 jobs worth your time — not 500 to spray at.

Let's get you set up. This takes about 5 minutes, and it makes everything that follows dramatically better.`,
    action: 'next', // Just show a "Let's go" button
  },
  {
    id: 'identity',
    systemPrompt: `You are a career coach doing an intake conversation. The user just told you about themselves professionally. Your job is to extract structured data from their response.

Be warm but efficient. Acknowledge what they said, reflect back what you heard to confirm, and ask ONE follow-up if anything is unclear.

Extract and return a JSON block at the end of your response in this exact format:
\`\`\`json
{
  "identity": "one sentence summary of who they are",
  "brand": "what they're known for",
  "domain": "their domain/field",
  "years": "years of experience",
  "currentLevel": "current level",
  "targetLevel": "target level",
  "skills": ["top 3-5 skills"]
}
\`\`\``,
    userPrompt: `Tell me about yourself in a few sentences — what you do, what you're known for, what level you're at. Don't overthink it — talk to me like you'd describe yourself to a friend at a dinner party.`,
    action: 'chat',
  },
  {
    id: 'logistics',
    systemPrompt: `You are continuing a career coaching intake. The user is telling you about their logistics — location, compensation, work style. Extract structured data.

Be brief. Confirm what you heard. Return JSON:
\`\`\`json
{
  "location": "where they are",
  "remotePreference": "remote/hybrid/onsite preference",
  "compensation": "target range",
  "compFlexibility": "what they'd trade off",
  "nonNegotiables": ["hard stops, 3-5 items"]
}
\`\`\``,
    userPrompt: `Now the practical stuff. Where are you located? Remote, hybrid, or onsite? What's your target comp range? And what are your absolute non-negotiables — the things where if the job violates them, it's an instant no?`,
    action: 'chat',
  },
  {
    id: 'loved',
    systemPrompt: `You are a career coach analyzing a job listing the user loves. Your job is to understand WHY they love it — not just what it says, but what it signals about what matters to them.

Ask 1-2 probing questions: "What specifically about this grabbed you?" "Is it the role, the company, or both?"

Then extract:
\`\`\`json
{
  "type": "loved",
  "company": "company name if visible",
  "role": "role title",
  "whyLoved": ["3-5 specific reasons this appeals to them"],
  "signals": ["what this tells us about their preferences"]
}
\`\`\``,
    userPrompt: `Now I want to calibrate. Paste a job listing you'd DEFINITELY apply to — one that made you think "yes, this is me." It can be one you applied to before, or one you're looking at now.`,
    action: 'chat',
  },
  {
    id: 'hated',
    systemPrompt: `You are a career coach analyzing a job listing the user would skip. Understand WHY — what signals turned them off. These become their personal red flags.

Ask 1 probing question if needed.

Extract:
\`\`\`json
{
  "type": "hated",
  "company": "company name if visible",
  "role": "role title",
  "whyHated": ["3-5 specific reasons this is a no"],
  "redFlags": ["patterns to watch for in future listings"]
}
\`\`\``,
    userPrompt: `Now paste one you'd DEFINITELY skip — a job that made you think "nope" or "this isn't me." What made you pass?`,
    action: 'chat',
  },
  {
    id: 'maybe',
    systemPrompt: `You are a career coach analyzing an ambiguous job listing — one the user is torn on. This reveals their risk tolerance and stretch boundaries.

Ask: "What's pulling you toward it? What's holding you back?"

Extract:
\`\`\`json
{
  "type": "maybe",
  "company": "company name if visible",
  "role": "role title",
  "pullFactors": ["what's attractive"],
  "hesitations": ["what gives them pause"],
  "riskInsight": "what this tells us about their stretch tolerance"
}
\`\`\``,
    userPrompt: `Last one. Paste a "maybe" — the kind of listing you'd agonize over. Could go either way. What's pulling you toward it, and what's holding you back?`,
    action: 'chat',
  },
  {
    id: 'synthesis',
    systemPrompt: `You are a career coach wrapping up an intake session. You've learned about this person through conversation and through analyzing job listings they love, hate, and are ambiguous about.

Synthesize everything into a complete professional profile in markdown format. Use the EXACT format below — this will be saved as their profile.md:

# My Profile

## Professional Identity
**Who are you in one sentence?** [from identity step]
**Your brand:** [what they're known for]
**Years of experience:** [X years]

## Confidence Zones
**What you're great at:** [extracted from identity + loved listing]
**What you're building:** [inferred from maybe listing stretch areas]
**What you want to learn:** [inferred from their interests]

## Level & Leveling
**Current level:** [from identity]
**Target level:** [from identity]
**Leveling context:** [if they mentioned anything about company size/level equivalences]

## Compensation
**Target range:** [from logistics]
**Flexibility:** [from logistics]

## Location & Work Style
**Location:** [from logistics]
**Remote preference:** [from logistics]

## Non-Negotiables
[bulleted list from logistics + inferred from hated listing]

## Risk Appetite
**Where I play safe:** [inferred from their responses]
**Where I'll stretch:** [inferred from maybe listing]

## Personal Red Flags
[bulleted list — extracted from hated listing + patterns]

## Culture & Personality Fit
[inferred from their language, what energizes vs drains them]

---

Also provide a brief summary at the end: "Here's what I learned about you: [2-3 sentence summary]". Ask if anything needs adjusting.

IMPORTANT: Output the full profile markdown. This will be saved directly.`,
    userPrompt: null, // Generated from previous steps
    action: 'synthesize',
  },
  {
    id: 'search',
    systemPrompt: `Based on the user's profile, suggest 2-3 job search queries they should use. Format:

\`\`\`json
{
  "queries": [
    {"query": "search terms", "location": "location", "sources": ["linkedin", "indeed"]},
    {"query": "alternative terms", "location": "location", "sources": ["linkedin", "indeed"]}
  ]
}
\`\`\`

Keep queries focused. Quality over volume. Explain why you chose each one.`,
    userPrompt: `Based on everything you know about me, what should my daily job search queries be? Suggest 2-3 focused searches.`,
    action: 'chat',
  },
  {
    id: 'done',
    prompt: null,
    message: `You're all set.

Your profile is saved. Your reference examples are stored. Your search queries are configured.

Tomorrow morning (or right now), click "Fetch Jobs" and I'll find what's worth your time.

Remember: the goal isn't to find more jobs. It's to find the right ones.`,
    action: 'complete',
  },
];

/**
 * Build the synthesis prompt from all previous conversation data.
 */
export function buildSynthesisContext(conversationHistory) {
  const parts = ['Here is everything I learned about this person during our setup conversation:\n'];

  for (const [stepId, messages] of Object.entries(conversationHistory)) {
    if (stepId === 'welcome' || stepId === 'done') continue;
    parts.push(`## ${stepId.charAt(0).toUpperCase() + stepId.slice(1)} Step`);
    for (const msg of messages) {
      parts.push(`**${msg.role}:** ${msg.content}\n`);
    }
  }

  parts.push('\nNow synthesize this into a complete profile. Use the exact markdown format specified.');
  return parts.join('\n');
}

/**
 * Extract JSON blocks from Claude's response.
 */
export function extractJSON(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch { return null; }
  }
  return null;
}

/**
 * Extract the profile markdown from the synthesis response.
 * Looks for content starting with "# My Profile"
 */
export function extractProfileMarkdown(text) {
  const profileMatch = text.match(/(# My Profile[\s\S]*?)(?:\n---\n|\nHere's what I learned)/);
  if (profileMatch) return profileMatch[1].trim();

  // Fallback: if response starts with the profile
  if (text.includes('# My Profile')) {
    const start = text.indexOf('# My Profile');
    return text.substring(start).trim();
  }

  return text; // Return full text as fallback
}
