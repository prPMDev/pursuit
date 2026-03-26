// Pursuit Dashboard — Job Detail (right panel)
import { api, showLoading, hideLoading, injectIcons, health } from './app.js';
import { icon, statusBadge } from './icons.js';
import { refreshJobList } from './job-list.js';
import { escapeHtml } from './util.js';

let currentJob = null;

export function initJobDetail() {
  // Close detail panel
  document.getElementById('btn-close-detail')?.addEventListener('click', () => {
    closeDetailPanel();
  });

  // Escape key closes detail panel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('detail-panel')?.classList.contains('hidden')) {
      closeDetailPanel();
    }
  });

  // Evaluate button
  document.getElementById('btn-evaluate').addEventListener('click', async () => {
    if (!currentJob) return;

    showLoading('Running evaluator...');
    try {
      const result = await api(`/evaluate/${currentJob.id}`, {
        method: 'POST',
        body: { jobDescription: buildEvalDescription(), dossierFile: currentJob.dossierFile },
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
  document.getElementById('btn-pursue').addEventListener('click', () => {
    logDecision('PURSUING');
    showPipeline('saved');
  });
  document.getElementById('btn-pass').addEventListener('click', () => {
    logDecision('PASS');
    showPipeline('passed');
  });
  document.getElementById('btn-save-later').addEventListener('click', () => {
    logDecision('SAVED');
    showPipeline('saved');
  });

  // Pipeline status buttons
  document.getElementById('btn-mark-applied')?.addEventListener('click', () => updatePipelineStatus('applied'));
  document.getElementById('btn-mark-interview')?.addEventListener('click', () => updatePipelineStatus('interview'));
  document.getElementById('btn-mark-offered')?.addEventListener('click', () => updatePipelineStatus('offered'));
  document.getElementById('btn-mark-rejected')?.addEventListener('click', () => updatePipelineStatus('rejected'));
}

function showPipeline(status) {
  document.getElementById('action-initial').classList.add('hidden');
  document.getElementById('action-pipeline').classList.remove('hidden');
  updatePipelineDisplay(status);
  injectIcons(document.getElementById('action-pipeline'));
}

function updatePipelineDisplay(status) {
  const container = document.getElementById('pipeline-status');
  container.innerHTML = statusBadge(status);
  if (currentJob) currentJob.pipelineStatus = status;
}

async function updatePipelineStatus(status) {
  if (!currentJob) return;
  updatePipelineDisplay(status);

  try {
    await api('/decisions', {
      method: 'POST',
      body: {
        company: currentJob.company,
        role: currentJob.role,
        scannerAction: currentJob.action,
        decision: status.toUpperCase(),
      },
    });
  } catch (err) {
    console.error('Failed to update status:', err);
  }
}

function openDetailPanel() {
  const panel = document.getElementById('detail-panel');
  const main = document.querySelector('.dashboard');
  panel.classList.remove('hidden');
  main.classList.add('detail-open');
}

function closeDetailPanel() {
  const panel = document.getElementById('detail-panel');
  const main = document.querySelector('.dashboard');
  panel.classList.add('hidden');
  main.classList.remove('detail-open');
  currentJob = null;
}

export function showJobDetail(job) {
  currentJob = job;

  openDetailPanel();
  document.getElementById('detail-content').classList.remove('hidden');

  // Reset decision/pipeline state
  document.getElementById('action-initial').classList.remove('hidden');
  document.getElementById('action-pipeline').classList.add('hidden');

  // Inject icons in action buttons
  injectIcons(document.getElementById('detail-actions-section'));

  // Availability banner
  const availEl = document.getElementById('detail-availability');
  if (job.availability?.status === 'dead') {
    availEl.className = 'availability-banner availability-dead';
    availEl.textContent = `This job appears to be no longer available${job.availability.reason ? ` (${job.availability.reason})` : ''}`;
    availEl.classList.remove('hidden');
  } else if (job.availability?.stale) {
    availEl.className = 'availability-banner availability-stale';
    availEl.textContent = 'This listing may be stale — posted 30+ days ago';
    availEl.classList.remove('hidden');
  } else {
    availEl.classList.add('hidden');
  }

  // Missing data indicator
  const missingEl = document.getElementById('detail-missing');
  if (job.missingFields?.length > 0) {
    missingEl.className = 'missing-indicator';
    missingEl.textContent = `Missing: ${job.missingFields.join(', ')}`;
    missingEl.classList.remove('hidden');
  } else {
    missingEl.classList.add('hidden');
  }

  // Header — show source + location + job type inline
  document.getElementById('detail-company').textContent = job.company || 'Unknown';
  document.getElementById('detail-role').textContent = job.role || 'Unknown Role';
  document.getElementById('detail-meta').textContent = [
    job.source,
    job.location,
    job.jobType,
  ].filter(Boolean).join(' · ');

  // Listing details grid
  const listingGrid = document.getElementById('detail-listing');
  const listingSection = document.getElementById('detail-listing-section');
  const listingFields = [
    job.salary ? ['Salary', job.salary] : null,
    job.posted ? ['Posted', job.posted] : null,
    job.experienceLevel ? ['Level', job.experienceLevel] : null,
    job.companySize ? ['Company size', job.companySize] : null,
    job.location ? ['Location', job.location] : null,
    job.jobType ? ['Type', job.jobType] : null,
  ].filter(Boolean);

  if (listingFields.length > 0) {
    listingGrid.innerHTML = listingFields.map(([label, value]) =>
      `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`
    ).join('');
    listingSection.classList.remove('hidden');
  } else {
    listingSection.classList.add('hidden');
  }

  // Original listing link
  const linkEl = document.getElementById('detail-link');
  if (job.link) {
    linkEl.href = job.link;
    linkEl.classList.remove('hidden');
  } else {
    linkEl.classList.add('hidden');
  }

  // Tags + Narrative — hide scanner section entirely for unscanned jobs
  const tagsContainer = document.getElementById('detail-tags');
  const narrativeEl = document.getElementById('detail-narrative');
  const scannerSection = tagsContainer.closest('.detail-section');
  const isUnscanned = !job.action || job.action === 'Unscanned' || job.action === 'UNSCANNED';

  if (isUnscanned) {
    // Collapse scanner rationale — just show a compact hint
    scannerSection.classList.remove('hidden');
    tagsContainer.innerHTML = '';
    narrativeEl.textContent = 'Not yet evaluated. Add an API key in Settings to enable AI evaluation.';
    narrativeEl.classList.remove('hidden');
    scannerSection.querySelector('h4').textContent = 'Status';
  } else {
    scannerSection.classList.remove('hidden');
    scannerSection.querySelector('h4').textContent = 'Scanner Rationale';
    tagsContainer.innerHTML = (job.tags || []).map(tag =>
      `<span class="tag ${tag.color}">${escapeHtml(tag.label)}</span>`
    ).join('');
    narrativeEl.textContent = job.narrative || '';
    narrativeEl.classList.toggle('hidden', !job.narrative);
  }

  // Risk
  const riskSection = document.getElementById('detail-risk-section');
  const riskEl = document.getElementById('detail-risk');
  if (job.riskDetail) {
    riskEl.textContent = job.riskDetail;
    riskSection.classList.remove('hidden');
  } else if (job.risk && job.risk !== '—') {
    riskEl.textContent = job.risk;
    riskSection.classList.remove('hidden');
  } else {
    riskSection.classList.add('hidden');
  }

  // Watch for
  const watchSection = document.getElementById('detail-watch-section');
  const watchEl = document.getElementById('detail-watch');
  if (job.watchFor) {
    watchEl.textContent = job.watchFor;
    watchSection.classList.remove('hidden');
  } else {
    watchSection.classList.add('hidden');
  }

  // Key signal
  const signalSection = document.getElementById('detail-signal-section');
  const signalEl = document.getElementById('detail-signal');
  if (job.keySignal && job.keySignal !== '—') {
    signalEl.textContent = job.keySignal;
    signalSection.classList.remove('hidden');
  } else {
    signalSection.classList.add('hidden');
  }

  // Evaluator
  renderEvaluator();
}

function renderEvaluator() {
  const container = document.getElementById('detail-evaluator');
  const evalSection = container.closest('.detail-section');
  if (evalSection) evalSection.classList.remove('hidden'); // reset visibility

  if (currentJob.hasEvaluation && currentJob.evaluation) {
    // Parse evaluation result — support both old and new field names
    const eval_ = currentJob.evaluation;
    const matchType = extractField(eval_, 'Match Type') || extractField(eval_, 'Match');
    const levelFit = extractField(eval_, 'Level Fit') || extractField(eval_, 'Level');
    const risk = extractField(eval_, 'Risk');
    const decision = extractField(eval_, 'Decision');
    const reasoning = extractField(eval_, 'Reasoning') || extractField(eval_, 'Why');
    const resumeAngle = extractField(eval_, 'Resume angle');
    const watchOuts = extractField(eval_, 'Watch-outs');

    container.innerHTML = `
      <div class="eval-result">
        <div class="tags" style="margin-bottom: 8px;">
          ${decision ? `<span class="tag ${decisionColor(decision)}">${escapeHtml(decision)}</span>` : ''}
          ${matchType ? `<span class="tag blue">${escapeHtml(matchType)}</span>` : ''}
          ${levelFit ? `<span class="tag gray">${escapeHtml(levelFit)}</span>` : ''}
          ${risk ? `<span class="tag ${risk.toLowerCase().includes('safe') ? 'green' : 'amber'}">${escapeHtml(risk)}</span>` : ''}
        </div>
        ${reasoning ? `<p class="narrative">${escapeHtml(reasoning)}</p>` : ''}
        ${watchOuts ? `<p style="font-size: 13px; color: var(--text-muted); margin-top: 8px;"><strong>Watch-outs:</strong> ${escapeHtml(watchOuts)}</p>` : ''}
        ${resumeAngle ? `<p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;"><strong>Resume angle:</strong> ${escapeHtml(resumeAngle)}</p>` : ''}
        <div class="eval-follow-up" style="margin-top: 12px;">
          <button class="btn btn-sm btn-ghost" id="btn-ask-more">Ask something specific</button>
          <div id="follow-up-input" class="hidden" style="margin-top: 8px;">
            <input type="text" id="follow-up-question" placeholder="e.g. Is this strategy or execution?" style="width: 100%; padding: 8px 10px; font-size: 13px; font-family: var(--font); border: 1px solid var(--border); border-radius: var(--radius);">
            <button class="btn btn-sm" id="btn-send-follow-up" style="margin-top: 6px;">Ask</button>
          </div>
          <div id="follow-up-response" class="hidden" style="margin-top: 8px;"></div>
        </div>
      </div>
    `;

    // Bind follow-up handlers
    document.getElementById('btn-ask-more')?.addEventListener('click', () => {
      document.getElementById('btn-ask-more').classList.add('hidden');
      document.getElementById('follow-up-input').classList.remove('hidden');
      document.getElementById('follow-up-question').focus();
    });

    document.getElementById('btn-send-follow-up')?.addEventListener('click', async () => {
      const question = document.getElementById('follow-up-question').value.trim();
      if (!question || !currentJob) return;
      document.getElementById('btn-send-follow-up').disabled = true;
      document.getElementById('btn-send-follow-up').textContent = 'Asking...';
      try {
        const result = await api(`/evaluate/${currentJob.id}/follow-up`, {
          method: 'POST',
          body: { question, previousEvaluation: currentJob.evaluation, dossierFile: currentJob.dossierFile },
        });
        document.getElementById('follow-up-input').classList.add('hidden');
        const responseEl = document.getElementById('follow-up-response');
        responseEl.classList.remove('hidden');
        responseEl.innerHTML = `<p class="narrative">${escapeHtml(result.result)}</p>`;
      } catch (err) {
        alert(`Follow-up failed: ${err.message}`);
        document.getElementById('btn-send-follow-up').disabled = false;
        document.getElementById('btn-send-follow-up').textContent = 'Ask';
      }
    });

    // Allow Enter key to submit
    document.getElementById('follow-up-question')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-send-follow-up')?.click();
    });
  } else if (!health.apiKeyConfigured) {
    // Hide evaluator section entirely when no API key — scanner hint already covers it
    const evalSection = container.closest('.detail-section');
    if (evalSection) evalSection.classList.add('hidden');
    return;
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
          body: { jobDescription: buildEvalDescription(), dossierFile: currentJob.dossierFile },
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
    currentJob.location ? `Location: ${currentJob.location}` : '',
    currentJob.source ? `Source: ${currentJob.source}` : '',
    currentJob.link ? `Link: ${currentJob.link}` : '',
    currentJob.summary ? `Summary:\n${currentJob.summary}` : '',
    currentJob.keySignal ? `Key signal: ${currentJob.keySignal}` : '',
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

