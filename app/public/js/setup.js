// Pursuit Dashboard — First-Time Setup Flow
import { api, showLoading, hideLoading, health } from './app.js';
import { escapeHtml, html } from './util.js';

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

export function renderSetupOverlay() {
  const container = document.getElementById('overlay-container');
  const el = document.createElement('div');
  el.className = 'setup-overlay hidden';
  el.id = 'setup-overlay';
  el.innerHTML = html`
    <div class="setup-container">
      <div class="setup-header">
        <h2>Pursuit Setup</h2>
        <span class="setup-progress" id="setup-progress">Step 1 of 9</span>
      </div>
      <div class="setup-chat" id="setup-chat"></div>
      <div class="setup-input-area">
        <textarea id="setup-input" rows="4" placeholder="Type your response..." class="hidden"></textarea>
        <div class="setup-actions">
          <button class="btn btn-primary hidden" id="setup-send">Send</button>
          <button class="btn btn-primary hidden" id="setup-next">Let's go</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(el);
}

export async function checkSetupNeeded() {
  try {
    const status = await api('/setup/status');
    return !status.setupComplete;
  } catch {
    return true;
  }
}

export function showSetup() {
  document.getElementById('setup-overlay').classList.remove('hidden');
  currentStepIndex = 0;

  if (!health.apiKeyConfigured) {
    // Show setup with API key warning — can still browse, configure, fetch
    addMessage('assistant', STEP_PROMPTS.welcome);
    addMessage('assistant',
      'Note: No API key found. The guided setup needs Claude to build your profile through conversation.\n\n' +
      'You can still:\n' +
      '- Edit your profile manually (click Profile in the top bar)\n' +
      '- Configure search queries (click Settings)\n' +
      '- Fetch and collect job listings\n' +
      '- Add jobs by pasting them\n\n' +
      'To unlock scanning, evaluation, and this guided setup, add your ANTHROPIC_API_KEY to app/.env and restart.'
    );
    const nextBtn = document.getElementById('setup-next');
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = 'Got it — I\'ll set up manually';

    // Override advanceStep to just close
    nextBtn.onclick = () => {
      hideSetup();
      nextBtn.onclick = null;
    };
    return;
  }

  renderStep();
}

export function hideSetup() {
  document.getElementById('setup-overlay').classList.add('hidden');
}

function renderStep() {
  const step = STEPS[currentStepIndex];
  const input = document.getElementById('setup-input');
  const sendBtn = document.getElementById('setup-send');
  const nextBtn = document.getElementById('setup-next');
  const progress = document.getElementById('setup-progress');

  progress.textContent = `Step ${currentStepIndex + 1} of ${STEPS.length}`;

  if (STEP_PROMPTS[step.id]) {
    addMessage('assistant', STEP_PROMPTS[step.id]);
  }

  if (step.action === 'next' || step.action === 'complete') {
    input.classList.add('hidden');
    sendBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = step.action === 'complete' ? 'Start Using Pursuit' : "Let's go";
  } else if (step.action === 'synthesize') {
    input.classList.add('hidden');
    sendBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
    runSynthesis();
  } else {
    input.classList.remove('hidden');
    input.placeholder = step.id === 'loved' || step.id === 'hated' || step.id === 'maybe'
      ? 'Paste a job listing here, then explain why...'
      : 'Type your response...';
    sendBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
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

  addMessage('user', message);
  input.value = '';

  if (!conversationHistory[step.id]) conversationHistory[step.id] = [];
  conversationHistory[step.id].push({ role: 'user', content: message });

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

    if (step.id === 'search' && result.extracted?.queries) {
      await api('/setup/save-queries', {
        method: 'POST',
        body: { queries: result.extracted.queries },
      });
    }

    const nextBtn = document.getElementById('setup-next');
    nextBtn.classList.remove('hidden');
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

    await api('/setup/save-profile', {
      method: 'POST',
      body: { profileText: result.response },
    });

    addMessage('assistant', result.response);
    addMessage('assistant', '\nProfile saved. Let me suggest some search queries for you.');

    currentStepIndex++;
    setTimeout(() => renderStep(), 1500);

  } catch (err) {
    hideLoading();
    addMessage('assistant', `Profile synthesis failed: ${err.message}. You can set up your profile manually later.`);
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
  document.getElementById('setup-send')?.addEventListener('click', sendMessage);

  document.getElementById('setup-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById('setup-next')?.addEventListener('click', advanceStep);
}
