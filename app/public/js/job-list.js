// Pursuit Dashboard — Job List (Tabulator) — decision surface, not spreadsheet
import { api, health } from './app.js';
import { showJobDetail } from './job-detail.js';

let table = null;
let allJobs = [];
let currentFilter = 'all';

// Map scanner/legacy terms to 4-state model: NEW → EVALUATED → PURSUING → PASSED
// Scanner's CONSIDER/MAYBE are signal strength, not status — all map to NEW
const ACTION_MAP = {
  'CONSIDER': 'NEW', 'MAYBE': 'NEW', 'EVALUATE': 'NEW', 'SAVED': 'NEW',
  'SKIP': 'PASS', 'UNSCANNED': 'NEW', 'Unscanned': 'NEW',
};

function normalizeAction(raw) {
  if (!raw) return 'NEW';
  return ACTION_MAP[raw] || raw;
}

function badgeFormatter(cell) {
  const val = normalizeAction(cell.getValue());
  const cls = val.toLowerCase();
  return `<span class="status-badge ${cls}">${val}</span>`;
}

// signalFormatter removed — Fit, AI, and Rationale are now separate columns

function dateFormatter(cell) {
  const val = cell.getValue();
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return val;
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function actionsFormatter(cell) {
  const data = cell.getRow().getData();
  const action = normalizeAction(data.action);
  const isPassed = data.decision === 'PASS' || action === 'PASS';
  const isEvaluated = data.hasEvaluation || action === 'EVALUATED' || data.decision === 'EVALUATED';
  const isPursuing = data.decision === 'PURSUING' || action === 'PURSUING';
  const isEvaluating = data._evaluating;
  const hasApi = health.apiKeyConfigured;

  let primaryBtn;
  if (isPursuing) {
    primaryBtn = `<button class="btn-action btn-action-pursue btn-action-active" disabled>Pursuing</button>`;
  } else if (isEvaluating) {
    primaryBtn = `<button class="btn-action btn-action-eval btn-action-active" disabled>Evaluating\u2026</button>`;
  } else if (isEvaluated) {
    // After evaluation, user decides: Pursue or Pass
    primaryBtn = `<button class="btn-action btn-action-pursue">Pursue</button>`;
  } else if (!hasApi) {
    primaryBtn = `<button class="btn-action btn-action-eval" disabled title="Add API key in Settings">Evaluate</button>`;
  } else {
    primaryBtn = `<button class="btn-action btn-action-eval">Evaluate</button>`;
  }

  const passBtn = isPassed
    ? `<button class="btn-action btn-action-pass btn-action-active" disabled>Passed</button>`
    : `<button class="btn-action btn-action-pass">Pass</button>`;

  return `<div class="row-actions">${primaryBtn}${passBtn}</div>`;
}

// --- Action handlers ---

async function inlineEvaluate(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job || !health.apiKeyConfigured || job._evaluating) return;

  // Set loading state
  job._evaluating = true;
  const row = table.getRows().find(r => r.getData().id === jobId);
  if (row) row.reformat();

  try {
    const desc = [
      `Company: ${job.company}`,
      `Role: ${job.role}`,
      job.location ? `Location: ${job.location}` : '',
      job.source ? `Source: ${job.source}` : '',
      job.link ? `Link: ${job.link}` : '',
      job.summary ? `Summary:\n${job.summary}` : '',
      job.keySignal ? `Key signal: ${job.keySignal}` : '',
      job.narrative ? `Scanner notes: ${job.narrative}` : '',
    ].filter(Boolean).join('\n');

    const result = await api(`/evaluate/${jobId}`, {
      method: 'POST',
      body: { jobDescription: desc, dossierFile: job.dossierFile, jobLink: job.link },
    });

    // Persist EVALUATED decision so it survives page refresh
    await api('/decisions', {
      method: 'POST',
      body: { company: job.company, role: job.role, scannerAction: job.action, decision: 'EVALUATED' },
    });

    job._evaluating = false;
    job.hasEvaluation = true;
    job.evaluation = result.result;
    job.action = 'EVALUATED';
    job.decision = 'EVALUATED';

    // Extract revised fit score + recommendation + summary from evaluator response
    const fitMatch = result.result.match(/\*\*Fit:\s*(\d+)%/);
    if (fitMatch) job.fitScore = parseInt(fitMatch[1]);
    const decMatch = result.result.match(/\*\*Decision:\s*(PURSUE|MAYBE|PASS)/i);
    if (decMatch) job.evalDecision = decMatch[1].toUpperCase();
    const sumMatch = result.result.match(/\*\*Fit summary:\*\*\s*(.+?)(?:\n|$)/);
    if (sumMatch) job.evalSummary = sumMatch[1].trim().replace(/\s*—\s*/g, ': ');

    const row2 = table.getRows().find(r => r.getData().id === jobId);
    if (row2) row2.reformat();
  } catch (err) {
    job._evaluating = false;
    const row2 = table.getRows().find(r => r.getData().id === jobId);
    if (row2) row2.reformat();
    console.error('Evaluation failed:', err);
  }
}

