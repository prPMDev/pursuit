// Pursuit Dashboard — First-Time Setup Flow
import { api, showLoading, hideLoading } from './app.js';

const conversationHistory = {};
let currentStepIndex = 0;

const STEPS = [
  { id: 'welcome', action: 'next' },
  { id: 'identity', action: 'chat' },
  { id: 'logistics', action: 'chat' },
  { id: 'loved', action: 'chat' },
  { id: 'hated', action: 'chat' },
  { id: 'maybe', action: 'chat' },
  { id: 'synthesis', action: 'synthesize' },
  { id: 'search', action: 'chat' },
  { id: 'done', action: 'complete' },
];

const STEP_PROMPTS = {
  welcome: `Welcome to Pursuit.

I help you find the right 3-5 jobs worth your time — not 500 to spray at.

Let's get you set up. This takes about 5 minutes, and it makes everything that follows dramatically better.`,

  identity: `Tell me about yourself in a few sentences — what you do, what you're known for, what level you're at.

Don't overthink it — talk to me like you'd describe yourself to a friend at a dinner party.`,

  logistics: `Now the practical stuff.

Where are you located? Remote, hybrid, or onsite? What's your target comp range? And what are your absolute non-negotiables — the things where if the job violates them, it's an instant no?`,

  loved: `Now I want to calibrate.

Paste a job listing you'd DEFINITELY apply to — one that made you think "yes, this is me." It can be one you applied to before, or one you're looking at now.

After pasting, tell me what specifically grabbed you about it.`,

  hated: `Now paste one you'd DEFINITELY skip — a job that made you think "nope" or "this isn't me."

What turned you off?`,

  maybe: `Last one. Paste a "maybe" — the kind of listing you'd agonize over. Could go either way.

What's pulling you toward it, and what's holding you back?`,

  search: `Based on everything I've learned about you, what should your daily job search queries be?`,

  done: `You're all set.

Your profile is saved. Your reference examples are stored. Your search queries are configured.

Tomorrow morning (or right now), click **Fetch Jobs** and I'll find what's worth your time.

Remember: the goal isn't to find more jobs. It's to find the right ones.`,
};

export async function checkSetupNeeded() {
  try {
    const status = await api('/setup/status');
    return !status.setupComplete;
  } catch {
    return true;
  }
}

export function showSetup() {
  document.getElementById('setup-overlay').style.display = 'flex';
  currentStepIndex = 0;
  renderStep();
}

export function hideSetup() {
  document.getElementById('setup-overlay').style.display = 'none';
}

function renderStep() {
  const step = STEPS[currentStepIndex];
  const container = document.getElementById('setup-chat');
  const input = document.getElementById('setup-input');
  const sendBtn = document.getElementById('setup-send');
  const nextBtn = document.getElementById('setup-next');
  const progress = document.getElementById('setup-progress');

  // Progress
  progress.textContent = `Step ${currentStepIndex + 1} of ${STEPS.length}`;

  // Show the step prompt
  if (STEP_PROMPTS[step.id]) {
    addMessage('assistant', STEP_PROMPTS[step.id]);
  }

  // Configure input area
  if (step.action === 'next' || step.action === 'complete') {
    input.style.display = 'none';
    sendBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
    nextBtn.textContent = step.action === 'complete' ? 'Start Using Pursuit' : "Let's go";
  } else if (step.action === 'synthesize') {
    input.style.display = 'none';
    sendBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    // Auto-run synthesis
    runSynthesis();
  } else {
    input.style.display = 'block';
    input.placeholder = step.id === 'loved' || step.id === 'hated' || step.id === 'maybe'
      ? 'Paste a job listing here, then explain why...'
      : 'Type your response...';
    sendBtn.style.display = 'inline-block';
    nextBtn.style.display = 'none';
    input.focus();
  }
}

function addMessage(role, text) {
  const container = document.getElementById('setup-chat');
  const msg = document.createElement('div');
  msg.className = `setup-message setup-${role}`;
  msg.innerHTML = escapeHtml(text).replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const step = STEPS[currentStepIndex];
  const input = document.getElementById('setup-input');
  const message = input.value.trim();
  if (!message) return;

  // Show user message
  addMessage('user', message);
  input.value = '';

  // Track conversation
  if (!conversationHistory[step.id]) conversationHistory[step.id] = [];
  conversationHistory[step.id].push({ role: 'user', content: message });

  // Call Claude
  showLoading('Thinking...');
  try {
    const result = await api('/setup/chat', {
      method: 'POST',
      body: {
        stepId: step.id,
        userMessage: message,
        conversationHistory,
      },
    });

    hideLoading();
    addMessage('assistant', result.response);
    conversationHistory[step.id].push({ role: 'assistant', content: result.response });

    // Save reference examples
    if (['loved', 'hated', 'maybe'].includes(step.id) && result.extracted) {
      await api('/references', {
        method: 'POST',
        body: {
          type: step.id,
          listing: message,
          reasoning: result.response,
          extracted: result.extracted,
        },
      });
    }

    // Save search queries
    if (step.id === 'search' && result.extracted?.queries) {
      await api('/setup/save-queries', {
        method: 'POST',
        body: { queries: result.extracted.queries },
      });
    }

    // Show "Continue" button after Claude responds
    const nextBtn = document.getElementById('setup-next');
    nextBtn.style.display = 'inline-block';
    nextBtn.textContent = 'Continue';

  } catch (err) {
    hideLoading();
    addMessage('assistant', `Something went wrong: ${err.message}. Try again?`);
  }
}

async function runSynthesis() {
  addMessage('assistant', 'Let me put together your profile from everything we discussed...');
  showLoading('Synthesizing your profile...');

  try {
    const result = await api('/setup/chat', {
      method: 'POST',
      body: {
        stepId: 'synthesis',
        userMessage: '',
        conversationHistory,
      },
    });

    hideLoading();

    // Save the profile
    await api('/setup/save-profile', {
      method: 'POST',
      body: { profileText: result.response },
    });

    addMessage('assistant', result.response);
    addMessage('assistant', '\nProfile saved. Let me suggest some search queries for you.');

    // Auto-advance to search step
    currentStepIndex++;
    setTimeout(() => renderStep(), 1500);

  } catch (err) {
    hideLoading();
    addMessage('assistant', `Profile synthesis failed: ${err.message}. You can set up your profile manually later.`);
    // Skip to done
    currentStepIndex = STEPS.length - 1;
    renderStep();
  }
}

function advanceStep() {
  const step = STEPS[currentStepIndex];

  if (step.action === 'complete') {
    hideSetup();
    window.location.reload();
    return;
  }

  currentStepIndex++;
  if (currentStepIndex >= STEPS.length) {
    hideSetup();
    return;
  }

  renderStep();
}

export function initSetup() {
  // Send button
  document.getElementById('setup-send')?.addEventListener('click', sendMessage);

  // Enter key to send
  document.getElementById('setup-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Next/Continue button
  document.getElementById('setup-next')?.addEventListener('click', advanceStep);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
