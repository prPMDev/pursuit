// Pursuit Dashboard — Main controller
import { initJobList, refreshJobList } from './job-list.js';
import { initJobDetail } from './job-detail.js';
import { initProfile } from './profile.js';
import { initSettings } from './settings.js';

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
  document.getElementById('loading').style.display = 'flex';
}

export function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

export function showModal(id) {
  document.getElementById(id).style.display = 'flex';
}

export function hideModal(id) {
  document.getElementById(id).style.display = 'none';
}

// --- Modal close handlers ---

document.querySelectorAll('.modal-close, [data-modal]').forEach(el => {
  el.addEventListener('click', (e) => {
    const modalId = el.dataset.modal;
    if (modalId) hideModal(modalId);
  });
});

// Close modal on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
});

// --- Add Jobs ---

document.getElementById('btn-add-jobs').addEventListener('click', () => {
  showModal('modal-add-jobs');
  document.getElementById('input-listings').focus();
});

document.getElementById('btn-submit-listings').addEventListener('click', async () => {
  const listings = document.getElementById('input-listings').value.trim();
  if (!listings) return;

  hideModal('modal-add-jobs');
  showLoading('Scanning listings against your profile...');

  try {
    const result = await api('/scan', {
      method: 'POST',
      body: { listings },
    });

    document.getElementById('input-listings').value = '';
    await refreshJobList();
    hideLoading();

    // Show stats
    if (result.stats) {
      const msg = `Scanned: ${result.stats.scanned} | Evaluate: ${result.stats.evaluate} | Maybe: ${result.stats.maybe} | Skipped: ${result.stats.skipped}`;
      console.log(msg);
    }
  } catch (err) {
    hideLoading();
    alert(`Scan failed: ${err.message}`);
  }
});

// Scan button (scans any unscanned jobs)
document.getElementById('btn-scan').addEventListener('click', () => {
  showModal('modal-add-jobs');
  document.getElementById('input-listings').focus();
});

// --- Profile Strip ---

export async function updateProfileStrip() {
  try {
    const { content } = await api('/profile');
    if (!content || content.includes('Customize This Section') || content.includes('<!-- Example:')) {
      document.getElementById('profile-strip-text').textContent =
        'No profile set — click Profile to get started';
      return;
    }

    // Extract key info from profile for the strip
    const lines = content.split('\n');
    const parts = [];

    // Look for key fields
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
  // Check health
  try {
    const health = await api('/health');
    if (!health.apiKeyConfigured) {
      document.getElementById('fetch-status').textContent = '⚠ No API key';
    }
  } catch (err) {
    console.error('Health check failed:', err);
  }

  initJobList();
  initJobDetail();
  initProfile();
  initSettings();
  updateProfileStrip();
  refreshJobList();
}

init();
