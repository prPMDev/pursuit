// Pursuit Dashboard — Job List (Tabulator)
import { api } from './app.js';
import { showJobDetail } from './job-detail.js';

let table = null;
let allJobs = [];
let currentFilter = 'all';

function badgeFormatter(cell) {
  const val = cell.getValue() || 'Unscanned';
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
  // Show compact date
  const d = new Date(val);
  if (isNaN(d)) return val;
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
    placeholder: '<div class="empty-state"><p class="empty-title">No jobs yet</p><p class="empty-body">Click <strong>Fetch Jobs</strong> or <strong>Add Jobs</strong> to get started.</p></div>',
    selectable: 1,
    columns: [
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
        title: 'Action',
        field: 'action',
        width: 95,
        formatter: badgeFormatter,
        hozAlign: 'center',
      },
      {
        title: 'Risk',
        field: 'risk',
        width: 75,
        formatter: riskFormatter,
        hozAlign: 'center',
      },
      {
        title: 'Source',
        field: 'source',
        width: 80,
        cssClass: 'cell-muted',
      },
      {
        title: 'Date',
        field: 'date',
        width: 85,
        formatter: dateFormatter,
        sorter: 'date',
        hozAlign: 'right',
        cssClass: 'cell-muted',
      },
    ],
    initialSort: [{ column: 'date', dir: 'desc' }],
    rowHeight: 42,
  });

  table.on('rowClick', (e, row) => {
    const job = row.getData();
    if (job) showJobDetail(job);
  });
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
    table.setFilter('action', '=', currentFilter);
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
