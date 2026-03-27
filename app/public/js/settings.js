// Pursuit Dashboard — Settings panel (structured search config)
import { api, showLoading, hideLoading, health } from './app.js';
import { showModal, hideModal } from './modal.js';
import { refreshJobList } from './job-list.js';
import { html } from './util.js';
import { icon } from './icons.js';
import { TagInput } from './tag-input.js';

let taxonomies = { titles: [], industries: [], domains: [] };
let tagInputs = {};

const FLEX_LABELS = ['Exact', 'Tight', 'Medium', 'Loose', 'Wide Open'];

export function renderSettingsModal() {
  const container = document.getElementById('modal-container');
  const el = document.createElement('div');
  el.className = 'modal hidden';
  el.id = 'modal-settings';
  el.innerHTML = html`
    <div class="modal-content modal-wide">
      <div class="modal-header">
        <h3>Settings</h3>
        <button class="btn btn-icon-only modal-close" data-modal="modal-settings">${icon('x', 16)}</button>
      </div>

      <div class="settings-section">
        <h4>AI Configuration</h4>
        <div id="api-key-status"></div>
        <div class="settings-field" style="margin-top:8px">
          <label for="settings-ai-provider">Provider</label>
          <select id="settings-ai-provider" style="max-width:240px">
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="gemini">Google (Gemini)</option>
          </select>
        </div>
        <div class="settings-field" style="margin-top:8px">
          <label for="settings-ai-key">API Key</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="password" id="settings-ai-key" placeholder="Paste your API key" style="max-width:360px">
            <button class="btn btn-ghost btn-sm" id="settings-ai-toggle" type="button">Show</button>
            <button class="btn btn-secondary btn-sm" id="settings-ai-test" type="button">Test & Save</button>
          </div>
          <small class="setup-hint" id="settings-ai-hint">Get a key at <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a></small>
          <span class="setup-ai-status" id="settings-ai-status" style="display:block;margin-top:4px"></span>
        </div>
      </div>

      <div class="settings-section">
        <h4>Search Configuration</h4>
        <p class="modal-hint">Tags tell the fetcher what to search for. Flexibility sliders tell the scanner how strictly to match.</p>

        <div class="settings-field">
          <label>Job Titles</label>
          <div id="settings-titles-input"></div>
          <div class="setup-slider-row">
            <span class="setup-slider-label">Flexibility</span>
            <sl-range id="settings-titles-flex" min="0" max="4" value="2" step="1" tooltip="none"></sl-range>
            <span class="setup-slider-value" id="settings-titles-flex-label">Medium</span>
          </div>
        </div>

        <div class="settings-field">
          <label>Industries</label>
          <div id="settings-industries-input"></div>
          <div class="setup-slider-row">
            <span class="setup-slider-label">Flexibility</span>
            <sl-range id="settings-industries-flex" min="0" max="4" value="2" step="1" tooltip="none"></sl-range>
            <span class="setup-slider-value" id="settings-industries-flex-label">Medium</span>
          </div>
        </div>

        <div class="settings-field">
          <label>Domains / Focus Areas</label>
          <div id="settings-domains-input"></div>
          <div class="setup-slider-row">
            <span class="setup-slider-label">Flexibility</span>
            <sl-range id="settings-domains-flex" min="0" max="4" value="2" step="1" tooltip="none"></sl-range>
            <span class="setup-slider-value" id="settings-domains-flex-label">Medium</span>
          </div>
        </div>

        <div class="settings-field">
          <label>Locations</label>
          <div id="settings-locations-input"></div>
        </div>

        <div class="settings-field">
          <label>Levels</label>
          <div class="setup-checkbox-group">
            <label class="setup-checkbox"><input type="checkbox" name="settings-levels" value="mid"> Mid</label>
            <label class="setup-checkbox"><input type="checkbox" name="settings-levels" value="senior"> Senior</label>
            <label class="setup-checkbox"><input type="checkbox" name="settings-levels" value="lead"> Lead</label>
            <label class="setup-checkbox"><input type="checkbox" name="settings-levels" value="director"> Director</label>
          </div>
        </div>

        <div class="settings-field">
          <label>Company Size</label>
          <div class="setup-checkbox-group">
            <label class="setup-checkbox"><input type="checkbox" name="settings-company-size" value="startup"> Startup</label>
            <label class="setup-checkbox"><input type="checkbox" name="settings-company-size" value="growth"> Growth</label>
            <label class="setup-checkbox"><input type="checkbox" name="settings-company-size" value="enterprise"> Enterprise</label>
          </div>
        </div>

        <div style="margin-top: 12px;">
          <button class="btn btn-sm btn-primary" id="btn-save-search-config">Save Search Config</button>
          <span class="settings-save-status" id="search-config-status"></span>
        </div>
      </div>

      <div class="settings-section">
        <h4>Generated Search Queries</h4>
        <p class="modal-hint">Auto-generated from your tags + locations. These are what the fetcher sends to LinkedIn/Indeed.</p>
        <div id="generated-queries" class="settings-queries-list"></div>
      </div>

      <div class="settings-section">
        <h4>Prompts in Use</h4>
        <div id="prompts-info"></div>
      </div>

      <div class="settings-section">
        <h4>Fetch Limits</h4>
        <p>3 fetches per day. Jobs are posted when they're posted — your energy is better spent pursuing than pulling.</p>
      </div>

      <div class="settings-section">
        <h4>Data</h4>
        <p><a href="#" id="btn-view-decisions">View Decision Log</a></p>
      </div>

      <div class="settings-section" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
        <h4>Reset</h4>
        <p class="modal-hint">Clear your profile and start fresh. This resets onboarding.</p>
        <button class="btn btn-sm" id="btn-reset-profile" style="color: var(--red); border-color: var(--red-border);">Reset Profile</button>
      </div>
    </div>
  `;
  container.appendChild(el);

  // Close handlers
  el.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => hideModal('modal-settings'));
  });
  el.addEventListener('click', (e) => {
    if (e.target === el) hideModal('modal-settings');
  });
}

