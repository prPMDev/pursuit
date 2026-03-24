// Pursuit Dashboard — Main controller
import { renderTopbar } from './topbar.js';
import { initJobList, refreshJobList } from './job-list.js';
import { initJobDetail } from './job-detail.js';
import { renderProfileModal, initProfile } from './profile.js';
import { renderSettingsModal, initSettings } from './settings.js';
import { renderSetupOverlay, checkSetupNeeded, showSetup, initSetup } from './setup.js';
import { renderAddJobsModal, initAddJobs } from './add-jobs.js';
import { icon } from './icons.js';
import { html } from './util.js';

// --- Icon Injection ---

export function injectIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.dataset.icon;
    const size = el.dataset.iconSize || (el.closest('.empty-icon') ? 32 : 16);
    el.innerHTML = icon(name, size);
  });
}

// --- API Helpers ---

export async function api(path, options = {}) {
  const resp = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `API error ${resp.status}`);
  return data;
}

export function showLoading(text = 'Working...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading').classList.remove('hidden');
}

export function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

// Legacy modal helpers (re-exported from modal.js for backwards compat)
export { showModal, hideModal } from './modal.js';

// --- Render Loading Overlay ---

function renderLoadingOverlay() {
  const container = document.getElementById('overlay-container');
  const el = document.createElement('div');
  el.className = 'loading-overlay hidden';
  el.id = 'loading';
  el.innerHTML = html`
    <div class="loading-content">
      <div class="spinner"></div>
      <p id="loading-text">Scanning...</p>
      <p class="loading-hint">Quality gate, not collector.</p>
    </div>
  `;
  container.appendChild(el);
}

// --- Profile Strip ---

export async function updateProfileStrip() {
  try {
    const { content } = await api('/profile');
    if (!content || content.includes('Customize This Section') || content.includes('<!-- Example:')) {
      document.getElementById('profile-strip-text').textContent =
        'No profile set — click Profile to get started';
      return;
    }

    const lines = content.split('\n');
    const parts = [];

    for (const line of lines) {
      if (line.match(/^\*\*Years of experience:\*\*/)) {
        const val = line.replace(/\*\*/g, '').replace('Years of experience:', '').trim();
        if (val) parts.push(val);
      }
      if (line.match(/^\*\*Current level:\*\*/)) {
        const val = line.replace(/\*\*/g, '').replace('Current level:', '').trim();
        if (val) parts.push(val);
      }
      if (line.match(/^\*\*Target range:\*\*/)) {
        const val = line.replace(/\*\*/g, '').replace('Target range:', '').trim();
        if (val) parts.push(val);
      }
      if (line.match(/^\*\*Location:\*\*/)) {
        const val = line.replace(/\*\*/g, '').replace('Location:', '').trim();
        if (val) parts.push(val);
      }
    }

    document.getElementById('profile-strip-text').textContent =
      parts.length > 0 ? parts.join(' · ') : 'Profile set — click Profile to edit';
  } catch {
    document.getElementById('profile-strip-text').textContent = 'Profile not loaded';
  }
}

// --- Init ---

async function init() {
  // Phase 1: Render all components into mount points
  renderTopbar();
  renderLoadingOverlay();
  renderSetupOverlay();
  renderAddJobsModal();
  renderProfileModal();
  renderSettingsModal();

  // Phase 2: Check health
  try {
    const health = await api('/health');
    if (!health.apiKeyConfigured) {
      document.getElementById('fetch-status').textContent = '\u26A0 No API key';
    }
  } catch (err) {
    console.error('Health check failed:', err);
  }

  // Phase 3: Init all modules (bind event listeners)
  initJobList();
  initJobDetail();
  initAddJobs();
  initProfile();
  initSettings();
  initSetup();
  injectIcons();

  // Phase 4: Check if first-time setup is needed
  const needsSetup = await checkSetupNeeded();
  if (needsSetup) {
    showSetup();
  } else {
    updateProfileStrip();
    refreshJobList();
  }
}

init();
