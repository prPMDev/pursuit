// Pursuit Dashboard — Job List (Tabulator) with inline actions
import { api, health } from './app.js';
import { showJobDetail } from './job-detail.js';
import { icon } from './icons.js';

let table = null;
let allJobs = [];
let currentFilter = 'all';

// Backward compat: map old scanner terms to new
const ACTION_MAP = { 'EVALUATE': 'CONSIDER', 'SKIP': 'PASS', 'UNSCANNED': 'NEW', 'Unscanned': 'NEW' };

function normalizeAction(raw) {
  if (!raw) return 'NEW';
  return ACTION_MAP[raw] || raw;
}

function badgeFormatter(cell) {
  const val = normalizeAction(cell.getValue());
  const cls = val.toLowerCase();
  return `<span class="status-badge ${cls}">${val}</span>`;
}

function riskFormatter(cell) {
  const val = cell.getValue();
  if (!val || val === '—') return '';
  return `<span class="risk-badge ${val.toLowerCase()}">${val}</span>`;
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
  const isPassed = data.decision === 'PASS' || data.action === 'PASS';
  const isSaved = data.decision === 'SAVED' || data.decision === 'saved';
  const isEvaluating = data._evaluating;
  const hasApi = health.apiKeyConfigured;

  // Don't show actions for already-decided jobs (pursuing/applied)
  if (data.decision === 'pursue' || data.pipelineStatus === 'pursuing' ||
      data.pipelineStatus === 'applied' || data.pipelineStatus === 'interview') {
    return '';
  }

  const evalBtn = isEvaluating
    ? `<button class="btn-inline btn-inline-eval btn-inline-loading" disabled aria-label="Evaluating...">${icon('loader', 14)}</button>`
    : `<button class="btn-inline btn-inline-eval" ${!hasApi ? 'disabled title="Add API key in Settings"' : 'title="AI Evaluate"'} aria-label="Evaluate">${icon('search', 14)}</button>`;

  const passBtn = isPassed
    ? `<button class="btn-inline btn-inline-pass" disabled style="opacity:0.3" aria-label="Already passed">${icon('x', 14)}</button>`
    : `<button class="btn-inline btn-inline-pass" title="Pass" aria-label="Pass">${icon('x', 14)}</button>`;

  const saveBtn = isSaved
    ? `<button class="btn-inline btn-inline-save btn-inline-saved" title="Saved" aria-label="Saved">${icon('bookmark', 14)}</button>`
    : `<button class="btn-inline btn-inline-save" title="Save for later" aria-label="Save">${icon('bookmark', 14)}</button>`;

  return `<div class="inline-actions">${evalBtn}${passBtn}${saveBtn}</div>`;
}

// --- Inline action handlers ---

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
    // Re-apply filter in case this row should disappear
    applyFilter();
  } catch (err) {
    console.error('Failed to pass:', err);
  }
}

async function inlineSave(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;

  try {
    await api('/decisions', {
      method: 'POST',
      body: { company: job.company, role: job.role, scannerAction: job.action, decision: 'SAVED' },
    });
    job.decision = 'SAVED';
    const row = table.getRows().find(r => r.getData().id === jobId);
    if (row) row.reformat();
  } catch (err) {
    console.error('Failed to save:', err);
  }
}

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

    // Brief success flash
    const row2 = table.getRows().find(r => r.getData().id === jobId);
    if (row2) row2.reformat();
  } catch (err) {
    job._evaluating = false;
    const row2 = table.getRows().find(r => r.getData().id === jobId);
    if (row2) row2.reformat();
    console.error('Evaluation failed:', err);
  }
}

// --- Bulk actions ---

let bulkBarEl = null;

function initBulkActions() {
  bulkBarEl = document.createElement('div');
  bulkBarEl.className = 'bulk-bar hidden';
  bulkBarEl.innerHTML = `
    <span class="bulk-bar-count"></span>
    <button class="btn" id="bulk-pass">Pass All</button>
    <button class="btn" id="bulk-save">Save All</button>
    <span class="bulk-bar-spacer"></span>
    <button class="btn" id="bulk-clear">Clear Selection</button>
  `;
  document.body.appendChild(bulkBarEl);

  bulkBarEl.querySelector('#bulk-pass').addEventListener('click', bulkPass);
  bulkBarEl.querySelector('#bulk-save').addEventListener('click', bulkSave);
  bulkBarEl.querySelector('#bulk-clear').addEventListener('click', () => {
    table.deselectRow();
  });

  table.on('rowSelectionChanged', (data) => {
    if (data.length > 1) {
      showBulkBar(data.length);
    } else {
      hideBulkBar();
    }
  });
}

function showBulkBar(count) {
  if (!bulkBarEl) return;
  bulkBarEl.querySelector('.bulk-bar-count').textContent = `${count} jobs selected`;
  bulkBarEl.classList.remove('hidden');
}

function hideBulkBar() {
  if (!bulkBarEl) return;
  bulkBarEl.classList.add('hidden');
}