async function initTagInputsForSettings() {
  try {
    const resp = await fetch('/data/taxonomies.json');
    taxonomies = await resp.json();
  } catch { /* use empty defaults */ }

  // Only init once
  if (tagInputs.titles) return;

  tagInputs.titles = new TagInput(document.getElementById('settings-titles-input'), {
    suggestions: taxonomies.titles,
    placeholder: 'Type a job title...',
  });

  tagInputs.industries = new TagInput(document.getElementById('settings-industries-input'), {
    suggestions: taxonomies.industries,
    placeholder: 'Type an industry...',
  });

  tagInputs.domains = new TagInput(document.getElementById('settings-domains-input'), {
    suggestions: taxonomies.domains,
    placeholder: 'Type a domain...',
  });

  tagInputs.locations = new TagInput(document.getElementById('settings-locations-input'), {
    suggestions: ['Remote', 'San Francisco', 'New York', 'Los Angeles', 'Seattle', 'Austin', 'Chicago', 'Boston', 'Denver', 'London', 'Toronto'],
    placeholder: 'Type a location...',
  });

  // Bind flex label updates
  bindFlexLabel('settings-titles-flex', 'settings-titles-flex-label');
  bindFlexLabel('settings-industries-flex', 'settings-industries-flex-label');
  bindFlexLabel('settings-domains-flex', 'settings-domains-flex-label');
}

function bindFlexLabel(sliderId, labelId) {
  const slider = document.getElementById(sliderId);
  const label = document.getElementById(labelId);
  if (!slider || !label) return;
  const update = () => { label.textContent = FLEX_LABELS[slider.value] || 'Medium'; };
  slider.addEventListener('sl-input', update);
  update();
}

