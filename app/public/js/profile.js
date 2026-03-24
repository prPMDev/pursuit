// Pursuit Dashboard — Profile editor
import { api, updateProfileStrip } from './app.js';
import { showModal, hideModal } from './modal.js';
import { html } from './util.js';
import { icon } from './icons.js';

export function renderProfileModal() {
  const container = document.getElementById('modal-container');
  const el = document.createElement('div');
  el.className = 'modal hidden';
  el.id = 'modal-profile';
  el.innerHTML = html`
    <div class="modal-content modal-wide">
      <div class="modal-header">
        <h3>Professional Profile</h3>
        <button class="btn btn-icon-only modal-close" data-modal="modal-profile">${icon('x', 16)}</button>
      </div>
      <p class="modal-hint">Your professional identity. Be specific, be honest. The Scanner works better when you are.</p>
      <textarea id="input-profile" rows="20" placeholder="Loading profile..."></textarea>
      <div class="modal-actions">
        <button class="btn" data-modal="modal-profile">Cancel</button>
        <button class="btn btn-primary" id="btn-save-profile">Save Profile</button>
      </div>
    </div>
  `;
  container.appendChild(el);

  // Close handlers
  el.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => hideModal('modal-profile'));
  });
  el.addEventListener('click', (e) => {
    if (e.target === el) hideModal('modal-profile');
  });
}

export function initProfile() {
  // Open profile modal
  document.getElementById('btn-profile').addEventListener('click', async () => {
    showModal('modal-profile');
    const textarea = document.getElementById('input-profile');
    textarea.value = 'Loading...';

    try {
      const { content } = await api('/profile');
      textarea.value = content || '';
    } catch (err) {
      textarea.value = `Error loading profile: ${err.message}`;
    }
  });

  // Save profile
  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const content = document.getElementById('input-profile').value;

    try {
      await api('/profile', {
        method: 'PUT',
        body: { content },
      });
      hideModal('modal-profile');
      updateProfileStrip();
    } catch (err) {
      alert(`Failed to save profile: ${err.message}`);
    }
  });
}
