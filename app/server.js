import 'dotenv/config';
import express from 'express';
import { readFile, writeFile, readdir, mkdir, access, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import multer from 'multer';
import pdf2md from '@opendocsg/pdf2md';
import { fetchJobs, findChromeExecutable, findChromeProfile } from './browser.js';
import { fetchJobs as fetchAtsJobs } from 'ats-index';
import { SETUP_STEPS, buildSynthesisContext, extractJSON, extractProfileMarkdown } from './setup.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA = join(ROOT, 'data');
const SCANNER_PROMPT = join(ROOT, 'scanner', 'scanner-prompt.md');
const EVALUATOR_SYSTEM = join(ROOT, 'evaluator', 'system.md');
const EVALUATOR_INITIAL = join(ROOT, 'evaluator', 'initial-eval.md');
const EVALUATOR_FOLLOWUP = join(ROOT, 'evaluator', 'follow-up.md');
const PROFILE_TEMPLATE = join(ROOT, 'scanner', 'my-profile-template.md');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
let API_KEY = process.env.ANTHROPIC_API_KEY;

// Settings stored in memory (persisted to data/settings.json)
let settings = {
  searchQueries: [],
  lastFetchTime: null,
  dedupeExpirationDays: 7,
};

// System check results (populated at startup, re-checked on fetch failure)
let systemChecks = {
  chromePath: null,
  chromeProfilePath: null,
};

// Decisions index — maps jobId → most recent decision (persists inline actions across refresh)
let decisionsIndex = {};

async function loadDecisionsIndex() {
  try {
    const content = await readFile(join(DATA, 'decisions.md'), 'utf-8');
    if (!content) return;
    // Parse markdown table rows: | Date | Company | Role | Scanner | Decision | Outcome |
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.startsWith('|') || line.includes('---') || line.includes('Date')) continue;
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 5) {
        const [, company, role, , decision] = cols;
        if (company && role && decision) {
          const id = jobId(company, role);
          decisionsIndex[id] = decision;
        }
      }
    }
  } catch {
    // No decisions file yet — that's fine
  }
}

// --- Helpers ---

async function ensureDir(dir) {
  try { await access(dir); } catch { await mkdir(dir, { recursive: true }); }
}

async function ensureDataDirs() {
  await ensureDir(join(DATA, 'jobs'));
  await ensureDir(join(DATA, 'scans'));
  await ensureDir(join(DATA, 'evaluations'));
  await ensureDir(join(DATA, 'references'));
}

