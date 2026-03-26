# Why Pursuit Is Custom Code, Not an n8n Workflow

## The Question

"Why can't this just be an n8n workflow?" Fair question. Pursuit fetches jobs, calls an API, saves files. That sounds like a workflow. Here's the honest answer.

## What n8n CAN Do

n8n handles roughly 30-40% of what Pursuit does today.

**API calls.** The `callClaude()` function in `server.js` is a single POST to `api.anthropic.com`. n8n's HTTP Request node does this trivially.

**Scheduled triggers.** n8n's Cron node maps cleanly to a daily morning fetch. Better than what Pursuit has today (no scheduler yet).

**File operations.** Read/Write File nodes can manage the markdown data layer — profile.md, decisions.md, scans, evaluations.

**Branching logic.** "Does profile exist? Does evaluation exist?" — n8n's IF and Switch nodes handle this.

**Integration breadth.** If Pursuit ever wants Slack notifications, email digests, Notion updates — n8n has nodes for all of these out of the box. That's genuinely useful and would require custom code otherwise.

**Visual debugging.** n8n's execution view shows data flowing through each node. When scanner output parsing fails, you see the exact data at each step instead of reading console logs.

## What n8n CANNOT Do

This is where the analysis gets real.

### Conversational Setup

The setup flow is a multi-turn, stateful conversation across 9 steps. The user types free-form text, Claude responds, `conversationHistory` accumulates across steps, and the synthesis step aggregates all prior conversations into a single prompt.

n8n workflows are triggered, they execute, they finish. There is no concept of a multi-turn conversation with a human in the loop. You could hack something with n8n's "Wait" node (pauses until a webhook fires), but you'd be building a state machine out of webhook callbacks. Each step would be a separate webhook endpoint. The conversation history would need external storage. The UI would need to know which webhook to call next.

This is not "using n8n." This is fighting n8n to do something it was never designed for. You'd spend more time on the workaround than the 265 lines of `setup.js`.

### Reference Profile Calibration

Users paste job listings they love or hate. Claude extracts signals. Those signals load as context in every subsequent scan. The setup has dedicated steps where Claude acts as a career coach — "what specifically grabbed you about this one?"

n8n could store reference files and include them in prompts. But the interactive coaching dialogue — where Claude asks follow-up questions and extracts structured JSON from free-form conversation — requires a chat UI. n8n's form node is a static form, not a conversation.

**n8n can store the data. It cannot create the experience that generates the data.**

### The Dashboard

Split-view with job list on the left, detail on the right. Filter buttons, tag pills, risk badges, evaluation rendering, pipeline tracker (saved → applied → interview → offered → rejected), decision logging with notes.

n8n is not a UI framework. It has no frontend. You could pair n8n with Retool or Appsmith, but then you're maintaining two platforms instead of one codebase. The complexity increases, not decreases.

### Fetch Limit with Personality

The 3/day limit isn't just a counter. It has philosophical nudges:

- Fetch 1: "Fresh batch in. Now pick the 2-3 worth your time..."
- Fetch 2: "Second scan today. Remember: the best opportunities reward depth..."
- Fetch 3: "Last scan for today..."
- Exceeded: Random selection from messages like "LinkedIn isn't a slot machine."

n8n could count to 3. It cannot be opinionated about your life choices.

### User's Chrome Profile

The browser module uses `puppeteer-core` with the user's actual Chrome installation — their logged-in cookies for LinkedIn and Indeed. No credentials in the codebase. The `setupLogin()` function opens a visible browser window for the user to log in.

n8n's Puppeteer community node runs in n8n's server context. Cloud-hosted: impossible. Self-hosted: the node abstraction doesn't expose `userDataDir`. You'd need a custom node. And n8n has no mechanism for "open a GUI browser window and wait for the user to close it."

**Fundamentally incompatible with n8n's execution model.**

### Agent Boundaries and Hooks (Planned v2)

The planned architecture in `AGENTS.md` describes PreToolUse/PostToolUse hooks: the Scanner cannot write evaluations, the Profile Agent cannot modify the profile without approval, the Evaluator cannot browse the web. Fine-grained, per-tool, per-agent permissions.

n8n has no concept of agent tool boundaries. A workflow either has permission or it doesn't. No hook system intercepts a node's execution before it runs. No conditional blocking based on calling context.

**Architecturally impossible in n8n. This is the Agent SDK's core value proposition.**

### Feedback Loops (Planned v2)

Three feedback loops: Scan Calibration, Evaluator Calibration, Query Refinement. Pattern detection across historical decisions, comparison of scanner predictions vs. user behavior, proactive suggestion generation.

This is not "trigger → process → output." This is continuous learning with conditional triggers. The feedback where analysis feeds back into the scanner's next run, where the Profile Agent proposes changes requiring user approval — that bidirectional flow with human-in-the-loop is not n8n's model.

## Alternatives Considered

| Tool | Verdict |
|------|---------|
| **Make.com / Zapier** | Strictly worse than n8n. Cloud-only (no local Chrome), lower execution time limits (30-40 min), charge per operation. Everything wrong with n8n applies double. |
| **Windmill** | Interesting. Runs real TypeScript/Python as steps, not visual nodes. But if every step is custom code anyway, Windmill buys you scheduling + retries + execution history. Useful, not transformative. |
| **Temporal** | Architecturally correct. Durable execution, activity retries, human-in-the-loop via signals. The feedback loops and multi-agent orchestration map well. But deploying a Temporal server for a personal job search tool is like running Kubernetes for a blog. |

## The Verdict

**Pursuit is not a workflow. It's an application.**

The value is in the seams, not the steps. If Pursuit were "call API, save result," n8n would be fine. But the value is in:

- How the setup conversation flows across steps while accumulating context
- How reference examples calibrate scanning through coaching dialogue
- How the dashboard renders scanner output as interactive tag pills with pipeline tracking
- How the 3/day limit has personality
- How the planned agent hooks enforce tool boundaries per agent

These *are* the product. The HTTP calls to Claude are commodity plumbing.

n8n optimizes for connecting services. Pursuit makes one API call (Anthropic) and reads/writes files. The challenge is the UX layer, the conversational flows, the data model, and the agentic architecture. n8n doesn't help with any of these.

## The Only Extractable Piece

The scheduled daily fetch could be a cron job: "every morning at 8am, POST to `/api/fetch-and-scan`." That's a one-node n8n workflow. But `node-cron` or a systemd timer does the same thing with zero additional infrastructure.

## Status

**Decided.** Custom code is the right architecture.

Related: [GitHub Issue #21](https://github.com/prPMDev/pursuit/issues/21)
