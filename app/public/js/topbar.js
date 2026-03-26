// Pursuit Dashboard — Top bar
import { html } from './util.js';
import { icon } from './icons.js';

export function renderTopbar() {
  const el = document.getElementById('topbar');
  el.className = 'topbar';
  el.innerHTML = html`
    <div class="topbar-left">
      <h1 class="logo">Pursuit</h1>
      <span class="tagline">Quality over volume</span>
    </div>
    <div class="topbar-actions">
      <span class="fetch-status" id="fetch-status"></span>
      <button class="btn btn-sm btn-ghost" id="btn-fetch-now" title="Find jobs from boards and evaluate them">
        ${icon('refresh-cw', 16, 'btn-icon-inline')} Find Jobs
      </button>
      <button class="btn btn-sm btn-ghost" id="btn-add-jobs" title="Paste job listings">
        ${icon('plus', 16, 'btn-icon-inline')} Add Jobs
      </button>
      <div class="topbar-divider"></div>
      <button class="btn btn-icon-only" id="btn-profile" title="Profile">${icon('user', 16)}</button>
      <button class="btn btn-icon-only" id="btn-settings" title="Settings">${icon('settings', 16)}</button>
    </div>
  `;
}