async function clearDirectory(dirPath) {
  try {
    const files = await readdir(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    for (const file of mdFiles) {
      await unlink(join(dirPath, file));
    }
    return mdFiles.length;
  } catch {
    return 0;
  }
}

function searchConfigFingerprint(config) {
  if (!config) return '';
  const parts = [
    (config.titles?.values || []).sort().join(','),
    (config.locations || []).sort().join(','),
  ];
  return createHash('md5').update(parts.join('|')).digest('hex').substring(0, 12);
}

async function readMarkdown(filepath) {
  try {
    return await readFile(filepath, 'utf-8');
  } catch {
    return null;
  }
}

function jobId(company, title) {
  // Must match browser.js dedupeKey() — MD5 of "company|title"
  const raw = `${company}|${title}`.toLowerCase().trim();
  return createHash('md5').update(raw).digest('hex').substring(0, 12);
}

const DOSSIERS_DIR = join(DATA, 'dossiers');

function datePrefix() {
  return new Date().toISOString().split('T')[0];
}

// --- Dossier helpers (living document per job) ---

function buildJobDetailsSection(job) {
  return [
    `- Source: ${job.source || '—'}`,
    `- Date: ${job.date || '—'}`,
    `- Location: ${job.location || '—'}`,
    job.link ? `- Link: ${job.link}` : null,
    job.salary ? `- Salary: ${job.salary}` : null,
    job.jobType ? `- Type: ${job.jobType}` : null,
    job.experienceLevel ? `- Level posted: ${job.experienceLevel}` : null,
    job.companySize ? `- Company size: ${job.companySize}` : null,
    job.availability ? `- Availability: ${job.availability.status}${job.availability.stale ? ' (stale)' : ''}` : null,
  ].filter(Boolean).join('\n');
}

async function createDossier(job) {
  await mkdir(DOSSIERS_DIR, { recursive: true });
  const content = [
    `# Dossier: ${job.company} — ${job.role}`,
    `**ID:** ${job.id}`,
    `**Created:** ${datePrefix()}`,
    '',
    '## Scanner Assessment',
    job.rawDossierBlock || buildFallbackScannerSection(job),
    '',
    '## Job Details',
    buildJobDetailsSection(job),
    '',
    '## Full Listing',
    job.fullDescription || job.summary || job.rawListing || '—',
  ].join('\n');
  await writeFile(join(DOSSIERS_DIR, `${job.id}.md`), content);
}

/**
 * Fetch jobs from ATS boards (Greenhouse, Ashby, Lever) via ats-index.
 * Filters by user's configured job titles.
 */
async function fetchFromAtsIndex(watchlist, titleFilters) {
  if (!watchlist || watchlist.length === 0) return [];
  const allJobs = [];

  for (const company of watchlist) {
    try {
      const jobs = await fetchAtsJobs({ company });
      // Filter by title relevance: job title must contain at least one search title
      const relevant = titleFilters.length > 0
        ? jobs.filter(j => titleFilters.some(t =>
            j.title.toLowerCase().includes(t.toLowerCase().replace(/^(senior|staff|principal|lead|group|director of)\s+/i, '').trim())
          ))
        : jobs;
      allJobs.push(...relevant);
    } catch (err) {
      console.warn(`ATS fetch failed for ${company}: ${err.message}`);
    }
  }

  // Convert ats-index schema to Pursuit raw job format
  return allJobs.map(job => ({
    title: job.title,
    company: job.company,
    location: job.location || '',
    posted: job.postedAt ? job.postedAt.substring(0, 10) : 'Unknown',
    source: `ATS (${job.ats})`,
    summary: job.description ? job.description.substring(0, 500) : '',
    fullDescription: job.description || '',
    link: job.url || '',
    salary: job.salary ? `$${job.salary.min?.toLocaleString()}-$${job.salary.max?.toLocaleString()}` : '',
    jobType: job.metadata?.employmentType || '',
    experienceLevel: '',
    companySize: '',
    availability: { status: 'live' },
  }));
}

/**
 * Format ATS jobs as markdown for the raw jobs directory.
 */
function formatAtsJobsMarkdown(jobs) {
  const lines = [`# ATS Index Jobs - ${datePrefix()}`, `**Jobs found:** ${jobs.length}`, ''];
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    lines.push('---');
    lines.push(`**Job ${i + 1}**`);
    lines.push(`Title: ${j.title}`);
    lines.push(`Company: ${j.company}`);
    if (j.location) lines.push(`Location: ${j.location}`);
    if (j.posted && j.posted !== 'Unknown') lines.push(`Posted: ${j.posted}`);
    lines.push(`Source: ${j.source}`);
    if (j.link) lines.push(`Link: ${j.link}`);
    if (j.salary) lines.push(`Salary: ${j.salary}`);
    if (j.jobType) lines.push(`Type: ${j.jobType}`);
    if (j.fullDescription) {
      lines.push('');
      lines.push('Full Description:');
      lines.push(j.fullDescription);
    } else if (j.summary) {
      lines.push(`Summary: ${j.summary}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function buildAspirationContext() {
  const config = settings.searchConfig;
  if (!config) return '';
  const domains = config.domains?.values || [];
  const industries = config.industries?.values || [];
  if (domains.length === 0 && industries.length === 0) return '';
  const parts = [
    '\n\n## My Search Interests (Aspiration, NOT Experience)\n',
    'These are domains and industries I am exploring. They do NOT mean I have experience here. Treat as interest signals only. My actual experience is described in my profile above.',
  ];
  if (domains.length) parts.push(`\nDomains of interest: ${domains.join(', ')}`);
  if (industries.length) parts.push(`Industries of interest: ${industries.join(', ')}`);
  return parts.join('\n');
}

function buildFallbackScannerSection(job) {
  return [
    `- Match: ${job.matchType || 'Unknown'}`,
    `- Risk: ${job.risk || 'Unknown'}`,
    `- Action: ${job.action || 'CONSIDER'}`,
    `- Key signal: ${job.keySignal || '—'}`,
    `- Watch for: ${job.watchFor || '—'}`,
    job.narrative ? `\n**Why:** ${job.narrative}` : '',
    job.riskDetail ? `\n**Risk detail:** ${job.riskDetail}` : '',
  ].filter(Boolean).join('\n');
}

async function appendToDossier(id, content) {
  const path = join(DOSSIERS_DIR, `${id}.md`);
  const existing = await readMarkdown(path);
  if (existing) {
    await writeFile(path, existing + '\n\n' + content);
  }
}

async function readDossier(id) {
  return readMarkdown(join(DOSSIERS_DIR, `${id}.md`));
}

// Convenience wrapper — uses the configured AI provider (or falls back to env key)
async function callAI(systemPrompt, userMessage) {
  const provider = settings.ai?.provider || 'anthropic';
  const key = settings.ai?.key || API_KEY;
  const model = settings.ai?.model || null;

  if (!key || key === 'sk-ant-your-key-here') {
    throw new Error('No API key configured. Add one via Settings or app/.env');
  }

  return callAIProvider(provider, key, model, systemPrompt, userMessage);
}

async function loadSettings() {
  const content = await readMarkdown(join(DATA, 'settings.json'));
  if (content) {
    try { settings = JSON.parse(content); } catch { /* keep defaults */ }
  }
}

async function saveSettings() {
  await writeFile(join(DATA, 'settings.json'), JSON.stringify(settings, null, 2));
}

// --- Parse raw fetched job listings ---

function parseRawJobListings(markdown) {
  const jobs = [];
  // Split on job blocks (--- separated)
  const blocks = markdown.split(/^---$/m).filter(b => b.trim());

  for (const block of blocks) {
    const get = (field) => {
      const m = block.match(new RegExp(`^${field}:\\s*(.+)$`, 'mi'));
      return m ? m[1].trim() : '';
    };
    const title = get('Title');
    const company = get('Company');
    if (!title || !company) continue;

    const job = {
      title,
      company,
      location: get('Location'),
      posted: get('Posted'),
      source: get('Source'),
      summary: get('Summary'),
      link: get('Link'),
      salary: get('Salary'),
      jobType: get('Type'),
      experienceLevel: get('Level'),
      companySize: get('Company Size'),
    };

    // Parse availability field
    const avail = get('Availability');
    if (avail) {
      const status = avail.split(' — ')[0].trim();
      job.availability = { status };
      if (avail.includes('stale')) job.availability.stale = true;
      if (avail.includes(' — ')) job.availability.reason = avail.split(' — ').slice(1).join(' — ');
    }

    // Parse extraction status
    const extraction = get('Extraction');
    if (extraction) {
      job.extractionStatus = {};
      for (const pair of extraction.replace(/\(.*\)/, '').split(',')) {
        const [key, val] = pair.trim().split('=');
        if (key && val) job.extractionStatus[key.trim()] = val.trim() === 'yes';
      }
      if (extraction.includes('FAILED')) job.extractionStatus.failed = true;
    }

    // Parse full description (multi-line block after "Full Description:")
    const descMatch = block.match(/Full Description:\n([\s\S]+?)$/);
    if (descMatch) job.fullDescription = descMatch[1].trim();

    jobs.push(job);
  }
  return jobs;
}

// --- Parse scanner output into structured jobs ---

function parseScannerOutput(markdown) {
  const jobs = [];
  // Support both 7-column (legacy) and 8-column (with Score) format
  const tableRegex8 = /\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
  const tableRegex7 = /\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
  let match;

  // Try 8-column format first (with Score)
  while ((match = tableRegex8.exec(markdown)) !== null) {
    if (match[1] === '#' || match[2].includes('---')) continue;
    const scoreStr = match[4].trim().replace('%', '');
    jobs.push({
      index: parseInt(match[1]),
      company: match[2].trim(),
      role: match[3].trim(),
      fitScore: parseInt(scoreStr) || null,
      matchType: match[5].trim(),
      risk: match[6].trim(),
      action: match[7].trim(),
      keySignal: match[8].trim(),
    });
  }

  // Fallback to 7-column format (legacy, no Score)
  if (jobs.length === 0) {
    while ((match = tableRegex7.exec(markdown)) !== null) {
      if (match[1] === '#' || match[2].includes('---')) continue;
      jobs.push({
        index: parseInt(match[1]),
        company: match[2].trim(),
        role: match[3].trim(),
        fitScore: null,
        matchType: match[4].trim(),
        risk: match[5].trim(),
        action: match[6].trim(),
        keySignal: match[7].trim(),
      });
    }
  }

  // Parse CONSIDER details (backward compat: also match EVALUATE)
  const detailRegex = /###\s*\[(\d+)\]\s*(.+?)\n([\s\S]*?)(?=###\s*\[|## MAYBE|---\s*\nScanned|$)/g;
  while ((match = detailRegex.exec(markdown)) !== null) {
    const idx = parseInt(match[1]);
    const job = jobs.find(j => j.index === idx);
    if (job) {
      const detail = match[3];
      job.rawDossierBlock = detail.trim(); // Preserve Scanner's raw block verbatim
      const whyMatch = detail.match(/\*\*Why:\*\*\s*(.+?)(?:\n|$)/);
      const riskMatch = detail.match(/\*\*Risk(?:\s*detail)?:\*\*\s*(.+?)(?:\n|$)/);
      const watchMatch = detail.match(/\*\*Watch for:\*\*\s*(.+?)(?:\n|$)/);
      const fenceMatch = detail.match(/\*\*On the fence because:\*\*\s*(.+?)(?:\n|$)/);

      if (whyMatch) job.narrative = whyMatch[1].trim();
      if (riskMatch) job.riskDetail = riskMatch[1].trim();
      if (watchMatch) job.watchFor = watchMatch[1].trim();
      if (fenceMatch) job.narrative = fenceMatch[1].trim();

      // Extract dossier profile context fields (new format)
      const skillsMatch = detail.match(/[-•]\s*Matched skills:\s*(.+?)(?:\n|$)/);
      const levelMatch = detail.match(/[-•]\s*Level context:\s*(.+?)(?:\n|$)/);
      const riskNoteMatch = detail.match(/[-•]\s*Risk appetite note:\s*(.+?)(?:\n|$)/);
      const redFlagMatch = detail.match(/[-•]\s*Red flags to check:\s*(.+?)(?:\n|$)/);

      if (skillsMatch) job.matchedSkills = skillsMatch[1].trim();
      if (levelMatch) job.levelContext = levelMatch[1].trim();
      if (riskNoteMatch) job.riskAppetiteNote = riskNoteMatch[1].trim();
      if (redFlagMatch) job.redFlagsToCheck = redFlagMatch[1].trim();

      // Extract raw listing block if Scanner included it
      const listingMatch = detail.match(/\*\*Raw listing:\*\*\s*\n([\s\S]+?)(?=\n###|\n---|\n\*\*|$)/);
      if (listingMatch) job.rawListing = listingMatch[1].trim();
    }
  }

  // Parse stats line
  const statsMatch = markdown.match(/Scanned:\s*(\d+)\s*\|\s*(?:Consider|Evaluate):\s*(\d+)\s*\|\s*Maybe:\s*(\d+)\s*\|\s*(?:Passed|Skipped):\s*(\d+)/);
  const stats = statsMatch ? {
    scanned: parseInt(statsMatch[1]),
    evaluate: parseInt(statsMatch[2]),
    maybe: parseInt(statsMatch[3]),
    skipped: parseInt(statsMatch[4]),
  } : null;

  // Warn if parsing produced no jobs from non-empty output
  if (jobs.length === 0 && markdown.trim().length > 100) {
    console.warn('WARNING: parseScannerOutput found 0 jobs in non-empty Scanner output. Format may have changed.');
  }

  return { jobs, stats, raw: markdown };
}

// --- Generate criteria tags from scanner output ---

function extractTags(job, profileText) {
  const tags = [];

  // Match type tags
  if (job.matchType === 'Direct') tags.push({ label: 'Direct match', color: 'green' });
  else if (job.matchType === 'Adjacent') tags.push({ label: 'Adjacent', color: 'blue' });
  else if (job.matchType === 'Stretch') tags.push({ label: 'Stretch', color: 'amber' });

  // Risk tags
  if (job.risk === 'Safe') tags.push({ label: 'Safe play', color: 'green' });
  else if (job.risk === 'Stretch') tags.push({ label: 'Stretch bet', color: 'amber' });

  // Action tags
  if (job.action === 'CONSIDER' || job.action === 'EVALUATE') tags.push({ label: 'CONSIDER', color: 'green' });
  else if (job.action === 'MAYBE') tags.push({ label: 'MAYBE', color: 'amber' });
  else if (job.action === 'PASS' || job.action === 'SKIP') tags.push({ label: 'PASS', color: 'gray' });

  // Extract signal-based tags from narrative/keySignal
  const text = `${job.keySignal || ''} ${job.narrative || ''} ${job.riskDetail || ''}`.toLowerCase();
  if (text.includes('remote')) tags.push({ label: 'Remote ✓', color: 'green' });
  if (text.includes('onsite') || text.includes('on-site')) tags.push({ label: 'Onsite ✗', color: 'red' });
  if (text.includes('right level') || text.includes('level align')) tags.push({ label: 'Right level', color: 'green' });
  if (text.includes('too senior')) tags.push({ label: 'Too senior ✗', color: 'red' });
  if (text.includes('too junior')) tags.push({ label: 'Too junior ✗', color: 'red' });
  if (text.includes('red flag')) tags.push({ label: 'Red flag', color: 'red' });

  return tags;
}

// --- API Routes ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    apiKeyConfigured: !!(API_KEY && API_KEY !== 'sk-ant-your-key-here'),
    chromeFound: !!systemChecks.chromePath,
    chromeProfileFound: !!systemChecks.chromeProfilePath,
    dataDir: DATA,
  });
});

// Profile
app.get('/api/profile', async (req, res) => {
  let content = await readMarkdown(join(DATA, 'profile.md'));
  if (!content) {
    // Seed from template on first run
    content = await readMarkdown(PROFILE_TEMPLATE);
    if (content) {
      await writeFile(join(DATA, 'profile.md'), content);
    }
  }
  res.json({ content: content || '' });
});

app.put('/api/profile', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  await writeFile(join(DATA, 'profile.md'), content);
  res.json({ ok: true });
});

// Resume — upload PDF, convert to markdown
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/resume/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }
    const markdown = await pdf2md(req.file.buffer);
    await writeFile(join(DATA, 'resume.md'), markdown);
    res.json({ ok: true, length: markdown.length });
  } catch (err) {
    res.status(500).json({ error: `Resume conversion failed: ${err.message}` });
  }
});

app.get('/api/resume', async (req, res) => {
  const content = await readMarkdown(join(DATA, 'resume.md'));
  res.json({ hasResume: !!content, preview: content ? content.substring(0, 200) : null });
});

// Jobs — list all jobs from scans, enriched with raw fetched metadata
app.get('/api/jobs', async (req, res) => {
  try {
    // Load raw fetched job metadata for enrichment (location, link, summary)
    const jobDir = join(DATA, 'jobs');
    const jobFiles = await readdir(jobDir).catch(() => []);
    const rawJobIndex = {};
    const rawByRole = {}; // Fuzzy fallback: role title → raw job (for when company names mismatch)
    for (const file of jobFiles.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(jobDir, file), 'utf-8');
      for (const raw of parseRawJobListings(content)) {
        const key = jobId(raw.company, raw.title);
        rawJobIndex[key] = raw;
        // Build fuzzy index by normalized role title for fallback matching
        const roleKey = raw.title.toLowerCase().trim();
        if (!rawByRole[roleKey]) rawByRole[roleKey] = [];
        rawByRole[roleKey].push(raw);
      }
    }

    const scanDir = join(DATA, 'scans');
    const files = await readdir(scanDir).catch(() => []);
    const allJobs = [];
    const seenJobIds = new Set(); // Dedup across scan files and within scanner output
    const evalFiles = await readdir(join(DATA, 'evaluations')).catch(() => []);
    const profile = await readMarkdown(join(DATA, 'profile.md')) || '';

    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(scanDir, file), 'utf-8');
      const parsed = parseScannerOutput(content);

      for (const job of parsed.jobs) {
        job.id = jobId(job.company, job.role);
        if (seenJobIds.has(job.id)) continue; // Skip duplicates across scan files
        seenJobIds.add(job.id);
        job.scanFile = file;
        job.tags = extractTags(job, profile);
        job.date = file.substring(0, 10);

        // Enrich with raw fetched metadata (exact match, then fuzzy fallback by role title + company substring)
        let raw = rawJobIndex[job.id];
        if (!raw) {
          const candidates = rawByRole[job.role.toLowerCase().trim()] || [];
          raw = candidates.find(c => c.company.toLowerCase().includes(job.company.toLowerCase()) ||
                                     job.company.toLowerCase().includes(c.company.replace(/remote|hybrid|on-?site/gi, '').trim().toLowerCase()));
        }
        if (raw) {
          job.location = raw.location || '';
          job.link = raw.link || '';
          job.summary = raw.summary || '';
          job.fullDescription = raw.fullDescription || '';
          job.source = raw.source || '';
          job.posted = raw.posted || '';
          job.salary = raw.salary || '';
          job.jobType = raw.jobType || '';
          job.experienceLevel = raw.experienceLevel || '';
          job.companySize = raw.companySize || '';
          if (raw.availability) job.availability = raw.availability;
          if (raw.extractionStatus) job.extractionStatus = raw.extractionStatus;
          // Clean location: strip company name + "Remote" prefix from dirty Indeed data
          if (job.location) {
            job.location = job.location
              .replace(/^.+?(?:Remote|Hybrid|On-?site)\s*(?:in\s+)?/i, '')
              .replace(/^(?:in\s+)/i, '')
              .trim() || job.location;
          }
        }

        // Compute missing fields for UI
        job.missingFields = [];
        if (!job.fullDescription && !job.summary && !job.narrative) job.missingFields.push('description');
        if (!job.salary) job.missingFields.push('salary');
        if (!job.location) job.missingFields.push('location');
        if (!job.link) job.missingFields.push('link');
        if (!job.source) {
          job.source = file.includes('indeed') ? 'Indeed' : file.includes('linkedin') ? 'LinkedIn' : 'Manual';
        }

        // Check if evaluation exists and extract revised fit score
        const evalFile = evalFiles.find(f => f.includes(job.id));
        job.hasEvaluation = !!evalFile;
        job.evalFile = evalFile || null;
        if (evalFile) {
          try {
            const evalContent = await readFile(join(DATA, 'evaluations', evalFile), 'utf-8');
            const fitMatch = evalContent.match(/\*\*Fit:\s*(\d+)%/);
            if (fitMatch) job.fitScore = parseInt(fitMatch[1]); // Override scanner score
            const decMatch = evalContent.match(/\*\*Decision:\s*(PURSUE|MAYBE|PASS)/i);
            if (decMatch) job.evalDecision = decMatch[1].toUpperCase();
            const sumMatch = evalContent.match(/\*\*Fit summary:\*\*\s*(.+?)(?:\n|$)/);
            if (sumMatch) job.evalSummary = sumMatch[1].trim().replace(/\s*[—–]\s*/g, ': ');
          } catch { /* eval file read failed, keep scanner score */ }
        }

        allJobs.push(job);
      }
    }

    // Include raw fetched jobs that haven't been scanned yet (dedup by role title)
    const scannedIds = new Set(allJobs.map(j => j.id));
    const seenRawRoles = new Set();
    for (const [id, raw] of Object.entries(rawJobIndex)) {
      if (scannedIds.has(id)) continue;
      // Dedup raw jobs by normalized company+role to avoid dirty-name duplicates
      const rawKey = `${raw.company.replace(/remote|hybrid|on-?site/gi, '').trim()}|${raw.title}`.toLowerCase();
      if (seenRawRoles.has(rawKey)) continue;
      seenRawRoles.add(rawKey);
      const missingFields = [];
      if (!raw.fullDescription && !raw.summary) missingFields.push('description');
      if (!raw.salary) missingFields.push('salary');
      if (!raw.location) missingFields.push('location');
      if (!raw.link) missingFields.push('link');

      allJobs.push({
        id,
        company: raw.company,
        role: raw.title,
        location: raw.location || '',
        link: raw.link || '',
        summary: raw.summary || '',
        fullDescription: raw.fullDescription || '',
        source: raw.source || '',
        posted: raw.posted || '',
        salary: raw.salary || '',
        jobType: raw.jobType || '',
        experienceLevel: raw.experienceLevel || '',
        companySize: raw.companySize || '',
        date: '',
        action: '',
        tags: [],
        hasEvaluation: false,
        availability: raw.availability || null,
        extractionStatus: raw.extractionStatus || null,
        missingFields,
      });
    }

    // Overlay decisions from index (so inline decisions persist across refresh)
    for (const job of allJobs) {
      const decision = decisionsIndex[job.id];
      if (decision) {
        job.decision = decision;
        // Upgrade action for decisions so badge shows correctly
        if (decision !== job.action) job.action = decision;
      }
    }

    res.json({ jobs: allJobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single job detail
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Search through scans to find this job
    const scanDir = join(DATA, 'scans');
    const files = await readdir(scanDir).catch(() => []);

    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(scanDir, file), 'utf-8');
      const parsed = parseScannerOutput(content);
      const job = parsed.jobs.find(j => jobId(j.company, j.role) === id);

      if (job) {
        job.id = id;
        job.tags = extractTags(job, '');

        // Enrich with raw fetched metadata
        const jobDir = join(DATA, 'jobs');
        const jobFiles = await readdir(jobDir).catch(() => []);
        for (const jf of jobFiles.filter(f => f.endsWith('.md'))) {
          const rawContent = await readFile(join(jobDir, jf), 'utf-8');
          const raw = parseRawJobListings(rawContent).find(r => jobId(r.company, r.title) === id);
          if (raw) {
            job.location = raw.location || '';
            job.link = raw.link || '';
            job.summary = raw.summary || '';
            job.source = raw.source || '';
            break;
          }
        }

        // Load evaluation if exists
        const evalDir = join(DATA, 'evaluations');
        const evalFiles = await readdir(evalDir).catch(() => []);
        const evalFile = evalFiles.find(f => f.includes(id));
        if (evalFile) {
          job.evaluation = await readFile(join(evalDir, evalFile), 'utf-8');
        }

        return res.json(job);
      }
    }
    res.status(404).json({ error: 'Job not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scan — run scanner prompt on listings
app.post('/api/scan', async (req, res) => {
  try {
    const { listings } = req.body;
    if (!listings) return res.status(400).json({ error: 'Listings text required' });

    const profile = await readMarkdown(join(DATA, 'profile.md'));
    if (!profile) return res.status(400).json({ error: 'Profile not set. Please create your profile first.' });

    const scannerPrompt = await readMarkdown(SCANNER_PROMPT);
    if (!scannerPrompt) return res.status(500).json({ error: 'Scanner prompt not found' });

    // Load reference examples to calibrate the scanner
    let referencesContext = '';
    const refsDir = join(DATA, 'references');
    const refFiles = await readdir(refsDir).catch(() => []);
    if (refFiles.length > 0) {
      const refParts = ['\n\n## Reference Examples (What I Love/Hate)\n\nUse these to calibrate your filtering — they show what "good" and "bad" look like for me specifically.\n'];
      for (const file of refFiles.filter(f => f.endsWith('.md')).slice(0, 6)) {
        const content = await readFile(join(refsDir, file), 'utf-8');
        refParts.push(content);
        refParts.push('---');
      }
      referencesContext = refParts.join('\n');
    }

    // Build aspiration context from search config (domains/industries user is exploring)
    const aspirationContext = buildAspirationContext();

    const userMessage = `## My Profile\n\n${profile}${referencesContext}${aspirationContext}\n\n## Job Listings\n\n${listings}`;
    const result = await callAI(scannerPrompt, userMessage);

    // Write to data/scans/
    const filename = `${datePrefix()}-batch.md`;
    let finalName = filename;
    let counter = 1;
    try {
      await access(join(DATA, 'scans', finalName));
      // File exists, increment
      while (true) {
        counter++;
        finalName = `${datePrefix()}-batch-${counter}.md`;
        try { await access(join(DATA, 'scans', finalName)); } catch { break; }
      }
    } catch { /* file doesn't exist, use original name */ }

    await writeFile(join(DATA, 'scans', finalName), result);

    const parsed = parseScannerOutput(result);

    // Create living dossier per CONSIDER job (backward compat: also match EVALUATE)
    for (const job of (parsed.jobs || [])) {
      if (job.action && ['CONSIDER', 'EVALUATE'].includes(job.action.toUpperCase())) {
        job.id = job.id || jobId(job.company, job.role);
        await createDossier(job);
        job.dossierFile = `${job.id}.md`;
      }
    }

    res.json({ filename: finalName, ...parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Evaluate — run evaluator on a specific job (reads dossier + modular prompts)
app.post('/api/evaluate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { jobDescription, dossierFile } = req.body;

    const profile = await readMarkdown(join(DATA, 'profile.md'));
    if (!profile) return res.status(400).json({ error: 'Profile not set' });

    // Compose system prompt from modular parts
    const systemParts = [
      await readMarkdown(EVALUATOR_SYSTEM),
      await readMarkdown(EVALUATOR_INITIAL),
    ].filter(Boolean);
    const systemPrompt = systemParts.length > 0
      ? systemParts.join('\n\n---\n\n')
      : null; // No fallback — modular prompts (system.md + initial-eval.md) are required

    if (!systemPrompt) {
      return res.status(500).json({ error: 'Evaluator prompts not found. Check evaluator/*.md files.' });
    }

    // Build user message with profile + resume + learned profile + dossier
    const resume = await readMarkdown(join(DATA, 'resume.md'));
    const learnedProfile = await readMarkdown(join(DATA, 'learned-profile.md'));
    // Read living dossier (try new location first, then legacy)
    let dossier = await readDossier(id);
    if (!dossier && dossierFile) {
      dossier = await readMarkdown(join(DATA, 'scans', 'dossiers', dossierFile));
    }

    const userParts = [
      `## My Profile\n\n${profile}`,
      resume ? `## My Resume\n\n${resume}` : '',
      learnedProfile ? `## Learned Profile (from past decisions)\n\n${learnedProfile}` : '',
      dossier ? `## Scanner Dossier\n\n${dossier}` : '',
      jobDescription ? `## Job Description\n\n${jobDescription}` : '',
    ].filter(Boolean);

    const result = await callAI(systemPrompt, userParts.join('\n\n'));

    // Append evaluation to living dossier
    await appendToDossier(id, `## Evaluator Assessment\n**Date:** ${datePrefix()}\n${result}`);

    // Also write standalone file for backwards compat
    const filename = `${datePrefix()}-${id}.md`;
    await mkdir(join(DATA, 'evaluations'), { recursive: true });
    await writeFile(join(DATA, 'evaluations', filename), result);

    res.json({ filename, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Follow-up — user asks a specific question about a previous evaluation
app.post('/api/evaluate/:id/follow-up', async (req, res) => {
  try {
    const { id } = req.params;
    const { question, previousEvaluation, dossierFile } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    const systemParts = [
      await readMarkdown(EVALUATOR_SYSTEM),
      await readMarkdown(EVALUATOR_FOLLOWUP),
    ].filter(Boolean);
    const systemPrompt = systemParts.join('\n\n---\n\n');

    if (!systemPrompt) {
      return res.status(500).json({ error: 'Evaluator prompts not found. Check evaluator/*.md files.' });
    }

    // Include full context so evaluator can answer JD-specific questions
    const profile = await readMarkdown(join(DATA, 'profile.md'));
    let dossier = null;
    // Try new dossier location first, then legacy
    dossier = await readMarkdown(join(DATA, 'dossiers', `${id}.md`));
    if (!dossier && dossierFile) {
      dossier = await readMarkdown(join(DATA, 'scans', 'dossiers', dossierFile));
    }

    const userParts = [
      profile ? `## My Profile\n\n${profile}` : '',
      dossier ? `## Dossier\n\n${dossier}` : '',
      `## Previous Evaluation\n\n${previousEvaluation || '—'}`,
      `## My Question\n\n${question}`,
    ].filter(Boolean);

    const result = await callAI(systemPrompt, userParts.join('\n\n'));

    // Append follow-up to living dossier
    await appendToDossier(id, `## Follow-ups\n### ${datePrefix()} — "${question}"\n${result}`);

    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Decisions
app.get('/api/decisions', async (req, res) => {
  const content = await readMarkdown(join(DATA, 'decisions.md'));
  res.json({ content: content || '# Decision Log\n\n| Date | Company | Role | Scanner | Decision | Outcome |\n|------|---------|------|---------|----------|---------|\n' });
});

app.post('/api/decisions', async (req, res) => {
  try {
    const { company, role, scannerAction, decision } = req.body;
    let content = await readMarkdown(join(DATA, 'decisions.md'));

    if (!content) {
      content = '# Decision Log\n\n| Date | Company | Role | Scanner | Decision | Outcome |\n|------|---------|------|---------|----------|---------|\n';
    }

    const row = `| ${datePrefix()} | ${company} | ${role} | ${scannerAction} | ${decision} | — |\n`;
    content += row;

    await writeFile(join(DATA, 'decisions.md'), content);

    // Update in-memory decisions index
    const id = jobId(company, role);
    decisionsIndex[id] = decision;

    // Append decision to living dossier
    await appendToDossier(id, `## User Decision\n**Decision:** ${decision}\n**Date:** ${datePrefix()}`);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  const scannerPrompt = await readMarkdown(SCANNER_PROMPT);
  const evalSystem = await readMarkdown(EVALUATOR_SYSTEM);

  res.json({
    ...settings,
    apiKeyConfigured: !!(API_KEY && API_KEY !== 'sk-ant-your-key-here'),
    prompts: {
      scanner: scannerPrompt ? scannerPrompt.substring(0, 200) + '...' : null,
      evaluator: evalSystem ? evalSystem.substring(0, 200) + '...' : null,
    },
  });
});

app.put('/api/settings', async (req, res) => {
  const oldFingerprint = searchConfigFingerprint(settings.searchConfig);
  Object.assign(settings, req.body);

  // Auto-generate search queries from structured config
  if (settings.searchConfig) {
    settings.searchQueries = generateSearchQueries(settings.searchConfig);
  }

  const newFingerprint = searchConfigFingerprint(settings.searchConfig);
  const searchConfigChanged = oldFingerprint && newFingerprint && oldFingerprint !== newFingerprint;

  await saveSettings();
  res.json({ ok: true, searchConfigChanged, resetSuggested: searchConfigChanged });
});

// Generate search queries from structured config (title × location cross-product)
function generateSearchQueries(config) {
  const titles = config.titles?.values || [];
  const locations = config.locations || [];

  if (titles.length === 0) return [];

  // If no locations, use empty string (lets job board use default)
  const locs = locations.length > 0 ? locations : [''];

  const queries = [];
  for (const title of titles) {
    for (const loc of locs) {
      queries.push({
        query: title,
        location: loc,
        sources: ['linkedin', 'indeed'],
      });
    }
  }

  // Cap at 12 queries to avoid rate limit issues
  return queries.slice(0, 12);
}

// --- AI Configuration ---

// Multi-provider AI call — routes to Anthropic, OpenAI, or Gemini
async function callAIProvider(provider, key, model, systemPrompt, userMessage) {
  if (provider === 'anthropic') {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: model || 'claude-sonnet-4-20250514', max_tokens: 4096, temperature: 0.2, system: systemPrompt, messages: [{ role: 'user', content: userMessage }] }),
    });
    if (!resp.ok) {
      if (resp.status === 401) throw new Error('Invalid API key');
      if (resp.status === 429) throw new Error('Rate limited — try again in a minute');
      throw new Error(`API error (${resp.status})`);
    }
    const data = await resp.json();
    return data.content[0].text;
  }

  if (provider === 'openai') {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: model || 'gpt-5.4', max_tokens: 4096, temperature: 0.2, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }] }),
    });
    if (!resp.ok) {
      if (resp.status === 401) throw new Error('Invalid API key');
      if (resp.status === 429) throw new Error('Rate limited — try again in a minute');
      throw new Error(`API error (${resp.status})`);
    }
    const data = await resp.json();
    return data.choices[0].message.content;
  }

  if (provider === 'gemini') {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-3-flash-preview'}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ parts: [{ text: userMessage }] }], generationConfig: { temperature: 0.2 } }),
    });
    if (!resp.ok) {
      if (resp.status === 400 || resp.status === 403) throw new Error('Invalid API key');
      if (resp.status === 429) throw new Error('Rate limited — try again in a minute');
      throw new Error(`API error (${resp.status})`);
    }
    const data = await resp.json();
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

const AI_MODELS = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', default: true },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4 (most capable)' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (faster, cheaper)' },
  ],
  openai: [
    { id: 'gpt-5.4', name: 'GPT-5.4', default: true },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini (faster, cheaper)' },
    { id: 'gpt-4o', name: 'GPT-4o (legacy)' },
  ],
  gemini: [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (preview)', default: true },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (preview, most capable)' },
  ],
};

