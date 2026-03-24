// Pursuit Dashboard — First-Time Setup (Static Form)
import { api } from './app.js';
import { html } from './util.js';
import { TagInput } from './tag-input.js';

let taxonomies = { titles: [], industries: [], domains: [] };
let tagInputs = {};

export function renderSetupOverlay() {
  const container = document.getElementById('overlay-container');
  const el = document.createElement('div');
  el.className = 'setup-overlay hidden';
  el.id = 'setup-overlay';
  el.innerHTML = html`
    <div class="setup-container setup-form-container">
      <div class="setup-header">
        <h2>Welcome to Pursuit</h2>
        <p class="setup-subtitle">Let's set up your profile and search preferences. Takes about 2 minutes.</p>
      </div>

      <div class="setup-tabs">
        <button class="setup-tab active" data-tab="profile">Profile</button>
        <button class="setup-tab" data-tab="search">Search</button>
        <button class="setup-tab" data-tab="confirm">Confirm</button>
      </div>

      <!-- Tab 1: Profile -->
      <div class="setup-panel" id="setup-panel-profile">
        <div class="setup-form-group">
          <label for="setup-identity">Who are you in one sentence? <span class="required">*</span></label>
          <textarea id="setup-identity" rows="2" placeholder='e.g., "I build integrations and partner ecosystems at B2B SaaS companies as a product manager."'></textarea>
        </div>

        <div class="setup-form-row">
          <div class="setup-form-group">
            <label for="setup-level">Current level <span class="required">*</span></label>
            <input type="text" id="setup-level" placeholder="e.g., Senior PM, Staff Engineer">
          </div>
          <div class="setup-form-group">
            <label for="setup-target-level">Target level</label>
            <input type="text" id="setup-target-level" placeholder="e.g., Staff PM, Director">
          </div>
        </div>

        <div class="setup-form-group">
          <label for="setup-years">Years of experience</label>
          <input type="number" id="setup-years" placeholder="e.g., 8" min="0" max="50" style="max-width: 120px;">
        </div>

        <div class="setup-form-row">
          <div class="setup-form-group">
            <label for="setup-comp-min">Compensation range</label>
            <div class="setup-comp-range">
              <input type="text" id="setup-comp-min" placeholder="$150k">
              <span class="setup-comp-separator">to</span>
              <input type="text" id="setup-comp-max" placeholder="$220k">
            </div>
          </div>
        </div>

        <div class="setup-form-group">
          <label for="setup-location">Location <span class="required">*</span></label>
          <input type="text" id="setup-location" placeholder="e.g., San Francisco, NYC, Remote (US timezone)">
        </div>

        <div class="setup-form-group">
          <label>Work style</label>
          <div class="setup-checkbox-group">
            <label class="setup-checkbox"><input type="checkbox" id="setup-remote" value="remote"> Remote</label>
            <label class="setup-checkbox"><input type="checkbox" id="setup-hybrid" value="hybrid"> Hybrid</label>
            <label class="setup-checkbox"><input type="checkbox" id="setup-onsite" value="onsite"> Onsite</label>
          </div>
        </div>

        <div class="setup-form-group">
          <label for="setup-nonneg">Non-negotiables</label>
          <textarea id="setup-nonneg" rows="3" placeholder="Hard stops — instant skip if violated. One per line.&#10;e.g., Must be remote or NYC&#10;e.g., No defense/weapons companies&#10;e.g., Series A+ only"></textarea>
        </div>

        <div class="setup-nav">
          <span></span>
          <button class="btn btn-primary" id="setup-to-search">Next: Search Preferences</button>
        </div>
      </div>

      <!-- Tab 2: Search Preferences -->
      <div class="setup-panel hidden" id="setup-panel-search">
        <p class="setup-hint">Tell Pursuit what to look for. Tags help the scanner match jobs to you. Flexibility sliders control how strictly each dimension is filtered.</p>

        <div class="setup-form-group">
          <label>Job titles <span class="required">*</span></label>
          <div id="setup-titles-input"></div>
          <div class="setup-slider-row">
            <span class="setup-slider-label">Flexibility</span>
            <sl-range id="setup-titles-flex" min="0" max="4" value="2" step="1" tooltip="none"></sl-range>
            <span class="setup-slider-value" id="setup-titles-flex-label">Medium</span>
          </div>
        </div>

        <div class="setup-form-group">
          <label>Industries</label>
          <div id="setup-industries-input"></div>
          <div class="setup-slider-row">
            <span class="setup-slider-label">Flexibility</span>
            <sl-range id="setup-industries-flex" min="0" max="4" value="2" step="1" tooltip="none"></sl-range>
            <span class="setup-slider-value" id="setup-industries-flex-label">Medium</span>
          </div>
        </div>

        <div class="setup-form-group">
          <label>Domains / focus areas</label>
          <div id="setup-domains-input"></div>
          <div class="setup-slider-row">
            <span class="setup-slider-label">Flexibility</span>
            <sl-range id="setup-domains-flex" min="0" max="4" value="2" step="1" tooltip="none"></sl-range>
            <span class="setup-slider-value" id="setup-domains-flex-label">Medium</span>
          </div>
        </div>

        <div class="setup-form-group">
          <label>Level</label>
          <div class="setup-checkbox-group">
            <label class="setup-checkbox"><input type="checkbox" name="setup-levels" value="mid"> Mid</label>
            <label class="setup-checkbox"><input type="checkbox" name="setup-levels" value="senior"> Senior</label>
            <label class="setup-checkbox"><input type="checkbox" name="setup-levels" value="lead"> Lead</label>
            <label class="setup-checkbox"><input type="checkbox" name="setup-levels" value="director"> Director</label>
          </div>
        </div>

        <div class="setup-form-group">
          <label>Company size</label>
          <div class="setup-checkbox-group">
            <label class="setup-checkbox"><input type="checkbox" name="setup-company-size" value="startup"> Startup</label>
            <label class="setup-checkbox"><input type="checkbox" name="setup-company-size" value="growth"> Growth</label>
            <label class="setup-checkbox"><input type="checkbox" name="setup-company-size" value="enterprise"> Enterprise</label>
          </div>
        </div>

        <div class="setup-nav">
          <button class="btn btn-ghost" id="setup-back-profile">Back</button>
          <button class="btn btn-primary" id="setup-to-confirm">Next: Review</button>
        </div>
      </div>

      <!-- Tab 3: Confirm -->
      <div class="setup-panel hidden" id="setup-panel-confirm">
        <div class="setup-confirm-summary" id="setup-summary"></div>

        <div class="setup-validation-msg hidden" id="setup-validation">
          <sl-badge variant="warning">Missing required fields</sl-badge>
          <span id="setup-missing-fields"></span>
        </div>

        <div class="setup-nav">
          <button class="btn btn-ghost" id="setup-back-search">Back</button>
          <button class="btn btn-primary" id="setup-complete" disabled>Start Using Pursuit</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(el);
}

export async function checkSetupNeeded() {
  try {
    const status = await api('/setup/status');
    return !status.setupComplete;
  } catch {
    return true;
  }
}

export function showSetup() {
  document.getElementById('setup-overlay').classList.remove('hidden');
  document.querySelector('main').classList.add('hidden');
  initTagInputs();
}

export function hideSetup() {
  document.getElementById('setup-overlay').classList.add('hidden');
  document.querySelector('main').classList.remove('hidden');
}

const FLEX_LABELS = ['Exact', 'Tight', 'Medium', 'Loose', 'Wide Open'];

function updateFlexLabel(sliderId, labelId) {
  const slider = document.getElementById(sliderId);
  const label = document.getElementById(labelId);
  if (!slider || !label) return;
  const update = () => { label.textContent = FLEX_LABELS[slider.value] || 'Medium'; };
  slider.addEventListener('sl-input', update);
  update();
}

async function initTagInputs() {
  try {
    const resp = await fetch('/data/taxonomies.json');
    taxonomies = await resp.json();
  } catch { /* use empty defaults */ }

  tagInputs.titles = new TagInput(document.getElementById('setup-titles-input'), {
    suggestions: taxonomies.titles,
    placeholder: 'Type a job title...',
  });

  tagInputs.industries = new TagInput(document.getElementById('setup-industries-input'), {
    suggestions: taxonomies.industries,
    placeholder: 'Type an industry...',
  });

  tagInputs.domains = new TagInput(document.getElementById('setup-domains-input'), {
    suggestions: taxonomies.domains,
    placeholder: 'Type a domain...',
  });

  updateFlexLabel('setup-titles-flex', 'setup-titles-flex-label');
  updateFlexLabel('setup-industries-flex', 'setup-industries-flex-label');
  updateFlexLabel('setup-domains-flex', 'setup-domains-flex-label');
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.setup-tab[data-tab="${tabName}"]`)?.classList.add('active');

  // Update panels
  document.querySelectorAll('.setup-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`setup-panel-${tabName}`)?.classList.remove('hidden');

  // If confirm tab, build summary
  if (tabName === 'confirm') buildSummary();
}

