// Pursuit Dashboard — Settings panel
import { api, showModal, showLoading, hideLoading } from './app.js';
import { refreshJobList } from './job-list.js';

export function initSettings() {
  // Open settings modal
  document.getElementById('btn-settings').addEventListener('click', async () => {
    showModal('modal-settings');
    await loadSettingsUI();
  });

  // Save search queries
  document.getElementById('btn-save-queries')?.addEventListener('click', async () => {
    const textarea = document.getElementById('input-search-queries');
    const lines = textarea.value.split('\n').filter(l => l.trim());
    const queries = lines.map(line => {
      // Format: "query | location | sources" or just "query"
      const parts = line.split('|').map(p => p.trim());
      return {
        query: parts[0] || '',
        location: parts[1] || '',
        sources: parts[2] ? parts[2].split(',').map(s => s.trim().toLowerCase()) : ['linkedin', 'indeed'],
      };
    }).filter(q => q.query);

    try {
      await api('/settings', {
        method: 'PUT',
        body: { searchQueries: queries },
      });
      await loadSettingsUI();
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  });

  // Fetch Now button (in top bar)
  document.getElementById('btn-fetch-now')?.addEventListener('click', async () => {
    showLoading('Browsing job boards...');
    try {
      const result = await api('/fetch-and-scan', { method: 'POST' });
      hideLoading();

      if (result.totalFetched === 0) {
        updateFetchStatus('No new jobs found');
      } else {
        updateFetchStatus(`Found ${result.totalFetched} new jobs`);
        await refreshJobList();
      }
    } catch (err) {
      hideLoading();
      if (err.message.includes('No search queries')) {
        alert('No search queries configured. Open Settings to add them.');
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

  // Load fetch status on init
  loadFetchStatus();
}

async function loadSettingsUI() {
  try {
    const settings = await api('/settings');

    // API key status
    const keyStatus = document.getElementById('api-key-status');
    keyStatus.innerHTML = settings.apiKeyConfigured
      ? '<p style="color: var(--green);">&#x2713; API key configured (in .env file)</p>'
      : '<p style="color: var(--red);">&#x2717; No API key. Add ANTHROPIC_API_KEY to app/.env</p>';

    // Search queries
    const queriesArea = document.getElementById('input-search-queries');
    if (queriesArea && settings.searchQueries) {
      queriesArea.value = settings.searchQueries.map(q => {
        const parts = [q.query];
        if (q.location) parts.push(q.location);
        if (q.sources?.length) parts.push(q.sources.join(', '));
        return parts.join(' | ');
      }).join('\n');
    }

    // Prompts info
    const promptsInfo = document.getElementById('prompts-info');
    promptsInfo.innerHTML = `
      <p><strong>Scanner:</strong> ${settings.prompts?.scanner ? 'Loaded' : 'Not found'}</p>
      <p><strong>Evaluator:</strong> ${settings.prompts?.evaluator ? 'Loaded' : 'Not found'}</p>
      <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
        Prompts are read from scanner/scanner-prompt.md and evaluator/HLL-job-eval-prompt.md
      </p>
    `;

    // Last fetch time
    if (settings.lastFetchTime) {
      updateFetchStatus(`Last fetched: ${timeAgo(settings.lastFetchTime)}`);
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function loadFetchStatus() {
  try {
    const settings = await api('/settings');
    if (settings.lastFetchTime) {
      updateFetchStatus(`Last fetched: ${timeAgo(settings.lastFetchTime)}`);
    }
  } catch { /* ignore */ }
}

function updateFetchStatus(text) {
  const el = document.getElementById('fetch-status');
  if (el) el.textContent = text;
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