export function initSettings() {
  // Open settings modal
  document.getElementById('btn-settings').addEventListener('click', async () => {
    showModal('modal-settings');
    await initTagInputsForSettings();
    await loadSettingsUI();
  });

  // Settings AI provider hint
  const SETTINGS_HINTS = {
    anthropic: { url: 'https://console.anthropic.com/', label: 'console.anthropic.com', placeholder: 'sk-ant-...' },
    openai: { url: 'https://platform.openai.com/api-keys', label: 'platform.openai.com', placeholder: 'sk-proj-...' },
    gemini: { url: 'https://aistudio.google.com/apikey', label: 'aistudio.google.com', placeholder: 'AIza...' },
  };

  function updateSettingsProviderHint() {
    const provider = document.getElementById('settings-ai-provider')?.value || 'anthropic';
    const hint = SETTINGS_HINTS[provider];
    const el = document.getElementById('settings-ai-hint');
    const keyInput = document.getElementById('settings-ai-key');
    if (el && hint) el.innerHTML = `Get a key at <a href="${hint.url}" target="_blank">${hint.label}</a>`;
    if (keyInput && hint) keyInput.placeholder = hint.placeholder;
  }

  document.getElementById('settings-ai-provider')?.addEventListener('change', updateSettingsProviderHint);

  document.getElementById('settings-ai-toggle')?.addEventListener('click', () => {
    const input = document.getElementById('settings-ai-key');
    const btn = document.getElementById('settings-ai-toggle');
    if (input.type === 'password') { input.type = 'text'; btn.textContent = 'Hide'; }
    else { input.type = 'password'; btn.textContent = 'Show'; }
  });

  document.getElementById('settings-ai-test')?.addEventListener('click', async () => {
    const provider = document.getElementById('settings-ai-provider')?.value;
    const key = document.getElementById('settings-ai-key')?.value.trim();
    const statusEl = document.getElementById('settings-ai-status');
    const btn = document.getElementById('settings-ai-test');

    if (!key) { statusEl.textContent = '✗ Enter an API key first'; statusEl.className = 'setup-ai-status error'; return; }

    btn.disabled = true;
    statusEl.textContent = 'Testing...';
    statusEl.className = 'setup-ai-status';

    try {
      await api('/ai/test', { method: 'POST', body: { provider, key } });
      await api('/ai/configure', { method: 'POST', body: { provider, key } });
      statusEl.textContent = '✓ Connected & saved';
      statusEl.className = 'setup-ai-status success';
      await loadSettingsUI();
    } catch (err) {
      statusEl.textContent = `✗ ${err.message || 'Connection failed'}`;
      statusEl.className = 'setup-ai-status error';
    } finally {
      btn.disabled = false;
    }
  });

  // Save search config
  document.getElementById('btn-save-search-config')?.addEventListener('click', async () => {
    const searchConfig = {
      titles: { values: tagInputs.titles?.getValue() || [], flexibility: parseInt(document.getElementById('settings-titles-flex')?.value ?? 2) },
      industries: { values: tagInputs.industries?.getValue() || [], flexibility: parseInt(document.getElementById('settings-industries-flex')?.value ?? 2) },
      domains: { values: tagInputs.domains?.getValue() || [], flexibility: parseInt(document.getElementById('settings-domains-flex')?.value ?? 2) },
      locations: tagInputs.locations?.getValue() || [],
      levels: [...document.querySelectorAll('[name="settings-levels"]:checked')].map(el => el.value),
      companySize: [...document.querySelectorAll('[name="settings-company-size"]:checked')].map(el => el.value),
    };

    try {
      await api('/settings', {
        method: 'PUT',
        body: { searchConfig },
      });
      const statusEl = document.getElementById('search-config-status');
      statusEl.textContent = 'Saved';
      statusEl.style.color = 'var(--green)';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);

      // Reload to show generated queries
      await loadSettingsUI();
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  });

  // Fetch Now button (in top bar)
  document.getElementById('btn-fetch-now')?.addEventListener('click', async () => {
    try {
      const status = await api('/fetch/status');
      if (status.remaining <= 0) {
        // Don't even try — show the limit message from server
      }
      updateFetchCounter(status.remaining);
    } catch { /* proceed anyway */ }

    // With API key: fetch + scan. Without: fetch only (collect jobs for later).
    const endpoint = health.apiKeyConfigured ? '/fetch-and-scan' : '/fetch';
    showLoading(
      health.apiKeyConfigured ? 'Searching job boards and evaluating matches...' : 'Searching job boards for listings...',
      health.apiKeyConfigured ? 'This may take 1-2 minutes. Browsing boards, then running AI evaluation.' : 'This may take a minute. Add an API key in Settings to auto-evaluate results.'
    );
    try {
      const result = await api(endpoint, { method: 'POST' });
      hideLoading();

      if (result.totalFetched === 0) {
        updateFetchStatus('No new jobs found');
      } else {
        const suffix = health.apiKeyConfigured ? '' : ' (unscanned)';
        updateFetchStatus(`Found ${result.totalFetched} new jobs${suffix}`);
        await refreshJobList();
      }

      if (result.nudge) {
        showNudge(result.nudge, result.remaining);
      }

      updateFetchCounter(result.remaining);
    } catch (err) {
      hideLoading();
      if (err.message.includes('No search queries')) {
        alert('No search queries configured. Open Settings to add them.');
      } else if (err.message.includes('nudge') || err.message.includes('scanned 3') || err.message.includes('Three') || err.message.includes('Nope') || err.message.includes('slot machine') || err.message.includes('refresh')) {
        showNudge(err.message, 0);
        updateFetchCounter(0);
      } else {
        alert(`Fetch failed: ${err.message}`);
      }
    }
  });

  // View decisions
  document.getElementById('btn-view-decisions')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const { content } = await api('/decisions');
      alert(content || 'No decisions logged yet.');
    } catch (err) {
      alert(`Failed to load decisions: ${err.message}`);
    }
  });

  // Reset profile
  document.getElementById('btn-reset-profile')?.addEventListener('click', async () => {
    if (!confirm('This will clear your profile and restart onboarding. Are you sure?')) return;
    try {
      await api('/setup/reset', { method: 'POST' });
      hideModal('modal-settings');
      window.location.reload();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  });

  // Load fetch status on init
  loadFetchStatus();
}