function getFormData() {
  const identity = document.getElementById('setup-identity')?.value.trim() || '';
  const level = document.getElementById('setup-level')?.value.trim() || '';
  const targetLevel = document.getElementById('setup-target-level')?.value.trim() || '';
  const years = document.getElementById('setup-years')?.value || '';
  const compMin = document.getElementById('setup-comp-min')?.value.trim() || '';
  const compMax = document.getElementById('setup-comp-max')?.value.trim() || '';
  const location = document.getElementById('setup-location')?.value.trim() || '';
  const nonneg = document.getElementById('setup-nonneg')?.value.trim() || '';

  const workStyle = [];
  if (document.getElementById('setup-remote')?.checked) workStyle.push('remote');
  if (document.getElementById('setup-hybrid')?.checked) workStyle.push('hybrid');
  if (document.getElementById('setup-onsite')?.checked) workStyle.push('onsite');

  const levels = [...document.querySelectorAll('[name="setup-levels"]:checked')].map(el => el.value);
  const companySize = [...document.querySelectorAll('[name="setup-company-size"]:checked')].map(el => el.value);

  const titles = tagInputs.titles?.getValue() || [];
  const industries = tagInputs.industries?.getValue() || [];
  const domains = tagInputs.domains?.getValue() || [];

  const titlesFlex = parseInt(document.getElementById('setup-titles-flex')?.value ?? 2);
  const industriesFlex = parseInt(document.getElementById('setup-industries-flex')?.value ?? 2);
  const domainsFlex = parseInt(document.getElementById('setup-domains-flex')?.value ?? 2);

  return {
    identity, level, targetLevel, years, compMin, compMax, location, workStyle, nonneg,
    titles, industries, domains,
    titlesFlex, industriesFlex, domainsFlex,
    levels, companySize,
  };
}

