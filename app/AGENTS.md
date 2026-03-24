# Pursuit — Agentic Architecture (Future)

This document describes the planned migration from raw API calls to a proper agentic system using the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview).

---

## Current Architecture (v1)

Express server makes direct `fetch()` calls to the Anthropic Messages API. Each endpoint (scan, evaluate) is a single prompt→response cycle. No agent loop, no tool boundaries, no feedback.

## Target Architecture (v2)

Three specialized agents with defined boundaries, orchestrated by a lead agent.

### Agent Definitions

#### Scanner Agent
**Purpose:** Find and filter job opportunities
**Tools (allowed):**
- `BrowseWeb` — navigate job boards via Puppeteer
- `ReadProfile` — read user's profile and references
- `ReadPreferences` — read search queries and settings
- `WriteScan` — write results to `data/scans/`

**Tools (denied):**
- `WriteProfile` — cannot modify the user's profile
- `SendEmail` — cannot send outreach or applications
- `WriteEvaluations` — that's the Evaluator's job

**Boundaries:**
- Max 3 fetches per day (enforced via hook)
- Max 5 pages per source per fetch
- 2-3 second delay between page loads (rate limit hook)
- Must include reference examples in every scan prompt

#### Evaluator Agent
**Purpose:** Deep analysis of individual job opportunities
**Tools (allowed):**
- `ReadProfile` — read user's profile
- `ReadScan` — read scanner output for context
- `WriteEvaluation` — write to `data/evaluations/`

**Tools (denied):**
- `BrowseWeb` — evaluator works with provided data only
- `WriteProfile` — cannot modify profile
- `WriteScan` — that's the Scanner's job

**Boundaries:**
- Can only evaluate jobs that have been scanned first
- Must reference the user's profile in every evaluation
- Output must follow the structured format (Match Type, Level Fit, Decision)

#### Profile Agent
**Purpose:** Manage and suggest profile updates based on decision patterns
**Tools (allowed):**
- `ReadAll` — can read profile, decisions, patterns, scans, evaluations
- `WritePatterns` — write to `data/patterns.md`
- `SuggestProfileEdit` — propose changes (not auto-apply)

**Tools (denied):**
- `WriteProfile` — can only SUGGEST, user must approve
- `BrowseWeb` — works with local data only
- `WriteScan` / `WriteEvaluation` — not its domain

**Boundaries:**
- Profile suggestions require user confirmation (PreToolUse hook)
- Pattern generation runs only when 3+ decisions exist
- Cannot auto-modify any user data

### Orchestrator

The lead agent coordinates daily flow:

```
1. Check: Has user fetched today? (Scanner Agent)
2. If new jobs: Run scan against profile + references
3. Present results to user
4. When user evaluates: Invoke Evaluator Agent
5. When user decides: Log to decisions.md
6. Weekly: Invoke Profile Agent for pattern analysis
```

### Hooks System

Using the Agent SDK's hooks for deterministic boundaries:

```python
# PreToolUse: Enforce fetch limit
@hook(event="PreToolUse", tool="BrowseWeb")
def enforce_fetch_limit(input):
    if get_today_fetch_count() >= 3:
        return block("Daily fetch limit reached. Go pursue something.")

# PostToolUse: Log all actions
@hook(event="PostToolUse")
def audit_log(input, output):
    log_action(input.tool, input.params, output.result)

# PreToolUse: Require user approval for profile changes
@hook(event="PreToolUse", tool="SuggestProfileEdit")
def require_approval(input):
    return prompt_user(f"Profile Agent wants to suggest: {input.params}")
```

### Feedback Loops

**Loop 1: Scan Calibration**
```
Scanner → User decides → Pattern Agent analyzes →
"You skip healthcare 80%" → Profile Agent suggests →
User approves → Scanner filters better
```

**Loop 2: Evaluator Calibration**
```
Evaluator says PURSUE → User applies → Got interview? →
Evaluator learns accuracy → Adjusts weighting
```

**Loop 3: Query Refinement**
```
Scanner finds 0 EVALUATEs for 3 days →
Profile Agent: "Queries may be too narrow" →
Suggests alternative terms → User approves
```

---

## Migration Path

### Phase 1 (Current): Raw API Calls
- Direct `fetch()` to Anthropic Messages API
- No agent loop, single prompt→response
- Manual boundary enforcement (fetch limit in Express middleware)

### Phase 2: Agent SDK with Custom Tools
- Replace Express API calls with Claude Agent SDK
- Define Scanner, Evaluator, Profile as MCP tools
- Add hooks for boundaries (fetch limits, profile protection)
- Keep the same Express frontend + data layer

### Phase 3: Multi-Agent Orchestration
- Orchestrator agent coordinates specialized sub-agents
- Agent Teams for parallel operations (scan multiple sources)
- Full feedback loops with pattern detection
- Scheduled agent runs (daily morning fetch)

### Phase 4: Learning & Adaptation
- Decision history feeds back into agent behavior
- Evaluator self-calibrates based on outcome tracking
- Scanner learns from reference examples over time
- Profile Agent suggests updates proactively

---

## Resources

- [Claude Agent SDK (Python)](https://github.com/anthropics/claude-agent-sdk-python)
- [Claude Agent SDK (TypeScript)](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)
- [Agent SDK Docs](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
