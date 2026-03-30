// Pursuit Dashboard — Add Jobs modal
import { api, showLoading, hideLoading, health } from './app.js';
import { showModal, hideModal } from './modal.js';
import { refreshJobList } from './job-list.js';
import { html, escapeHtml } from './util.js';
import { icon } from './icons.js';

export function renderAddJobsModal() {
  const container = document.getElementById('modal-container');
  const el = document.createElement('div');
  el.className = 'modal hidden';
  el.id = 'modal-add-jobs';
  el.innerHTML = html`
    <div class="modal-content">
      <div class="modal-header">
        <h3>Add Job Listings</h3>
        <button class="btn btn-icon-only modal-close" data-modal="modal-add-jobs">${icon('x', 16)}</button>
      </div>
      <p class="modal-hint">Paste job listings from LinkedIn, Indeed, or any source. One per block, separated by blank lines or ---.</p>
      <textarea id="input-listings" rows="12" placeholder="Senior PM at TechCorp, Remote&#10;Own integrations roadmap, 5+ years experience&#10;https://linkedin.com/jobs/view/123&#10;&#10;---&#10;&#10;Staff PM - Platform at HealthCo&#10;NYC Hybrid, Series B&#10;https://indeed.com/viewjob?id=456"></textarea>
      <div class="modal-actions">
        <button class="btn" data-modal="modal-add-jobs">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-listings">Add &amp; Evaluate</button>
      </div>
    </div>
  `;
  container.appendChild(el);

  // Close handlers
  el.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => hideModal('modal-add-jobs'));
  });
  el.addEventListener('click', (e) => {
    if (e.target === el) hideModal('modal-add-jobs');
  });
}

export function initAddJobs() {
  document.getElementById('btn-add-jobs').addEventListener('click', () => {
    showModal('modal-add-jobs');
    // Update button label based on API key status
    const submitBtn = document.getElementById('btn-submit-listings');
    submitBtn.textContent = health.apiKeyConfigured ? 'Add & Evaluate' : 'Save Jobs';
    document.getElementById('input-listings').focus();
  });


  document.getElementById('btn-submit-listings').addEventListener('click', async () => {
    const listings = document.getElementById('input-listings').value.trim();
    if (!listings) return;

    hideModal('modal-add-jobs');

    if (!health.apiKeyConfigured) {
      // No API key — save listings without scanning
      try {
        const result = await api('/jobs/manual', {
          method: 'POST',
          body: { listings },
        });
        document.getElementById('input-listings').value = '';
        await refreshJobList();
      } catch (err) {
        alert(`Save failed: ${err.message}`);
      }
      return;
    }

    showLoading('Evaluating jobs against your profile...', 'AI is reviewing each listing. Usually takes 30-60 seconds.');

    try {
      const result = await api('/scan', {
        method: 'POST',
        body: { listings },
      });

      document.getElementById('input-listings').value = '';
      await refreshJobList();
      hideLoading();

      if (result.stats) {
        const msg = `Scanned: ${result.stats.scanned} | Evaluate: ${result.stats.evaluate} | Maybe: ${result.stats.maybe} | Skipped: ${result.stats.skipped}`;
        console.log(msg);
      }
    } catch (err) {
      hideLoading();
      alert(`Scan failed: ${err.message}`);
    }
  });
}