function validate(data) {
  const missing = [];
  if (!data.identity) missing.push('Identity');
  if (!data.level) missing.push('Current level');
  if (data.titles.length === 0) missing.push('At least one job title');
  if (!data.location) missing.push('Location');
  return missing;
}

function buildSummary() {
  const data = getFormData();
  const missing = validate(data);
  const summaryEl = document.getElementById('setup-summary');
  const validationEl = document.getElementById('setup-validation');
  const completeBtn = document.getElementById('setup-complete');

  const esc = (s) => { const el = document.createElement('span'); el.textContent = s; return el.innerHTML; };

  let summaryHtml = '<h3>Your Setup</h3>';

  // Profile section
  summaryHtml += '<div class="setup-confirm-section"><h4>Profile</h4><dl>';
  if (data.identity) summaryHtml += `<dt>Identity</dt><dd>${esc(data.identity)}</dd>`;
  if (data.level) summaryHtml += `<dt>Level</dt><dd>${esc(data.level)}${data.targetLevel ? ' → ' + esc(data.targetLevel) : ''}</dd>`;
  if (data.years) summaryHtml += `<dt>Experience</dt><dd>${esc(data.years)} years</dd>`;
  if (data.compMin || data.compMax) summaryHtml += `<dt>Compensation</dt><dd>${esc(data.compMin)}${data.compMax ? ' – ' + esc(data.compMax) : ''}</dd>`;
  if (data.location) summaryHtml += `<dt>Location</dt><dd>${esc(data.location)}</dd>`;
  if (data.workStyle.length) summaryHtml += `<dt>Work style</dt><dd>${data.workStyle.join(', ')}</dd>`;
  if (data.nonneg) summaryHtml += `<dt>Non-negotiables</dt><dd>${esc(data.nonneg).replace(/\n/g, '<br>')}</dd>`;
  summaryHtml += '</dl></div>';

  // Search section
  summaryHtml += '<div class="setup-confirm-section"><h4>Search Preferences</h4><dl>';
  if (data.titles.length) summaryHtml += `<dt>Titles</dt><dd>${data.titles.map(t => `<sl-tag size="small">${esc(t)}</sl-tag>`).join(' ')} <em>(${FLEX_LABELS[data.titlesFlex]})</em></dd>`;
  if (data.industries.length) summaryHtml += `<dt>Industries</dt><dd>${data.industries.map(t => `<sl-tag size="small">${esc(t)}</sl-tag>`).join(' ')} <em>(${FLEX_LABELS[data.industriesFlex]})</em></dd>`;
  if (data.domains.length) summaryHtml += `<dt>Domains</dt><dd>${data.domains.map(t => `<sl-tag size="small">${esc(t)}</sl-tag>`).join(' ')} <em>(${FLEX_LABELS[data.domainsFlex]})</em></dd>`;
  if (data.levels.length) summaryHtml += `<dt>Levels</dt><dd>${data.levels.join(', ')}</dd>`;
  if (data.companySize.length) summaryHtml += `<dt>Company size</dt><dd>${data.companySize.join(', ')}</dd>`;
  summaryHtml += '</dl></div>';

  summaryEl.innerHTML = summaryHtml;

  if (missing.length > 0) {
    validationEl.classList.remove('hidden');
    document.getElementById('setup-missing-fields').textContent = missing.join(', ');
    completeBtn.disabled = true;
  } else {
    validationEl.classList.add('hidden');
    completeBtn.disabled = false;
  }
}