// Test AI connection — does NOT persist
app.post('/api/ai/test', async (req, res) => {
  try {
    const { provider, key } = req.body;
    if (!provider || !key) return res.status(400).json({ error: 'Provider and key required' });

    await callAIProvider(provider, key, null, 'Respond with exactly: ok', 'ping');
    res.json({ success: true, models: AI_MODELS[provider] || [] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Save AI configuration
app.post('/api/ai/configure', async (req, res) => {
  try {
    const { provider, key, model } = req.body;
    settings.ai = { provider, key, model };
    await saveSettings();

    // Update in-memory API_KEY so callAI works immediately
    if (provider === 'anthropic') {
      API_KEY = key;
      process.env.ANTHROPIC_API_KEY = key;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get AI status (no key exposed)
app.get('/api/ai/status', (req, res) => {
  const ai = settings.ai || {};
  res.json({
    configured: !!(ai.provider && ai.key),
    provider: ai.provider || null,
    model: ai.model || null,
  });
});

// Synthesize profile from form data
app.post('/api/ai/synthesize', async (req, res) => {
  try {
    const { provider, key, model, formData } = req.body;
    if (!provider || !key) return res.status(400).json({ error: 'AI not configured' });

    const systemPrompt = `You are a career profile writer for a job search tool called Pursuit. Your job is to synthesize a user's raw profile data into a polished, first-person professional profile in Markdown format.

Rules:
- Write in first person
- Be specific and concrete, not generic
- Marry the user's own identity sentence (their voice) with the structured data
- Organize into clear sections: Professional Identity, Experience & Background, What I'm Looking For, Non-Negotiables
- Keep it concise — this is a working document, not a resume
- If they provided an identity sentence, use it as the opening anchor and expand from there
- If they didn't provide one, synthesize one from their role + level + domain`;

    const userMessage = `Here is the raw profile data. Synthesize this into a polished Pursuit profile:

Identity sentence: ${formData.identity || '(not provided)'}
Role: ${formData.role || '(not provided)'}
Current level: ${formData.level || '(not provided)'}
Target level: ${formData.targetLevel || '(not provided)'}
Total years of experience: ${formData.years || '(not provided)'}
Years in target role: ${formData.yearsInRole || '(not provided)'}
Previous roles: ${formData.prevRoles || '(none)'}
Compensation range: ${formData.compMin || '?'} - ${formData.compMax || '?'} ${formData.compFlexible ? '(flexible)' : '(firm)'}
Location: ${formData.location || '(not provided)'}
Work style: ${(formData.workStyle || []).join(', ') || '(not specified)'}
Non-negotiables: ${formData.nonneg || '(none)'}

Job titles interested in: ${(formData.titles || []).join(', ') || '(none)'}
Industries: ${(formData.industries || []).join(', ') || '(any)'}
Domains: ${(formData.domains || []).join(', ') || '(any)'}
Target levels: ${(formData.levels || []).join(', ') || '(any)'}
Company size preference: ${(formData.companySize || []).join(', ') || '(any)'}`;

    const profile = await callAIProvider(provider, key, model, systemPrompt, userMessage);
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Setup Flow ---

// Get setup state (has the user completed setup?)
app.get('/api/setup/status', async (req, res) => {
  const profile = await readMarkdown(join(DATA, 'profile.md'));
  const refs = await readdir(join(DATA, 'references')).catch(() => []);
  const prefs = await readMarkdown(join(DATA, 'preferences.md'));

  const hasProfile = profile && !profile.includes('Customize This Section') && !profile.includes('<!-- Example:');
  const hasReferences = refs.filter(f => f.endsWith('.md')).length >= 2;
  const hasPreferences = !!prefs;

  // Setup is complete if either: (a) old flow: profile + references, or (b) new flow: explicit flag
  const setupComplete = settings.setupComplete || (hasProfile && hasReferences);

  res.json({
    setupComplete,
    hasProfile,
    hasReferences,
    referenceCount: refs.filter(f => f.endsWith('.md')).length,
    hasPreferences,
    steps: SETUP_STEPS ? SETUP_STEPS.map(s => ({ id: s.id, action: s.action })) : [],
  });
});

// Reset profile and restart onboarding
app.post('/api/setup/reset', async (req, res) => {
  try {
    // Clear profile
    const profilePath = join(DATA, 'profile.md');
    try { await writeFile(profilePath, ''); } catch {}

    // Reset setup flag
    settings.setupComplete = false;
    await saveSettings();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Force reset jobs/dedup data (#68)
app.post('/api/jobs/reset', async (req, res) => {
  try {
    const {
      clearSeenJobs = true,
      clearRawJobs = false,
      clearScans = false,
      clearDossiers = false,
    } = req.body || {};

    const cleared = { seenJobs: 0, rawJobFiles: 0, scanFiles: 0, dossierFiles: 0 };

    if (clearSeenJobs) {
      const seenPath = join(DATA, '.seen-jobs.json');
      try {
        const content = await readFile(seenPath, 'utf-8');
        const seen = JSON.parse(content);
        cleared.seenJobs = Object.keys(seen).length;
        await writeFile(seenPath, '{}');
      } catch { /* file doesn't exist */ }
    }

    if (clearRawJobs) {
      cleared.rawJobFiles = await clearDirectory(join(DATA, 'jobs'));
    }

    if (clearScans) {
      cleared.scanFiles = await clearDirectory(join(DATA, 'scans'));
    }

    if (clearDossiers) {
      cleared.dossierFiles = await clearDirectory(join(DATA, 'dossiers'));
    }

    // Rebuild in-memory decisions index if scans were cleared
    if (clearScans) {
      decisionsIndex = {};
      await loadDecisionsIndex();
    }

    res.json({ ok: true, cleared });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark setup as complete (new static form flow)
app.post('/api/setup/mark-complete', async (req, res) => {
  settings.setupComplete = true;
  await saveSettings();
  res.json({ ok: true });
});

// Chat endpoint for setup conversation
app.post('/api/setup/chat', async (req, res) => {
  try {
    const { stepId, userMessage, conversationHistory } = req.body;

    const step = SETUP_STEPS.find(s => s.id === stepId);
    if (!step) return res.status(400).json({ error: 'Invalid step' });

    let systemPrompt = step.systemPrompt;
    let userMsg = userMessage;

    // For synthesis step, build context from all previous conversations
    if (step.action === 'synthesize') {
      userMsg = buildSynthesisContext(conversationHistory || {});
    }

    const response = await callAI(systemPrompt, userMsg);

    // Extract any structured data from response
    const extracted = extractJSON(response);

    res.json({
      response,
      extracted,
      stepId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save the synthesized profile from setup
app.post('/api/setup/save-profile', async (req, res) => {
  try {
    const { profileText } = req.body;
    if (!profileText) return res.status(400).json({ error: 'Profile text required' });

    const profile = extractProfileMarkdown(profileText);
    await writeFile(join(DATA, 'profile.md'), profile);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save search queries from setup
app.post('/api/setup/save-queries', async (req, res) => {
  try {
    const { queries } = req.body;
    if (queries) {
      settings.searchQueries = queries;
      await saveSettings();
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Reference Examples ---

// Save a reference example (loved/hated/maybe)
app.post('/api/references', async (req, res) => {
  try {
    const { type, listing, reasoning, extracted } = req.body;
    if (!type || !listing) return res.status(400).json({ error: 'Type and listing required' });

    const refsDir = join(DATA, 'references');
    await ensureDir(refsDir);

    const filename = `${type}-${datePrefix()}-${Date.now()}.md`;
    const content = [
      `# Reference: ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      ``,
      `**Type:** ${type}`,
      `**Date:** ${datePrefix()}`,
      ``,
      `## Job Listing`,
      ``,
      listing,
      ``,
      `## Why I ${type === 'loved' ? 'Love' : type === 'hated' ? 'Hate' : 'Am Torn On'} This`,
      ``,
      reasoning || '',
      ``,
      extracted ? `## Extracted Signals\n\n\`\`\`json\n${JSON.stringify(extracted, null, 2)}\n\`\`\`` : '',
    ].join('\n');

    await writeFile(join(refsDir, filename), content);
    res.json({ ok: true, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List reference examples
app.get('/api/references', async (req, res) => {
  try {
    const refsDir = join(DATA, 'references');
    const files = await readdir(refsDir).catch(() => []);
    const refs = [];

    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(refsDir, file), 'utf-8');
      const typeMatch = file.match(/^(loved|hated|maybe)/);
      refs.push({
        filename: file,
        type: typeMatch ? typeMatch[1] : 'unknown',
        preview: content.substring(0, 200),
      });
    }

    res.json({ references: refs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- User Preferences ---

app.get('/api/preferences', async (req, res) => {
  const content = await readMarkdown(join(DATA, 'preferences.md'));
  if (!content) {
    // Return defaults
    return res.json({
      content: null,
      defaults: {
        fetchTime: '08:00',
        maxFetchesPerDay: 3,
        notificationStyle: 'nudge',
        theme: 'light',
      },
    });
  }
  res.json({ content });
});

app.put('/api/preferences', async (req, res) => {
  try {
    const { content } = req.body;
    await writeFile(join(DATA, 'preferences.md'), content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual job input (paste listings without scanning)
app.post('/api/jobs/manual', async (req, res) => {
  try {
    const { listings } = req.body;
    if (!listings) return res.status(400).json({ error: 'Listings required' });

    // Convert free-text pasted listings into structured format for parseRawJobListings
    const blocks = listings.split(/^---$/m).filter(b => b.trim());
    const structured = [];

    for (const block of blocks) {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) continue;

      // First line: "Role at Company, Location" or "Role - Specialty at Company, Location"
      const firstLine = lines[0];
      let title = '', company = '', location = '';
      const atMatch = firstLine.match(/^(.+?)\s+at\s+(.+?)(?:,\s*(.+))?$/i);
      if (atMatch) {
        title = atMatch[1].trim();
        company = atMatch[2].trim();
        location = atMatch[3]?.trim() || '';
      } else {
        // Fallback: entire first line as title
        title = firstLine;
        company = 'Unknown';
      }

      // Find URL in remaining lines
      let link = '';
      const descLines = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].match(/^https?:\/\//)) {
          link = lines[i];
        } else {
          descLines.push(lines[i]);
        }
      }

      let entry = `Title: ${title}\nCompany: ${company}`;
      if (location) entry += `\nLocation: ${location}`;
      if (link) entry += `\nLink: ${link}`;
      entry += `\nSource: Manual`;
      if (descLines.length) entry += `\nSummary: ${descLines.join(' ')}`;
      structured.push(entry);
    }

    const content = structured.join('\n---\n');
    const filename = `${datePrefix()}-manual.md`;
    await writeFile(join(DATA, 'jobs', filename), content);
    res.json({ ok: true, filename, count: structured.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch — trigger Puppeteer to browse job boards
// Max 3 fetches per day. Jobs are posted when they're posted.
let fetchInProgress = false;
const MAX_DAILY_FETCHES = 3;

const fetchNudges = [
  // After fetch 1 — encouraging
  "Fresh batch in. Now pick the 2-3 worth your time and go deep on those.",
  // After fetch 2 — gentle reminder
  "Second scan today. Remember: the best opportunities reward depth, not refresh rate.",
  // After fetch 3 — the limit, with warmth
  "Last scan for today. You've seen what's out there — now go pursue something. The board isn't going anywhere overnight.",
];

const fetchLimitMessages = [
  "You've already scanned 3 times today. Jobs are posted when they're posted — refreshing won't make new ones appear. Go work on an application instead.",
  "Three's the limit. LinkedIn isn't a slot machine. Go write that outreach message you've been putting off.",
  "Nope, 3 scans is plenty. Your energy is better spent on one great application than another round of browsing.",
  "The job board will survive without you for a few hours. Go do something that moves a real opportunity forward.",
];

function getTodaysFetchCount() {
  const today = datePrefix();
  const fetches = settings.fetchHistory || [];
  return fetches.filter(f => f.startsWith(today)).length;
}

function recordFetch() {
  if (!settings.fetchHistory) settings.fetchHistory = [];
  settings.fetchHistory.push(new Date().toISOString());
  // Keep only last 7 days of history
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  settings.fetchHistory = settings.fetchHistory.filter(f => new Date(f).getTime() > weekAgo);
}

function checkFetchLimit(res) {
  const count = getTodaysFetchCount();
  if (count >= MAX_DAILY_FETCHES) {
    const msg = fetchLimitMessages[Math.floor(Math.random() * fetchLimitMessages.length)];
    return res.status(429).json({
      error: msg,
      fetchesToday: count,
      limit: MAX_DAILY_FETCHES,
      nudge: true,
    });
  }
  return null; // OK to proceed
}

app.get('/api/fetch/status', (req, res) => {
  const count = getTodaysFetchCount();
  res.json({
    fetchesToday: count,
    remaining: Math.max(0, MAX_DAILY_FETCHES - count),
    limit: MAX_DAILY_FETCHES,
    inProgress: fetchInProgress,
  });
});

app.post('/api/fetch', async (req, res) => {
  if (fetchInProgress) {
    return res.status(409).json({ error: 'Fetch already in progress' });
  }

  const limitResponse = checkFetchLimit(res);
  if (limitResponse) return limitResponse;

  const searchQueries = settings.searchQueries || [];
  if (searchQueries.length === 0) {
    return res.status(400).json({
      error: 'No search queries configured. Add them in Settings.',
    });
  }

  fetchInProgress = true;
  const fetchNumber = getTodaysFetchCount(); // 0-indexed before recording

  try {
    const result = await fetchJobs(searchQueries, {
      dataDir: DATA,
      headless: true,
      maxPages: 3,
      getSummaries: true,
      expirationDays: settings.dedupeExpirationDays || 7,
    });

    // Only count successful fetches
    recordFetch();
    settings.lastFetchTime = new Date().toISOString();
    await saveSettings();

    fetchInProgress = false;
    res.json({
      ok: true,
      totalFetched: result.totalFetched,
      files: result.files,
      fetchesToday: fetchNumber + 1,
      remaining: MAX_DAILY_FETCHES - fetchNumber - 1,
      nudge: fetchNudges[fetchNumber] || fetchNudges[fetchNudges.length - 1],
    });
  } catch (err) {
    fetchInProgress = false;
    res.status(500).json({ error: `Fetch failed: ${err.message}` });
  }
});

// Fetch + Scan — fetch jobs then immediately scan them
app.post('/api/fetch-and-scan', async (req, res) => {
  if (fetchInProgress) {
    return res.status(409).json({ error: 'Fetch already in progress' });
  }

  const limitResponse = checkFetchLimit(res);
  if (limitResponse) return limitResponse;

  const searchQueries = settings.searchQueries || [];
  const watchlist = settings.searchConfig?.watchlist || [];
  const titleFilters = settings.searchConfig?.titles?.values || [];

  if (searchQueries.length === 0 && watchlist.length === 0) {
    return res.status(400).json({
      error: 'No search queries or company watchlist configured. Add them in Settings.',
    });
  }

  fetchInProgress = true;
  const fetchNumber = getTodaysFetchCount();

  try {
    // Step 0: Fetch from ATS boards (always runs if watchlist configured)
    let atsJobsList = [];
    if (watchlist.length > 0) {
      atsJobsList = await fetchFromAtsIndex(watchlist, titleFilters);
      if (atsJobsList.length > 0) {
        const atsMarkdown = formatAtsJobsMarkdown(atsJobsList);
        const atsFilename = `${datePrefix()}-ats-index.md`;
        await writeFile(join(DATA, 'jobs', atsFilename), atsMarkdown);
      }
    }

    // Step 1: Fetch from LinkedIn/Indeed via Puppeteer (if enabled and queries exist)
    let result = { totalFetched: 0, newJobs: [], files: [] };
    if (settings.useBrowserScraping !== false && searchQueries.length > 0) {
      result = await fetchJobs(searchQueries, {
        dataDir: DATA,
        headless: true,
        maxPages: 3,
        getSummaries: true,
        expirationDays: settings.dedupeExpirationDays || 7,
      });
    }

    const totalFetched = result.totalFetched + atsJobsList.length;

    // Only count successful fetches
    recordFetch();
    settings.lastFetchTime = new Date().toISOString();
    await saveSettings();

    fetchInProgress = false;

    // Filter out dead jobs before scanning
    const liveJobs = [...result.newJobs, ...atsJobsList].filter(j => j.availability?.status !== 'dead');
    const deadCount = (result.newJobs.length + atsJobsList.length) - liveJobs.length;

    if (liveJobs.length === 0) {
      return res.json({ ok: true, totalFetched, deadFiltered: deadCount, message: deadCount > 0 ? `Found ${totalFetched} jobs but all appear expired.` : 'No new jobs found.' });
    }

    // Step 2: Read ALL fetched jobs (browser + ATS) and scan them
    let allListings = '';
    // Browser job files
    for (const file of result.files) {
      const content = await readFile(join(DATA, 'jobs', file), 'utf-8');
      allListings += content + '\n\n';
    }
    // ATS job file (if written)
    if (atsJobsList.length > 0) {
      const atsFile = `${datePrefix()}-ats-index.md`;
      try {
        const atsContent = await readFile(join(DATA, 'jobs', atsFile), 'utf-8');
        allListings += atsContent + '\n\n';
      } catch { /* file may not exist if no ATS jobs */ }
    }

    const profile = await readMarkdown(join(DATA, 'profile.md'));
    if (!profile) {
      return res.status(400).json({
        error: 'Jobs fetched but not scanned — no profile set.',
        totalFetched: result.totalFetched,
        files: result.files,
      });
    }

    const scannerPrompt = await readMarkdown(SCANNER_PROMPT);
    const aspirationContext = buildAspirationContext();
    const userMessage = `## My Profile\n\n${profile}${aspirationContext}\n\n## Job Listings\n\n${allListings}`;
    const scanResult = await callAI(scannerPrompt, userMessage);

    const scanFilename = `${datePrefix()}-auto-scan.md`;
    await writeFile(join(DATA, 'scans', scanFilename), scanResult);

    const parsed = parseScannerOutput(scanResult);

    // Create living dossier per CONSIDER job (same as /api/scan)
    for (const job of (parsed.jobs || [])) {
      if (job.action && ['CONSIDER', 'EVALUATE'].includes(job.action.toUpperCase())) {
        job.id = job.id || jobId(job.company, job.role);
        await createDossier(job);
        job.dossierFile = `${job.id}.md`;
      }
    }

    fetchInProgress = false;
    res.json({
      ok: true,
      totalFetched,
      scanFile: scanFilename,
      fetchesToday: fetchNumber + 1,
      remaining: MAX_DAILY_FETCHES - fetchNumber - 1,
      nudge: fetchNudges[fetchNumber] || fetchNudges[fetchNudges.length - 1],
      ...parsed,
    });
  } catch (err) {
    fetchInProgress = false;
    res.status(500).json({ error: err.message });
  }
});

// --- Start ---

function runSystemChecks() {
  systemChecks.chromePath = findChromeExecutable();
  systemChecks.chromeProfilePath = findChromeProfile();
}

async function start() {
  await ensureDataDirs();
  await loadSettings();
  await loadDecisionsIndex();
  runSystemChecks();

  // Restore API key from settings if not in env (fixes #59)
  if ((!API_KEY || API_KEY === 'sk-ant-your-key-here') && settings.ai?.key) {
    API_KEY = settings.ai.key;
    process.env.ANTHROPIC_API_KEY = settings.ai.key;
    console.log(`  ✓  API key loaded from settings (${settings.ai.provider || 'anthropic'})`);
  }

  app.listen(PORT, () => {
    console.log(`\n  Pursuit Dashboard running at http://localhost:${PORT}\n`);
    if (!API_KEY || API_KEY === 'sk-ant-your-key-here') {
      console.log('  ⚠  No API key configured. Add one via Settings in the UI or copy .env.example to .env.');
    }
    if (!systemChecks.chromePath) {
      console.log('  ⚠  Chrome/Chromium not found. Find Jobs will not work.');
      console.log('    Install Chrome or set CHROME_PATH in .env.');
    }
    if (!systemChecks.chromeProfilePath) {
      console.log('  ⚠  No Chrome profile found. Fetch will use a temporary profile (no saved logins).');
    }
    console.log('');
  });
}

start();