async function loadSettingsUI() {
  try {
    const settings = await api('/settings');

    const keyStatus = document.getElementById('api-key-status');
    keyStatus.innerHTML = settings.apiKeyConfigured
      ? '<p style="color: var(--green);">&#x2713; API key configured</p>'
      : '<p style="color: var(--red);">&#x2717; No API key configured</p>';

    // Load structured search config
    const config = settings.searchConfig;
    if (config) {
      tagInputs.titles?.setValue(config.titles?.values || []);
      tagInputs.industries?.setValue(config.industries?.values || []);
      tagInputs.domains?.setValue(config.domains?.values || []);
      tagInputs.locations?.setValue(config.locations || []);

      const setSlider = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? 2;
      };
      setSlider('settings-titles-flex', config.titles?.flexibility);
      setSlider('settings-industries-flex', config.industries?.flexibility);
      setSlider('settings-domains-flex', config.domains?.flexibility);

      // Update flex labels
      ['settings-titles-flex-label', 'settings-industries-flex-label', 'settings-domains-flex-label'].forEach((labelId, i) => {
        const flexIds = ['settings-titles-flex', 'settings-industries-flex', 'settings-domains-flex'];
        const slider = document.getElementById(flexIds[i]);
        const label = document.getElementById(labelId);
        if (slider && label) label.textContent = FLEX_LABELS[slider.value] || 'Medium';
      });

      // Levels
      (config.levels || []).forEach(l => {
        const cb = document.querySelector(`[name="settings-levels"][value="${l}"]`);
        if (cb) cb.checked = true;
      });

      // Company size
      (config.companySize || []).forEach(s => {
        const cb = document.querySelector(`[name="settings-company-size"][value="${s}"]`);
        if (cb) cb.checked = true;
      });
    }

    // Show generated queries
    const queriesEl = document.getElementById('generated-queries');
    if (settings.searchQueries?.length) {
      queriesEl.innerHTML = settings.searchQueries.map(q =>
        `<div class="settings-query-item"><code>${escapeHtml(q.query)}</code> <span class="text-muted">${escapeHtml(q.location || '')} · ${(q.sources || []).join(', ')}</span></div>`
      ).join('');
    } else {
      queriesEl.innerHTML = '<p class="text-muted">No queries generated yet. Save your search config above.</p>';
    }

    const promptsInfo = document.getElementById('prompts-info');
    promptsInfo.innerHTML = `
      <p><strong>Scanner:</strong> ${settings.prompts?.scanner ? 'Loaded' : 'Not found'}</p>
      <p><strong>Evaluator:</strong> ${settings.prompts?.evaluator ? 'Loaded' : 'Not found'}</p>
      <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
        Prompts are read from scanner/scanner-prompt.md and evaluator/HLL-job-eval-prompt.md
      </p>
    `;

    if (settings.lastFetchTime) {
      updateFetchStatus(`Last fetched: ${timeAgo(settings.lastFetchTime)}`);
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str || '';
  return el.innerHTML;
}

async function loadFetchStatus() {
  try {
    const settings = await api('/settings');
    if (settings.lastFetchTime) {
      updateFetchStatus(`Last fetched: ${timeAgo(settings.lastFetchTime)}`);
    }
    const status = await api('/fetch/status');
    updateFetchCounter(status.remaining);
  } catch { /* ignore */ }
}

function updateFetchStatus(text) {
  const el = document.getElementById('fetch-status');
  if (el) el.textContent = text;
}

function showNudge(message, remaining) {
  document.getElementById('nudge-bar')?.remove();

  const bar = document.createElement('div');
  bar.id = 'nudge-bar';
  bar.className = 'nudge-bar';

  const remainingText = remaining !== undefined
    ? `<span class="nudge-remaining">${remaining} scan${remaining !== 1 ? 's' : ''} remaining today</span>`
    : '';

  bar.innerHTML = `${message}${remainingText}<button class="nudge-close" onclick="this.parentElement.remove()">&times;</button>`;

  document.body.appendChild(bar);
  setTimeout(() => bar.remove(), 8000);
}

function updateFetchCounter(remaining) {
  const btn = document.getElementById('btn-fetch-now');
  if (!btn) return;

  if (remaining <= 0) {
    btn.textContent = 'Done for today';
    btn.disabled = true;
    btn.style.opacity = '0.5';
  } else {
    btn.textContent = `Find Jobs (${remaining} left)`;
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
