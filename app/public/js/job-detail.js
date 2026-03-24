// Pursuit Dashboard — Job Detail (right panel)
import { api, showLoading, hideLoading } from './app.js';
import { refreshJobList } from './job-list.js';

let currentJob = null;

export function initJobDetail() {
  // Evaluate button
  document.getElementById('btn-evaluate').addEventListener('click', async () => {
    if (!currentJob) return;

    showLoading('Running evaluator...');
    try {
      const result = await api(`/evaluate/${currentJob.id}`, {
        method: 'POST',
        body: { jobDescription: buildEvalDescription() },
      });

      currentJob.evaluation = result.result;
      currentJob.hasEvaluation = true;
      renderEvaluator();
      hideLoading();
    } catch (err) {
      hideLoading();
      alert(`Evaluation failed: ${err.message}`);
    }
  });

  // Decision buttons
  document.getElementById('btn-pursue').addEventListener('click', () => logDecision('PURSUING'));
  document.getElementById('btn-pass').addEventListener('click', () => logDecision('PASS'));
  document.getElementById('btn-save-later').addEventListener('click', () => logDecision('SAVED'));
}

export function showJobDetail(job) {
  currentJob = job;

  document.getElementById('detail-empty').style.display = 'none';
  document.getElementById('detail-content').style.display = 'block';

  // Header
  document.getElementById('detail-company').textContent = job.company || 'Unknown';
  document.getElementById('detail-role').textContent = job.role || 'Unknown Role';
  document.getElementById('detail-meta').textContent = [
    job.source,
    job.date ? `Posted: ${job.date}` : null,
  ].filter(Boolean).join(' · ');

  // Tags
  const tagsContainer = document.getElementById('detail-tags');
  tagsContainer.innerHTML = (job.tags || []).map(tag =>
    `<span class="tag ${tag.color}">${escapeHtml(tag.label)}</span>`
  ).join('');

  // Narrative
  const narrativeEl = document.getElementById('detail-narrative');
  narrativeEl.textContent = job.narrative || 'No narrative available.';
  narrativeEl.style.display = job.narrative ? 'block' : 'none';

  // Risk
  const riskSection = document.getElementById('detail-risk-section');
  const riskEl = document.getElementById('detail-risk');
  if (job.riskDetail) {
    riskEl.textContent = job.riskDetail;
    riskSection.style.display = 'block';
  } else if (job.risk && job.risk !== '—') {
    riskEl.textContent = job.risk;
    riskSection.style.display = 'block';
  } else {
    riskSection.style.display = 'none';
  }

  // Watch for
  const watchSection = document.getElementById('detail-watch-section');
  const watchEl = document.getElementById('detail-watch');
  if (job.watchFor) {
    watchEl.textContent = job.watchFor;
    watchSection.style.display = 'block';
  } else {
    watchSection.style.display = 'none';
  }

  // Key signal
  const signalSection = document.getElementById('detail-signal-section');
  const signalEl = document.getElementById('detail-signal');
  if (job.keySignal && job.keySignal !== '—') {
    signalEl.textContent = job.keySignal;
    signalSection.style.display = 'block';
  } else {
    signalSection.style.display = 'none';
  }

  // Evaluator
  renderEvaluator();
}

function renderEvaluator() {
  const container = document.getElementById('detail-evaluator');

  if (currentJob.hasEvaluation && currentJob.evaluation) {
    // Parse evaluation result
    const eval_ = currentJob.evaluation;
    const matchType = extractField(eval_, 'Match Type');
    const levelFit = extractField(eval_, 'Level Fit');
    const decision = extractField(eval_, 'Decision');
    const reasoning = extractField(eval_, 'Reasoning');

    container.innerHTML = `
      <div class="eval-result">
        <div class="tags" style="margin-bottom: 8px;">
          ${decision ? `<span class="tag ${decisionColor(decision)}">${escapeHtml(decision)}</span>` : ''}
          ${matchType ? `<span class="tag blue">${escapeHtml(matchType)}</span>` : ''}
          ${levelFit ? `<span class="tag gray">${escapeHtml(levelFit)}</span>` : ''}
        </div>
        ${reasoning ? `<p class="narrative">${escapeHtml(reasoning)}</p>` : ''}
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="btn btn-sm" id="btn-evaluate">Run Evaluator</button>
      <span style="font-size: 12px; color: var(--text-muted); margin-left: 8px;">On-demand deep analysis</span>
    `;
    // Re-bind click handler
    document.getElementById('btn-evaluate')?.addEventListener('click', async () => {
      if (!currentJob) return;
      showLoading('Running evaluator...');
      try {
        const result = await api(`/evaluate/${currentJob.id}`, {
          method: 'POST',
          body: { jobDescription: buildEvalDescription() },
        });
        currentJob.evaluation = result.result;
        currentJob.hasEvaluation = true;
        renderEvaluator();
        hideLoading();
      } catch (err) {
        hideLoading();
        alert(`Evaluation failed: ${err.message}`);
      }
    });
  }
}

function buildEvalDescription() {
  if (!currentJob) return '';
  return [
    `Company: ${currentJob.company}`,
    `Role: ${currentJob.role}`,
    currentJob.keySignal ? `Key details: ${currentJob.keySignal}` : '',
    currentJob.narrative ? `Scanner notes: ${currentJob.narrative}` : '',
  ].filter(Boolean).join('\n');
}

async function logDecision(decision) {
  if (!currentJob) return;

  try {
    await api('/decisions', {
      method: 'POST',
      body: {
        company: currentJob.company,
        role: currentJob.role,
        scannerAction: currentJob.action,
        decision,
      },
    });

    // Visual feedback
    const btn = decision === 'PURSUING' ? document.getElementById('btn-pursue')
      : decision === 'PASS' ? document.getElementById('btn-pass')
      : document.getElementById('btn-save-later');

    btn.textContent = '✓ Logged';
    setTimeout(() => {
      btn.textContent = decision === 'PURSUING' ? 'Pursue' : decision === 'PASS' ? 'Pass' : 'Save for Later';
    }, 1500);
  } catch (err) {
    alert(`Failed to log decision: ${err.message}`);
  }
}

function extractField(text, field) {
  const regex = new RegExp(`\\*\\*${field}[:\\s]*\\*\\*\\s*(.+?)(?:\\n|$)`, 'i');
  const match = text.match(regex);
  if (match) return match[1].trim();

  // Try without bold
  const regex2 = new RegExp(`${field}[:\\s]+(.+?)(?:\\n|$)`, 'i');
  const match2 = text.match(regex2);
  return match2 ? match2[1].trim() : null;
}

function decisionColor(decision) {
  const d = (decision || '').toUpperCase();
  if (d.includes('PURSUE')) return 'green';
  if (d.includes('MAYBE')) return 'amber';
  if (d.includes('PASS')) return 'red';
  return 'gray';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
