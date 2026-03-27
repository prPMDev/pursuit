// Pursuit Dashboard — Job List (Tabulator) — decision surface, not spreadsheet
import { api, health } from './app.js';
import { showJobDetail } from './job-detail.js';

let table = null;
let allJobs = [];
let currentFilter = 'all';

// Backward compat: map old scanner terms to current 4-state model
const ACTION_MAP = {
  'EVALUATE': 'CONSIDER', 'MAYBE': 'CONSIDER', 'SAVED': 'CONSIDER',
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

function signalFormatter(cell) {
  const data = cell.getRow().getData();
  const text = data.keySignal || data.narrative || '';
  if (!text) return '<span class="cell-muted">\u2014</span>';
  const truncated = text.length > 80 ? text.substring(0, 77) + '...' : text;
  return `<span class="cell-signal-text">${truncated}</span>`;
}

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
  const hasEval = data.hasEvaluation;
  const isEvaluating = data._evaluating;
  const hasApi = health.apiKeyConfigured;

  // Don't show triage actions for pipeline jobs
  if (data.decision === 'pursue' || data.pipelineStatus === 'pursuing' ||
      data.pipelineStatus === 'applied' || data.pipelineStatus === 'interview') {
    return '';
  }

  let evalBtn;
  if (isEvaluating) {
    evalBtn = `<button class="btn-action btn-action-eval btn-action-active" disabled>Evaluating\u2026</button>`;
  } else if (hasEval) {
    evalBtn = `<button class="btn-action btn-action-eval btn-action-active" disabled>Evaluated</button>`;
  } else if (!hasApi) {
    evalBtn = `<button class="btn-action btn-action-eval" disabled title="Add API key in Settings">Evaluate</button>`;
  } else {
    evalBtn = `<button class="btn-action btn-action-eval">Evaluate</button>`;
  }

  const passBtn = isPassed
    ? `<button class="btn-action btn-action-pass btn-action-active" disabled>Passed</button>`
    : `<button class="btn-action btn-action-pass">Pass</button>`;

  return `<div class="row-actions">${evalBtn}${passBtn}</div>`;
}

// --- Action handlers ---

async function inlineEvaluate(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job || !health.apiKeyConfigured) return;

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
      body: { jobDescription: desc, dossierFile: job.dossierFile },
    });

    job._evaluating = false;
    job.hasEvaluation = true;
    job.evaluation = result.result;
    job.action = 'CONSIDER';
    job.decision = 'CONSIDER';

    const row2 = table.getRows().find(r => r.getData().id === jobId);
    if (row2) row2.reformat();

    // Open detail panel to show evaluation result
    showJobDetail(job);
  } catch (err) {
    job._evaluating = false;
    const row2 = table.getRows().find(r => r.getData().id === jobId);
    if (row2) row2.reformat();
    console.error('Evaluation failed:', err);
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
        title: 'Signal',
        field: 'keySignal',
        minWidth: 140,
        widthGrow: 1,
        formatter: signalFormatter,
        headerSort: false,
        cssClass: 'cell-signal',
      },
      {
        title: 'When',
        field: 'date',
        width: 75,
        formatter: dateFormatter,
        sorter: 'date',
        hozAlign: 'right',
        cssClass: 'cell-muted',
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
        width: 150,
        headerSort: false,
        formatter: actionsFormatter,
        cssClass: 'cell-actions',
      },
    ],
    initialSort: [{ column: 'date', dir: 'desc' }],
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
      if (data.decision === 'CONSIDER' || data.decision === 'SAVED' || action === 'CONSIDER') {
        el.classList.add('row-consider');
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
    } else if (btn.classList.contains('btn-action-pass')) {
      inlinePass(jobId);
    }
  });
}

function applyFilter() {
  if (!table) return;

  if (currentFilter === 'all') {
    // Inbox: hide passed jobs by default
    table.setFilter((data) => {
      const action = normalizeAction(data.action);
      return action !== 'PASS' && data.decision !== 'PASS';
    });
  } else if (currentFilter === 'NEW') {
    table.setFilter((data) => normalizeAction(data.action) === 'NEW' && data.decision !== 'PASS');
  } else if (currentFilter === 'CONSIDER') {
    table.setFilter((data) => {
      const action = normalizeAction(data.action);
      return action === 'CONSIDER' || data.decision === 'CONSIDER' || data.decision === 'SAVED';
    });
  } else if (currentFilter === 'pipeline') {
    table.setFilter((data) => data.decision === 'pursue' || data.pipelineStatus === 'pursuing' ||
        data.pipelineStatus === 'applied' || data.pipelineStatus === 'interview' || data.pipelineStatus === 'offered');
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

    if (table) {
      table.replaceData(allJobs);
      applyFilter();
    }
  } catch (err) {
    console.error('Failed to load jobs:', err);
  }
}