async function inlinePursue(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;

  try {
    await api('/decisions', {
      method: 'POST',
      body: { company: job.company, role: job.role, scannerAction: job.action, decision: 'PURSUING' },
    });
    job.decision = 'PURSUING';
    job.action = 'PURSUING';
    const row = table.getRows().find(r => r.getData().id === jobId);
    if (row) row.reformat();
  } catch (err) {
    console.error('Failed to pursue:', err);
  }
}

async function inlinePass(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;

  try {
    await api('/decisions', {
      method: 'POST',
      body: { company: job.company, role: job.role, scannerAction: job.action, decision: 'PASS' },
    });
    job.decision = 'PASS';
    job.action = 'PASS';
    const row = table.getRows().find(r => r.getData().id === jobId);
    if (row) row.reformat();
    applyFilter();
  } catch (err) {
    console.error('Failed to pass:', err);
  }
}

// --- Init ---

export function initJobList() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilter();
    });
  });

  // Initialize Tabulator — no checkboxes, no mass actions
  table = new Tabulator('#job-list-table', {
    data: [],
    layout: 'fitColumns',
    height: '100%',
    placeholder: '<div class="empty-state"><p class="empty-title">No jobs yet</p><p class="empty-body">Click <strong>Find Jobs</strong> or <strong>Add Jobs</strong> to get started.</p></div>',
    columns: [
      {
        title: 'Company',
        field: 'company',
        minWidth: 120,
        widthGrow: 1,
        cssClass: 'cell-company',
      },
      {
        title: 'Role',
        field: 'role',
        minWidth: 180,
        widthGrow: 2,
        cssClass: 'cell-role',
      },
      {
        title: 'Fit',
        field: 'fitScore',
        width: 55,
        hozAlign: 'center',
        formatter: (cell) => {
          const score = cell.getValue();
          if (!score) return '<span class="cell-muted">—</span>';
          const cls = score >= 80 ? 'high' : score >= 65 ? 'mid' : 'low';
          return `<span class="fit-score fit-score-${cls}">${score}%</span>`;
        },
        sorter: 'number',
      },
      {
        title: 'AI',
        field: 'evalDecision',
        width: 65,
        hozAlign: 'center',
        formatter: (cell) => {
          const dec = cell.getValue();
          if (!dec) return '';
          return `<span class="eval-rec eval-rec-${dec.toLowerCase()}">${dec}</span>`;
        },
        headerSort: false,
      },
      {
        title: 'Rationale',
        field: 'keySignal',
        minWidth: 120,
        widthGrow: 1,
        formatter: (cell) => {
          const data = cell.getRow().getData();
          const text = data.evalSummary || data.keySignal || data.narrative || '';
          if (!text) return '<span class="cell-muted">—</span>';
          const truncated = text.length > 60 ? text.substring(0, 57) + '...' : text;
          return `<span class="cell-signal-text">${truncated}</span>`;
        },
        headerSort: false,
        cssClass: 'cell-signal',
      },
      {
        title: 'Status',
        field: 'action',
        width: 90,
        formatter: badgeFormatter,
        hozAlign: 'center',
      },
      {
        title: '',
        field: 'actions',
        width: 180,
        headerSort: false,
        formatter: actionsFormatter,
        cssClass: 'cell-actions',
      },
      {
        title: 'When',
        field: 'date',
        width: 70,
        formatter: dateFormatter,
        sorter: 'date',
        hozAlign: 'right',
        cssClass: 'cell-muted',
      },
    ],
    initialSort: [{ column: 'fitScore', dir: 'desc' }],
    rowHeight: 56,
    rowFormatter: (row) => {
      const data = row.getData();
      const el = row.getElement();
      const action = normalizeAction(data.action);

      el.classList.remove('row-passed', 'row-consider');

      if (data.availability?.status === 'dead') {
        el.style.opacity = '0.4';
        el.style.textDecoration = 'line-through';
      } else if (data.availability?.stale) {
        el.style.opacity = '0.7';
      }

      if (data.decision === 'PASS' || action === 'PASS') {
        el.classList.add('row-passed');
      }
      if (data.decision === 'EVALUATED' || action === 'EVALUATED' || data.hasEvaluation) {
        el.classList.add('row-evaluated');
      }
      if (data.decision === 'PURSUING' || action === 'PURSUING') {
        el.classList.add('row-pursuing');
      }
    },
  });

  // Row click — but NOT on action buttons
  table.on('rowClick', (e, row) => {
    if (e.target.closest('.row-actions') || e.target.closest('.btn-action')) return;
    const job = row.getData();
    if (job) showJobDetail(job);
  });

  // Delegated handler for action buttons
  document.getElementById('job-list-table').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-action');
    if (!btn) return;
    e.stopPropagation();

    const row = btn.closest('.tabulator-row');
    if (!row) return;

    const tabulatorRow = table.getRows().find(r => r.getElement() === row);
    if (!tabulatorRow) return;
    const jobId = tabulatorRow.getData().id;

    if (btn.classList.contains('btn-action-eval')) {
      inlineEvaluate(jobId);
    } else if (btn.classList.contains('btn-action-pursue')) {
      inlinePursue(jobId);
    } else if (btn.classList.contains('btn-action-pass')) {
      inlinePass(jobId);
    }
  });
}