async function bulkPass() {
  const rows = table.getSelectedRows();
  for (const row of rows) {
    await inlinePass(row.getData().id);
  }
  table.deselectRow();
  hideBulkBar();
}

async function bulkSave() {
  const rows = table.getSelectedRows();
  for (const row of rows) {
    await inlineSave(row.getData().id);
  }
  table.deselectRow();
  hideBulkBar();
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

  // Initialize Tabulator
  table = new Tabulator('#job-list-table', {
    data: [],
    layout: 'fitColumns',
    height: '100%',
    placeholder: '<div class="empty-state"><p class="empty-title">No jobs yet</p><p class="empty-body">Click <strong>Find Jobs</strong> or <strong>Add Jobs</strong> to get started.</p></div>',
    selectableRows: true,
    columns: [
      {
        formatter: 'rowSelection',
        titleFormatter: 'rowSelection',
        width: 36,
        hozAlign: 'center',
        headerSort: false,
        cssClass: 'cell-checkbox',
      },
      {
        title: 'Company',
        field: 'company',
        minWidth: 100,
        widthGrow: 1,
        cssClass: 'cell-company',
      },
      {
        title: 'Role',
        field: 'role',
        minWidth: 160,
        widthGrow: 2,
        cssClass: 'cell-role',
      },
      {
        title: 'Status',
        field: 'action',
        width: 95,
        formatter: badgeFormatter,
        hozAlign: 'center',
      },
      {
        title: '',
        field: 'actions',
        width: 80,
        headerSort: false,
        formatter: actionsFormatter,
        cssClass: 'cell-actions',
      },
      {
        title: 'Flags',
        field: 'risk',
        width: 75,
        formatter: riskFormatter,
        hozAlign: 'center',
        visible: false,
      },
      {
        title: 'Source',
        field: 'source',
        width: 80,
        cssClass: 'cell-muted',
        visible: false,
      },
      {
        title: 'Found',
        field: 'date',
        width: 85,
        formatter: dateFormatter,
        sorter: 'date',
        hozAlign: 'right',
        cssClass: 'cell-muted',
        visible: false,
      },
    ],
    initialSort: [{ column: 'date', dir: 'desc' }],
    rowHeight: 42,
    rowFormatter: (row) => {
      const data = row.getData();
      const el = row.getElement();

      // Clear previous states
      el.classList.remove('row-passed', 'row-saved');
      el.style.opacity = '';
      el.style.textDecoration = '';

      if (data.availability?.status === 'dead') {
        el.style.opacity = '0.4';
        el.style.textDecoration = 'line-through';
      } else if (data.availability?.stale) {
        el.style.opacity = '0.7';
      }

      // Inline action visual states
      if (data.decision === 'PASS' || data.action === 'PASS') {
        el.classList.add('row-passed');
      }
      if (data.decision === 'SAVED' || data.decision === 'saved') {
        el.classList.add('row-saved');
      }
    },
  });

  // Row click — but NOT on inline actions or checkboxes
  table.on('rowClick', (e, row) => {
    if (e.target.closest('.inline-actions') || e.target.closest('.cell-checkbox') || e.target.tagName === 'INPUT') return;
    const job = row.getData();
    if (job) showJobDetail(job);
  });

  // Delegated handler for inline action buttons
  document.getElementById('job-list-table').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-inline');
    if (!btn) return;
    e.stopPropagation();

    const row = btn.closest('.tabulator-row');
    if (!row) return;

    // Get job ID from Tabulator row data
    const tabulatorRow = table.getRows().find(r => r.getElement() === row);
    if (!tabulatorRow) return;
    const jobId = tabulatorRow.getData().id;

    if (btn.classList.contains('btn-inline-eval')) {
      inlineEvaluate(jobId);
    } else if (btn.classList.contains('btn-inline-pass')) {
      inlinePass(jobId);
    } else if (btn.classList.contains('btn-inline-save')) {
      inlineSave(jobId);
    }
  });

  // Init bulk actions
  initBulkActions();
}

function applyFilter() {
  if (!table) return;

  if (currentFilter === 'all') {
    table.clearFilter();
  } else if (currentFilter === 'pursuing') {
    table.setFilter((data) => data.decision === 'pursue' || data.pipelineStatus === 'pursuing');
  } else if (currentFilter === 'applied') {
    table.setFilter((data) => data.pipelineStatus === 'applied' || data.pipelineStatus === 'interview' || data.pipelineStatus === 'offered');
  } else {
    // Backward compat: match old terms too (EVALUATE→CONSIDER, SKIP→PASS)
    const COMPAT = { 'CONSIDER': ['CONSIDER', 'EVALUATE'], 'PASS': ['PASS', 'SKIP'], 'NEW': ['NEW', 'UNSCANNED', 'Unscanned', ''] };
    const matches = COMPAT[currentFilter] || [currentFilter];
    table.setFilter((data) => {
      const action = normalizeAction(data.action);
      return matches.includes(action) || matches.includes(data.action);
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
