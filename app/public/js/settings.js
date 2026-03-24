// Pursuit Dashboard — Settings panel
import { api, showModal } from './app.js';

export function initSettings() {
  // Open settings modal
  document.getElementById('btn-settings').addEventListener('click', async () => {
    showModal('modal-settings');

    try {
      const settings = await api('/settings');

      // API key status
      const keyStatus = document.getElementById('api-key-status');
      keyStatus.innerHTML = settings.apiKeyConfigured
        ? '<p style="color: var(--green);">&#x2713; API key configured (in .env file)</p>'
        : '<p style="color: var(--red);">&#x2717; No API key. Add ANTHROPIC_API_KEY to app/.env</p>';

      // Prompts info
      const promptsInfo = document.getElementById('prompts-info');
      promptsInfo.innerHTML = `
        <p><strong>Scanner:</strong> ${settings.prompts?.scanner ? 'Loaded' : 'Not found'}</p>
        <p><strong>Evaluator:</strong> ${settings.prompts?.evaluator ? 'Loaded' : 'Not found'}</p>
        <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          Prompts are read from scanner/scanner-prompt.md and evaluator/HLL-job-eval-prompt.md
        </p>
      `;
    } catch (err) {
      console.error('Failed to load settings:', err);
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
}
