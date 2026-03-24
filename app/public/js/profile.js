// Pursuit Dashboard — Profile editor
import { api, showModal, hideModal, updateProfileStrip } from './app.js';

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