function buildProfileMarkdown(data) {
  const lines = [
    '# My Profile',
    '',
    '## Professional Identity',
    '',
    `**Who are you in one sentence?** ${data.identity}`,
    '',
    `**Your brand / what people know you for:** `,
    '',
    `**Years of experience:** ${data.years || ''}`,
    '',
    '---',
    '',
    '## Level & Leveling',
    '',
    `**Current level:** ${data.level}`,
    '',
    `**Target level:** ${data.targetLevel || ''}`,
    '',
    '---',
    '',
    '## Compensation',
    '',
    `**Target range:** ${data.compMin}${data.compMax ? ' – ' + data.compMax : ''}`,
    '',
    '---',
    '',
    '## Location & Work Style',
    '',
    `**Location:** ${data.location}`,
    '',
    `**Remote preference:** ${data.workStyle.join(', ') || 'Not specified'}`,
    '',
    '---',
    '',
    '## Non-Negotiables',
    '',
  ];
  if (data.nonneg) {
    data.nonneg.split('\n').filter(l => l.trim()).forEach(l => {
      lines.push(`- ${l.trim()}`);
    });
  } else {
    lines.push('- ');
  }
  lines.push('', '---', '');
  return lines.join('\n');
}

async function completeSetup() {
  const data = getFormData();
  const missing = validate(data);
  if (missing.length > 0) return;

  const btn = document.getElementById('setup-complete');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    // Save profile
    const profileMd = buildProfileMarkdown(data);
    await api('/profile', { method: 'PUT', body: { content: profileMd } });

    // Save search config
    const searchConfig = {
      titles: { values: data.titles, flexibility: data.titlesFlex },
      industries: { values: data.industries, flexibility: data.industriesFlex },
      domains: { values: data.domains, flexibility: data.domainsFlex },
      locations: data.location ? [data.location] : [],
      workStyle: data.workStyle,
      salaryFloor: null,
      levels: data.levels,
      companySize: data.companySize,
    };

    await api('/settings', { method: 'PUT', body: { searchConfig } });

    // Mark setup complete
    await api('/setup/mark-complete', { method: 'POST' });

    hideSetup();
    // Refresh the dashboard
    const { updateProfileStrip } = await import('./app.js');
    const { refreshJobList } = await import('./job-list.js');
    updateProfileStrip();
    refreshJobList();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Start Using Pursuit';
    alert(`Setup failed: ${err.message}`);
  }
}

export function initSetup() {
  // Tab navigation
  document.querySelectorAll('.setup-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Next/Back buttons
  document.getElementById('setup-to-search')?.addEventListener('click', () => switchTab('search'));
  document.getElementById('setup-to-confirm')?.addEventListener('click', () => switchTab('confirm'));
  document.getElementById('setup-back-profile')?.addEventListener('click', () => switchTab('profile'));
  document.getElementById('setup-back-search')?.addEventListener('click', () => switchTab('search'));

  // Complete
  document.getElementById('setup-complete')?.addEventListener('click', completeSetup);
}