function applyFilter() {
  if (!table) return;

  if (currentFilter === 'all') {
    // Inbox: show scanner-processed jobs that aren't passed (hide raw unscanned)
    table.setFilter((data) => {
      const action = normalizeAction(data.action);
      const hasScanner = data.fitScore || data.keySignal || data.narrative || data.matchType;
      const isProcessed = hasScanner || data.decision || data.hasEvaluation;
      return isProcessed && action !== 'PASS' && data.decision !== 'PASS';
    });
  } else if (currentFilter === 'NEW') {
    // New: scanner-processed but not yet evaluated by user
    table.setFilter((data) => {
      const action = normalizeAction(data.action);
      return action === 'NEW' && !data.hasEvaluation && data.decision !== 'PASS';
    });
  } else if (currentFilter === 'EVALUATED') {
    table.setFilter((data) => {
      const action = normalizeAction(data.action);
      const isEval = action === 'EVALUATED' || data.decision === 'EVALUATED' || data.hasEvaluation;
      return isEval && data.decision !== 'PURSUING' && data.decision !== 'PASS';
    });
  } else if (currentFilter === 'PURSUING') {
    table.setFilter((data) => data.decision === 'PURSUING' || data.action === 'PURSUING');
  } else if (currentFilter === 'passed') {
    table.setFilter((data) => {
      const action = normalizeAction(data.action);
      return action === 'PASS' || data.decision === 'PASS';
    });
  }
}

export async function refreshJobList() {
  try {
    const { jobs } = await api('/jobs');
    allJobs = jobs || [];

    // Derive EVALUATED status from server-side evaluation flag (fallback for old data)
    for (const job of allJobs) {
      if (job.hasEvaluation && !job.decision) {
        job.action = 'EVALUATED';
      }
    }

    if (table) {
      table.replaceData(allJobs);
      applyFilter();
    }

    // Show unprocessed jobs count below table
    updateUnprocessedBanner();
  } catch (err) {
    console.error('Failed to load jobs:', err);
  }
}

function updateUnprocessedBanner() {
  const unprocessed = allJobs.filter(j => {
    const action = normalizeAction(j.action);
    return action === 'NEW' && !j.decision && !j.hasEvaluation;
  });

  let banner = document.getElementById('unprocessed-banner');
  if (unprocessed.length === 0) {
    if (banner) banner.remove();
    return;
  }

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'unprocessed-banner';
    banner.className = 'unprocessed-banner';
    document.getElementById('job-list-table').after(banner);
  }

  banner.innerHTML = `<span>${unprocessed.length} additional jobs not yet scanned</span>`;
  // New tab count
  const newTab = document.querySelector('[data-filter="NEW"]');
  if (newTab) newTab.textContent = `New (${unprocessed.length})`;
}
