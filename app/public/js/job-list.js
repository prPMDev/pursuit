// Pursuit Dashboard — Job List (left panel)
import { api, injectIcons } from './app.js';
import { icon } from './icons.js';
import { showJobDetail } from './job-detail.js';

let allJobs = [];
let currentFilter = 'all';
let selectedJobId = null;

export function initJobList() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderJobList();
    });
  });
}

export async function refreshJobList() {
  try {
    const { jobs } = await api('/jobs');
    allJobs = jobs || [];
    renderJobList();
  } catch (err) {
    console.error('Failed to load jobs:', err);
  }
}

function renderJobList() {
  const container = document.getElementById('job-list');
  const emptyState = document.getElementById('empty-state');

  const filtered = currentFilter === 'all'
    ? allJobs
    : currentFilter === 'pursuing'
    ? allJobs.filter(j => j.decision && ['PURSUING', 'SAVED'].includes(j.decision))
    : currentFilter === 'applied'
    ? allJobs.filter(j => j.decision && ['APPLIED', 'INTERVIEW', 'OFFERED'].includes(j.decision))
    : allJobs.filter(j => j.action === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = '';
    container.appendChild(emptyState);
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  container.innerHTML = filtered.map(job => {
    const action = (job.action || 'unscanned').toLowerCase();
    const isActive = job.id === selectedJobId;

    // Icon + color for action status
    const statusIcon = action === 'evaluate' ? icon('check-circle', 14, 'status-icon-green')
      : action === 'maybe' ? icon('help-circle', 14, 'status-icon-amber')
      : action === 'skip' ? icon('x-circle', 14, 'status-icon-gray')
      : icon('circle-dot', 14, 'status-icon-light');

    const riskBadge = job.risk && job.risk !== '—'
      ? `<span class="risk-badge ${job.risk.toLowerCase()}">${job.risk}</span>`
      : '';

    return `
      <div class="job-card ${isActive ? 'active' : ''}" data-job-id="${job.id}" data-action="${job.action || ''}">
        <div class="job-card-company">${escapeHtml(job.company)}</div>
        <div class="job-card-role">${escapeHtml(job.role)}</div>
        <div class="job-card-meta">
          ${statusIcon}
          <span>${job.action || 'Unscanned'}</span>
          ${riskBadge}
          <span class="job-card-source">${job.source || ''} · ${job.date || ''}</span>
        </div>
      </div>
    `;
  }).join('');

  // Click handlers
  container.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', () => {
      const jobId = card.dataset.jobId;
      selectedJobId = jobId;

      // Update active state
      container.querySelectorAll('.job-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      // Show detail
      const job = allJobs.find(j => j.id === jobId);
      if (job) showJobDetail(job);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
