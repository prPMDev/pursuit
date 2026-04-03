// Pursuit Dashboard — First-Time Setup (Static Form)
import { api } from './app.js';
import { html } from './util.js';
import { TagInput } from './tag-input.js';

let taxonomies = { titles: [], industries: [], domains: [] };
let tagInputs = {};

const SAMPLE_PROFILES = [
  {
    label: 'Product Manager',
    profile: {
      identity: 'I build and scale B2B products by connecting customer needs to business outcomes.',
      role: 'Product Manager',
      level: 'Senior',
      targetLevel: 'Staff Product Manager',
      years: '8',
      yearsInRole: '5',
      prevRoles: 'Business Analyst, Management Consultant',
      compMin: '$180k',
      compMax: '$230k',
      compFlexible: true,
      location: 'San Francisco Bay Area',
      workStyle: ['remote', 'hybrid'],
      nonneg: 'Must support visa sponsorship\nNo defense/weapons companies\nSeries A+ only',
    },
    search: {
      titles: ['Product Manager', 'Senior Product Manager', 'Staff Product Manager', 'Group Product Manager'],
      industries: ['SaaS', 'Fintech', 'Enterprise Software'],
      domains: ['Platform', 'Integrations', 'Developer Tools', 'Payments'],
      levels: ['senior', 'lead'],
      companySize: ['growth', 'enterprise'],
    },
  },
  {
    label: 'Software Engineer',
    profile: {
      identity: 'I design and build distributed systems that handle millions of requests per day.',
      role: 'Software Engineer',
      level: 'Senior',
      targetLevel: 'Staff Engineer',
      years: '6',
      yearsInRole: '6',
      prevRoles: '',
      compMin: '$200k',
      compMax: '$280k',
      compFlexible: true,
      location: 'Seattle, WA',
      workStyle: ['remote'],
      nonneg: 'Must be fully remote\nNo on-call rotation > 1 week/month',
    },
    search: {
      titles: ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Backend Engineer'],
      industries: ['Cloud Infrastructure', 'SaaS', 'AI/ML'],
      domains: ['Distributed Systems', 'Backend', 'Platform Engineering', 'Data Infrastructure'],
      levels: ['senior', 'lead'],
      companySize: ['growth', 'enterprise'],
    },
  },
  {
    label: 'Data Scientist',
    profile: {
      identity: 'I turn messy data into actionable insights that drive product and business decisions.',
      role: 'Data Scientist',
      level: 'Senior',
      targetLevel: 'Lead',
      years: '7',
      yearsInRole: '4',
      prevRoles: 'Data Analyst, Statistician, Research Scientist',
      compMin: '$170k',
      compMax: '$240k',
      compFlexible: false,
      location: 'New York, NY',
      workStyle: ['hybrid', 'remote'],
      nonneg: 'Must have meaningful ML/AI work\nNo pure dashboarding roles',
    },
    search: {
      titles: ['Data Scientist', 'Senior Data Scientist', 'ML Engineer', 'Applied Scientist'],
      industries: ['Healthcare', 'Fintech', 'E-commerce', 'AI/ML'],
      domains: ['Machine Learning', 'NLP', 'Experimentation', 'Recommendation Systems'],
      levels: ['senior', 'lead'],
      companySize: ['startup', 'growth'],
    },
  },
  {
    label: 'UX Designer',
    profile: {
      identity: 'I craft intuitive enterprise experiences by bridging user research with systems thinking.',
      role: 'UX Designer',
      level: 'Lead',
      targetLevel: 'Director of Design',
      years: '10',
      yearsInRole: '7',
      prevRoles: 'Graphic Designer, UI Developer, Product Designer',
      compMin: '$160k',
      compMax: '$210k',
      compFlexible: true,
      location: 'Austin, TX',
      workStyle: ['hybrid', 'onsite'],
      nonneg: 'Must have a design team to lead\nNo agencies',
    },
    search: {
      titles: ['UX Designer', 'Senior UX Designer', 'Lead Designer', 'Head of Design'],
      industries: ['Enterprise Software', 'SaaS', 'Healthcare'],
      domains: ['Design Systems', 'UX Research', 'Interaction Design', 'Accessibility'],
      levels: ['lead', 'director'],
      companySize: ['growth', 'enterprise'],
    },
  },
];

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
        <div class="setup-samples">
          <span class="setup-samples-label">Quick start with a sample:</span>
          ${SAMPLE_PROFILES.map((p, i) => `<button class="btn btn-sample" data-sample="${i}">${p.label}</button>`).join('')}
        </div>
      </div>

      <div class="setup-tabs">
        <button class="setup-tab active" data-tab="profile">Profile</button>
        <button class="setup-tab" data-tab="search">Search</button>
        <button class="setup-tab" data-tab="ai">AI Setup</button>
        <button class="setup-tab" data-tab="confirm">Confirm</button>
      </div>

      <!-- Tab 1: Profile -->
      <div class="setup-panel" id="setup-panel-profile">
        <div class="setup-form-group">
          <label for="setup-identity">Who are you in one sentence? <span class="required">*</span></label>
          <textarea id="setup-identity" rows="1" placeholder='e.g., "I build integrations and partner ecosystems at B2B SaaS companies."'></textarea>
          <div class="setup-hint" id="identity-inspiration" style="font-style: italic; margin-top: 4px;"></div>
        </div>

        <div class="setup-form-group">
          <label for="setup-role">Role <span class="required">*</span></label>
          <input type="text" id="setup-role" placeholder="e.g., Product Manager, Software Engineer, Data Scientist">
        </div>

        <div class="setup-form-row">
          <div class="setup-form-group">
            <label for="setup-level">Current level <span class="required">*</span></label>
            <input type="text" id="setup-level" placeholder="e.g., Senior PM, Staff Engineer, Lead">
          </div>
          <div class="setup-form-group">
            <label for="setup-target-level">Target level</label>
            <input type="text" id="setup-target-level" placeholder="e.g., Staff, Director">
          </div>
        </div>

        <div class="setup-form-row">
          <div class="setup-form-group">
            <label for="setup-years">Total years of experience</label>
            <input type="number" id="setup-years" placeholder="e.g., 12" min="0" max="50" style="max-width: 120px;">
          </div>
          <div class="setup-form-group">
            <label for="setup-years-role">Years in target role</label>
            <input type="number" id="setup-years-role" placeholder="e.g., 6" min="0" max="50" style="max-width: 120px;">
          </div>
        </div>

        <div class="setup-form-group">
          <label for="setup-prev-roles">Previous / other roles</label>
          <input type="text" id="setup-prev-roles" placeholder="e.g., Business Analyst, Consultant, UX Researcher (comma-separated)">
          <small class="setup-hint">Helps capture transferable skills from your career history.</small>
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
          <div class="setup-form-group setup-comp-flex">
            <label>&nbsp;</label>
            <label class="setup-checkbox"><input type="checkbox" id="setup-comp-flexible" checked> Flexible <span class="tooltip-icon" title="Flexible means ±10% from your stated range" tabindex="0" role="img" aria-label="Flexible means ±10% from your stated range">?</span></label>
          </div>
        </div>

        <div class="setup-form-row">
          <div class="setup-form-group" style="flex:2">
            <label for="setup-location">Location <span class="required">*</span></label>
            <input type="text" id="setup-location" placeholder="e.g., San Francisco, NYC, Remote (US)">
          </div>
          <div class="setup-form-group" style="flex:1">
            <label>Work style</label>
            <div class="setup-checkbox-group">
              <label class="setup-checkbox"><input type="checkbox" id="setup-remote" value="remote"> Remote</label>
              <label class="setup-checkbox"><input type="checkbox" id="setup-hybrid" value="hybrid"> Hybrid</label>
              <label class="setup-checkbox"><input type="checkbox" id="setup-onsite" value="onsite"> Onsite</label>
            </div>
          </div>
        </div>

        <div class="setup-form-group">
          <label for="setup-nonneg">Non-negotiables</label>
          <textarea id="setup-nonneg" rows="2" placeholder="Hard stops — one per line. e.g., Must be remote or NYC&#10;e.g., No defense/weapons companies"></textarea>
        </div>

        <div class="setup-nav">
          <span></span>
          <button class="btn btn-primary" id="setup-to-search">Next: Search Preferences</button>
        </div>
      </div>

      <!-- Tab 2: Search Preferences -->
      <div class="setup-panel hidden" id="setup-panel-search">
        <p class="setup-hint">Tell Pursuit what to look for. Pick from common options or type your own.</p>

        <div class="setup-form-group">
          <label>Job titles <span class="required">*</span></label>
          <div id="setup-titles-input"></div>
          <div class="setup-suggestions" data-target="setup-titles-input">
            <button type="button" class="btn-suggestion" data-value="Product Manager">Product Manager</button>
            <button type="button" class="btn-suggestion" data-value="Senior Product Manager">Senior Product Manager</button>
            <button type="button" class="btn-suggestion" data-value="Staff Product Manager">Staff Product Manager</button>
            <button type="button" class="btn-suggestion" data-value="Principal Product Manager">Principal Product Manager</button>
            <button type="button" class="btn-suggestion" data-value="Group Product Manager">Group Product Manager</button>
            <button type="button" class="btn-suggestion" data-value="Director of Product">Director of Product</button>
            <button type="button" class="btn-suggestion" data-value="Technical Product Manager">Technical Product Manager</button>
            <button type="button" class="btn-suggestion" data-value="Product Lead">Product Lead</button>
          </div>
        </div>

        <div class="setup-form-group">
          <label>Industries</label>
          <div id="setup-industries-input"></div>
          <div class="setup-suggestions" data-target="setup-industries-input">
            <button type="button" class="btn-suggestion" data-value="SaaS">SaaS</button>
            <button type="button" class="btn-suggestion" data-value="Fintech">Fintech</button>
            <button type="button" class="btn-suggestion" data-value="Enterprise Software">Enterprise Software</button>
            <button type="button" class="btn-suggestion" data-value="E-commerce">E-commerce</button>
            <button type="button" class="btn-suggestion" data-value="Healthcare">Healthcare</button>
            <button type="button" class="btn-suggestion" data-value="Developer Tools">Developer Tools</button>
            <button type="button" class="btn-suggestion" data-value="Cybersecurity">Cybersecurity</button>
            <button type="button" class="btn-suggestion" data-value="AI / ML">AI / ML</button>
            <button type="button" class="btn-suggestion" data-value="Media / Entertainment">Media / Entertainment</button>
            <button type="button" class="btn-suggestion" data-value="EdTech">EdTech</button>
          </div>
        </div>

        <div class="setup-form-group">
          <label>Domains / focus areas</label>
          <div id="setup-domains-input"></div>
          <div class="setup-suggestions" data-target="setup-domains-input">
            <button type="button" class="btn-suggestion" data-value="Platform">Platform</button>
            <button type="button" class="btn-suggestion" data-value="Integrations">Integrations</button>
            <button type="button" class="btn-suggestion" data-value="Payments">Payments</button>
            <button type="button" class="btn-suggestion" data-value="Growth">Growth</button>
            <button type="button" class="btn-suggestion" data-value="Data / Analytics">Data / Analytics</button>
            <button type="button" class="btn-suggestion" data-value="Developer Experience">Developer Experience</button>
            <button type="button" class="btn-suggestion" data-value="Marketplace">Marketplace</button>
            <button type="button" class="btn-suggestion" data-value="Infrastructure">Infrastructure</button>
            <button type="button" class="btn-suggestion" data-value="Search / Discovery">Search / Discovery</button>
            <button type="button" class="btn-suggestion" data-value="Trust / Safety">Trust / Safety</button>
            <button type="button" class="btn-suggestion" data-value="Core Product">Core Product</button>
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
          <button class="btn btn-primary" id="setup-to-ai">Next: AI Setup</button>
        </div>
      </div>

      <!-- Tab 3: AI Setup -->
      <div class="setup-panel hidden" id="setup-panel-ai">
        <p class="setup-hint">Connect an AI provider to power job evaluation and profile synthesis. You can skip this and add it later in Settings.</p>

        <div class="setup-form-group">
          <label for="setup-ai-provider">Provider</label>
          <select id="setup-ai-provider">
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="gemini">Google (Gemini)</option>
          </select>
        </div>

        <div class="setup-form-group">
          <label for="setup-ai-key">API Key</label>
          <div class="setup-ai-key-row">
            <input type="password" id="setup-ai-key" placeholder="sk-ant-...">
            <button class="btn btn-ghost btn-sm" id="setup-ai-toggle-key" type="button">Show</button>
          </div>
          <small class="setup-hint" id="setup-ai-key-hint">Get a key at <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a></small>
        </div>

        <div class="setup-form-group">
          <button class="btn btn-secondary" id="setup-ai-test" type="button">Test Connection</button>
          <span class="setup-ai-status" id="setup-ai-status"></span>
        </div>

        <div class="setup-form-group hidden" id="setup-ai-model-group">
          <label for="setup-ai-model">Model</label>
          <select id="setup-ai-model"></select>
        </div>

        <div class="setup-nav">
          <button class="btn btn-ghost" id="setup-back-search">Back</button>
          <div class="setup-nav-right">
            <button class="btn btn-ghost" id="setup-skip-ai">Skip — I'll set this up later</button>
            <button class="btn btn-primary" id="setup-to-confirm">Next: Review & Build Profile</button>
          </div>
        </div>
      </div>

      <!-- Tab 4: Confirm -->
      <div class="setup-panel hidden" id="setup-panel-confirm">
        <div class="setup-confirm-summary" id="setup-summary"></div>

        <div class="setup-ai-profile hidden" id="setup-ai-profile">
          <h4>Here's the profile for your Pursuit</h4>
          <span class="setup-ai-status" id="setup-build-status"></span>
          <textarea id="setup-ai-profile-text" rows="12"></textarea>
          <div class="setup-ai-profile-actions" id="setup-ai-profile-actions" style="display:none">
            <button class="btn btn-ghost btn-sm" id="setup-regenerate" type="button">Regenerate with AI</button>
          </div>
        </div>

        <div class="setup-validation-msg hidden" id="setup-validation">
          <sl-badge variant="warning">Missing required fields</sl-badge>
          <span id="setup-missing-fields"></span>
        </div>

        <div class="setup-nav">
          <button class="btn btn-ghost btn-danger-text" id="setup-reset" type="button">Reset</button>
          <div class="setup-nav-right">
            <button class="btn btn-ghost" id="setup-back-ai">Back</button>
            <button class="btn btn-primary" id="setup-complete" disabled>Start Using Pursuit</button>
          </div>
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

  // Wire suggestion pill buttons
  document.querySelectorAll('.setup-suggestions .btn-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.closest('.setup-suggestions').dataset.target;
      const key = targetId.replace('setup-', '').replace('-input', '');
      if (tagInputs[key]) {
        tagInputs[key].addTag(btn.dataset.value);
        btn.classList.add('selected');
      }
    });
  });
}

function fillSampleProfile(index) {
  const sample = SAMPLE_PROFILES[index];
  if (!sample) return;
  const p = sample.profile;
  const s = sample.search;

  // Clear any validation errors
  document.getElementById('setup-profile-error')?.remove();
  ['setup-identity', 'setup-role', 'setup-level', 'setup-location'].forEach(id => {
    document.getElementById(id).style.borderColor = '';
  });

  // Profile tab fields
  document.getElementById('setup-identity').value = p.identity;
  document.getElementById('setup-role').value = p.role;
  document.getElementById('setup-level').value = p.level;
  document.getElementById('setup-target-level').value = p.targetLevel;
  document.getElementById('setup-years').value = p.years;
  document.getElementById('setup-years-role').value = p.yearsInRole;
  document.getElementById('setup-prev-roles').value = p.prevRoles;
  document.getElementById('setup-comp-min').value = p.compMin;
  document.getElementById('setup-comp-max').value = p.compMax;
  document.getElementById('setup-comp-flexible').checked = p.compFlexible;
  document.getElementById('setup-location').value = p.location;
  document.getElementById('setup-nonneg').value = p.nonneg;

  // Work style checkboxes
  document.getElementById('setup-remote').checked = p.workStyle.includes('remote');
  document.getElementById('setup-hybrid').checked = p.workStyle.includes('hybrid');
  document.getElementById('setup-onsite').checked = p.workStyle.includes('onsite');

  // Search tab — tag inputs
  if (tagInputs.titles) tagInputs.titles.setValue(s.titles);
  if (tagInputs.industries) tagInputs.industries.setValue(s.industries);
  if (tagInputs.domains) tagInputs.domains.setValue(s.domains);

  // Level checkboxes
  document.querySelectorAll('[name="setup-levels"]').forEach(el => { el.checked = s.levels.includes(el.value); });
  // Company size checkboxes
  document.querySelectorAll('[name="setup-company-size"]').forEach(el => { el.checked = s.companySize.includes(el.value); });

  // Highlight active sample button
  document.querySelectorAll('.btn-sample').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.setup-tab[data-tab="${tabName}"]`)?.classList.add('active');

  // Update panels
  document.querySelectorAll('.setup-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`setup-panel-${tabName}`)?.classList.remove('hidden');

  // If confirm tab, build summary and auto-trigger AI if configured
  if (tabName === 'confirm') {
    buildSummary();
    if (aiConfigured) {
      buildAIProfile();
    } else {
      // Show plain profile from fields
      const data = getFormData();
      const profileText = document.getElementById('setup-ai-profile-text');
      const profileSection = document.getElementById('setup-ai-profile');
      if (profileText && profileSection) {
        profileText.value = buildProfileMarkdown(data);
        profileSection.classList.remove('hidden');
        profileSection.querySelector('h4').textContent = "Here's your profile";
      }
    }
  }
}

function getFormData() {
  const identity = document.getElementById('setup-identity')?.value.trim() || '';
  const role = document.getElementById('setup-role')?.value.trim() || '';
  const level = document.getElementById('setup-level')?.value.trim() || '';
  const targetLevel = document.getElementById('setup-target-level')?.value.trim() || '';
  const years = document.getElementById('setup-years')?.value || '';
  const yearsInRole = document.getElementById('setup-years-role')?.value || '';
  const prevRoles = document.getElementById('setup-prev-roles')?.value.trim() || '';
  const compMin = document.getElementById('setup-comp-min')?.value.trim() || '';
  const compMax = document.getElementById('setup-comp-max')?.value.trim() || '';
  const compFlexible = document.getElementById('setup-comp-flexible')?.checked ?? true;
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

  return {
    identity, role, level, targetLevel, years, yearsInRole, prevRoles,
    compMin, compMax, compFlexible, location, workStyle, nonneg,
    titles, industries, domains,
    levels, companySize,
  };
}

function validate(data) {
  const missing = [];
  if (!data.identity) missing.push('Identity');
  if (!data.role) missing.push('Role');
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
  if (data.role) summaryHtml += `<dt>Role</dt><dd>${esc(data.role)}</dd>`;
  if (data.level) summaryHtml += `<dt>Level</dt><dd>${esc(data.level)}${data.targetLevel ? ' → ' + esc(data.targetLevel) : ''}</dd>`;
  if (data.years) summaryHtml += `<dt>Experience</dt><dd>${esc(data.years)} years total${data.yearsInRole ? ', ' + esc(data.yearsInRole) + ' in target role' : ''}</dd>`;
  if (data.prevRoles) summaryHtml += `<dt>Previous roles</dt><dd>${esc(data.prevRoles)}</dd>`;
  if (data.compMin || data.compMax) summaryHtml += `<dt>Compensation</dt><dd>${esc(data.compMin)}${data.compMax ? ' – ' + esc(data.compMax) : ''} ${data.compFlexible ? '<em>(flexible)</em>' : '<em>(firm)</em>'}</dd>`;
  if (data.location) summaryHtml += `<dt>Location</dt><dd>${esc(data.location)}</dd>`;
  if (data.workStyle.length) summaryHtml += `<dt>Work style</dt><dd>${data.workStyle.join(', ')}</dd>`;
  if (data.nonneg) summaryHtml += `<dt>Non-negotiables</dt><dd>${esc(data.nonneg).replace(/\n/g, '<br>')}</dd>`;
  summaryHtml += '</dl></div>';

  // Search section
  summaryHtml += '<div class="setup-confirm-section"><h4>Search Preferences</h4><dl>';
  if (data.titles.length) summaryHtml += `<dt>Titles</dt><dd>${data.titles.map(t => `<sl-tag size="small">${esc(t)}</sl-tag>`).join(' ')}</dd>`;
  if (data.industries.length) summaryHtml += `<dt>Industries</dt><dd>${data.industries.map(t => `<sl-tag size="small">${esc(t)}</sl-tag>`).join(' ')}</dd>`;
  if (data.domains.length) summaryHtml += `<dt>Domains</dt><dd>${data.domains.map(t => `<sl-tag size="small">${esc(t)}</sl-tag>`).join(' ')}</dd>`;
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
    `**Role:** ${data.role || ''}`,
    '',
    `**Your brand / what people know you for:** `,
    '',
    `**Total years of experience:** ${data.years || ''}`,
    '',
    `**Years in target role:** ${data.yearsInRole || ''}`,
    '',
    `**Previous / other roles:** ${data.prevRoles || ''}`,
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
    `**Target range:** ${data.compMin}${data.compMax ? ' – ' + data.compMax : ''} ${data.compFlexible ? '(flexible)' : '(firm)'}`,
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
    // Save profile — use AI-generated version if available, otherwise build from fields
    const aiProfileText = document.getElementById('setup-ai-profile-text')?.value.trim();
    const profileMd = aiProfileText || buildProfileMarkdown(data);
    await api('/profile', { method: 'PUT', body: { content: profileMd } });

    // Save AI config if configured
    if (aiConfigured) {
      const provider = document.getElementById('setup-ai-provider')?.value;
      const key = document.getElementById('setup-ai-key')?.value.trim();
      const model = document.getElementById('setup-ai-model')?.value;
      await api('/ai/configure', { method: 'POST', body: { provider, key, model } });
    }

    // Save search config
    const searchConfig = {
      titles: { values: data.titles },
      industries: { values: data.industries },
      domains: { values: data.domains },
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

// --- AI Setup logic ---

const PROVIDER_HINTS = {
  anthropic: { url: 'https://console.anthropic.com/', label: 'console.anthropic.com', placeholder: 'sk-ant-...' },
  openai: { url: 'https://platform.openai.com/api-keys', label: 'platform.openai.com', placeholder: 'sk-proj-...' },
  gemini: { url: 'https://aistudio.google.com/apikey', label: 'aistudio.google.com', placeholder: 'AIza...' },
};

let aiConfigured = false;

function updateProviderHint() {
  const provider = document.getElementById('setup-ai-provider')?.value || 'anthropic';
  const hint = PROVIDER_HINTS[provider];
  const el = document.getElementById('setup-ai-key-hint');
  const keyInput = document.getElementById('setup-ai-key');
  if (el && hint) el.innerHTML = `Get a key at <a href="${hint.url}" target="_blank">${hint.label}</a>`;
  if (keyInput && hint) keyInput.placeholder = hint.placeholder;
  // Reset test state when provider changes
  document.getElementById('setup-ai-status').textContent = '';
  document.getElementById('setup-ai-model-group')?.classList.add('hidden');
  aiConfigured = false;
  updateConfirmAI();
}

async function testAIConnection() {
  const provider = document.getElementById('setup-ai-provider')?.value;
  const key = document.getElementById('setup-ai-key')?.value.trim();
  const statusEl = document.getElementById('setup-ai-status');
  const testBtn = document.getElementById('setup-ai-test');

  if (!key) { statusEl.textContent = '✗ Enter an API key first'; statusEl.className = 'setup-ai-status error'; return; }

  testBtn.disabled = true;
  statusEl.textContent = 'Testing...';
  statusEl.className = 'setup-ai-status';

  try {
    const resp = await api('/ai/test', { method: 'POST', body: { provider, key } });
    statusEl.textContent = '✓ Connected';
    statusEl.className = 'setup-ai-status success';
    aiConfigured = true;

    // Populate model dropdown
    const modelGroup = document.getElementById('setup-ai-model-group');
    const modelSelect = document.getElementById('setup-ai-model');
    modelSelect.innerHTML = resp.models.map(m => `<option value="${m.id}" ${m.default ? 'selected' : ''}>${m.name}</option>`).join('');
    modelGroup.classList.remove('hidden');
    updateConfirmAI();
  } catch (err) {
    statusEl.textContent = `✗ ${err.message || 'Connection failed'}`;
    statusEl.className = 'setup-ai-status error';
    aiConfigured = false;
    updateConfirmAI();
  } finally {
    testBtn.disabled = false;
  }
}

function updateConfirmAI() {
  // No-op — AI state is handled when switching to confirm tab
}

async function buildAIProfile() {
  const statusEl = document.getElementById('setup-build-status');
  const profileSection = document.getElementById('setup-ai-profile');
  const profileText = document.getElementById('setup-ai-profile-text');
  const actionsEl = document.getElementById('setup-ai-profile-actions');

  profileSection.classList.remove('hidden');
  profileSection.querySelector('h4').textContent = "Here's the profile for your Pursuit";
  statusEl.textContent = 'Building your profile with AI...';
  statusEl.className = 'setup-ai-status';
  profileText.value = '';
  if (actionsEl) actionsEl.style.display = 'none';

  try {
    const provider = document.getElementById('setup-ai-provider')?.value;
    const key = document.getElementById('setup-ai-key')?.value.trim();
    const model = document.getElementById('setup-ai-model')?.value;
    const formData = getFormData();

    const resp = await api('/ai/synthesize', {
      method: 'POST',
      body: { provider, key, model, formData },
    });

    profileText.value = resp.profile;
    statusEl.textContent = '';
    if (actionsEl) actionsEl.style.display = '';
  } catch (err) {
    statusEl.textContent = `✗ ${err.message || 'AI failed — showing plain profile'}`;
    statusEl.className = 'setup-ai-status error';
    // Fallback to plain profile
    const data = getFormData();
    profileText.value = buildProfileMarkdown(data);
    if (actionsEl) actionsEl.style.display = '';
  }
}

function resetSetup() {
  // Profile tab
  document.getElementById('setup-identity').value = '';
  document.getElementById('setup-role').value = '';
  document.getElementById('setup-level').value = '';
  document.getElementById('setup-target-level').value = '';
  document.getElementById('setup-years').value = '';
  document.getElementById('setup-years-role').value = '';
  document.getElementById('setup-prev-roles').value = '';
  document.getElementById('setup-comp-min').value = '';
  document.getElementById('setup-comp-max').value = '';
  document.getElementById('setup-comp-flexible').checked = true;
  document.getElementById('setup-location').value = '';
  document.getElementById('setup-remote').checked = false;
  document.getElementById('setup-hybrid').checked = false;
  document.getElementById('setup-onsite').checked = false;
  document.getElementById('setup-nonneg').value = '';

  // Search tab
  if (tagInputs.titles) tagInputs.titles.setValue([]);
  if (tagInputs.industries) tagInputs.industries.setValue([]);
  if (tagInputs.domains) tagInputs.domains.setValue([]);
  document.querySelectorAll('[name="setup-levels"]').forEach(el => { el.checked = false; });
  document.querySelectorAll('[name="setup-company-size"]').forEach(el => { el.checked = false; });
  const resetSlider = (id, val) => { const el = document.getElementById(id); if (el) { el.value = val; el.dispatchEvent(new Event('sl-input')); } };
  resetSlider('setup-titles-flex', 2);
  resetSlider('setup-industries-flex', 2);
  resetSlider('setup-domains-flex', 2);

  // AI tab
  document.getElementById('setup-ai-provider').value = 'anthropic';
  document.getElementById('setup-ai-key').value = '';
  document.getElementById('setup-ai-status').textContent = '';
  document.getElementById('setup-ai-model-group')?.classList.add('hidden');
  aiConfigured = false;
  updateProviderHint();

  // Confirm tab
  document.getElementById('setup-ai-profile')?.classList.add('hidden');
  document.getElementById('setup-build-status').textContent = '';

  // Deselect sample buttons
  document.querySelectorAll('.btn-sample').forEach(btn => btn.classList.remove('active'));

  // Go back to Profile tab
  switchTab('profile');
}

// --- Init ---

const IDENTITY_EXAMPLES = [
  '"I build integrations and partner ecosystems at B2B SaaS companies."',
  '"I turn messy data pipelines into reliable platforms that engineering teams love."',
  '"I ship developer tools that make complex APIs feel simple."',
  '"I grow marketplace products by connecting supply and demand at scale."',
  '"I lead cross-functional teams to launch enterprise features from 0 to 1."',
  '"I design systems that handle millions of transactions without anyone noticing."',
  '"I make healthcare software that doctors actually want to use."',
  '"I build the infrastructure that other teams build products on."',
  '"I find product-market fit in ambiguous spaces where the roadmap is blank."',
  '"I connect business strategy to technical execution as the PM in the room."',
];

function startIdentityRotation() {
  const el = document.getElementById('identity-inspiration');
  if (!el) return;
  let idx = Math.floor(Math.random() * IDENTITY_EXAMPLES.length);
  el.textContent = `Try something like: ${IDENTITY_EXAMPLES[idx]}`;
  setInterval(() => {
    idx = (idx + 1) % IDENTITY_EXAMPLES.length;
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = `Try something like: ${IDENTITY_EXAMPLES[idx]}`;
      el.style.opacity = '1';
    }, 300);
  }, 5000);
}

export function initSetup() {
  startIdentityRotation();

  // Tab navigation
  document.querySelectorAll('.setup-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Next/Back buttons — enforce mandatory fields before advancing
  document.getElementById('setup-to-search')?.addEventListener('click', () => {
    const identity = document.getElementById('setup-identity')?.value.trim();
    const role = document.getElementById('setup-role')?.value.trim();
    const level = document.getElementById('setup-level')?.value.trim();
    const location = document.getElementById('setup-location')?.value.trim();
    const missing = [];
    if (!identity) missing.push('Who are you');
    if (!role) missing.push('Role');
    if (!level) missing.push('Current level');
    if (!location) missing.push('Location');
    if (missing.length > 0) {
      // Highlight missing fields
      if (!identity) document.getElementById('setup-identity').style.borderColor = 'var(--red)';
      if (!role) document.getElementById('setup-role').style.borderColor = 'var(--red)';
      if (!level) document.getElementById('setup-level').style.borderColor = 'var(--red)';
      if (!location) document.getElementById('setup-location').style.borderColor = 'var(--red)';
      // Show inline error
      let errEl = document.getElementById('setup-profile-error');
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.id = 'setup-profile-error';
        errEl.style.cssText = 'color: var(--red); font-size: 13px; margin-top: 8px;';
        document.getElementById('setup-to-search').parentElement.appendChild(errEl);
      }
      errEl.textContent = `Fill in required fields: ${missing.join(', ')}`;
      return;
    }
    // Clear any previous errors
    document.getElementById('setup-profile-error')?.remove();
    ['setup-identity', 'setup-role', 'setup-level', 'setup-location'].forEach(id => {
      document.getElementById(id).style.borderColor = '';
    });
    switchTab('search');
  });

  // Clear red borders on input
  ['setup-identity', 'setup-role', 'setup-level', 'setup-location'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      document.getElementById(id).style.borderColor = '';
      const errEl = document.getElementById('setup-profile-error');
      if (errEl) errEl.remove();
    });
  });

  document.getElementById('setup-to-ai')?.addEventListener('click', () => switchTab('ai'));
  document.getElementById('setup-to-confirm')?.addEventListener('click', () => switchTab('confirm'));
  document.getElementById('setup-back-profile')?.addEventListener('click', () => switchTab('profile'));
  document.getElementById('setup-back-search')?.addEventListener('click', () => switchTab('search'));
  document.getElementById('setup-back-ai')?.addEventListener('click', () => switchTab('ai'));
  document.getElementById('setup-skip-ai')?.addEventListener('click', () => { aiConfigured = false; updateConfirmAI(); switchTab('confirm'); });

  // AI Setup
  document.getElementById('setup-ai-provider')?.addEventListener('change', updateProviderHint);
  document.getElementById('setup-ai-test')?.addEventListener('click', testAIConnection);
  document.getElementById('setup-ai-toggle-key')?.addEventListener('click', () => {
    const input = document.getElementById('setup-ai-key');
    const btn = document.getElementById('setup-ai-toggle-key');
    if (input.type === 'password') { input.type = 'text'; btn.textContent = 'Hide'; }
    else { input.type = 'password'; btn.textContent = 'Show'; }
  });

  // AI Regenerate on Confirm tab
  document.getElementById('setup-regenerate')?.addEventListener('click', buildAIProfile);

  // Reset
  document.getElementById('setup-reset')?.addEventListener('click', resetSetup);

  // Sample profile buttons
  document.querySelectorAll('.btn-sample').forEach(btn => {
    btn.addEventListener('click', () => fillSampleProfile(parseInt(btn.dataset.sample)));
  });

  // Complete
  document.getElementById('setup-complete')?.addEventListener('click', completeSetup);
}
