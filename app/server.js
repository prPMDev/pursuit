import 'dotenv/config';
import express from 'express';
import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { fetchJobs } from './browser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA = join(ROOT, 'data');
const SCANNER_PROMPT = join(ROOT, 'scanner', 'scanner-prompt.md');
const EVALUATOR_PROMPT = join(ROOT, 'evaluator', 'HLL-job-eval-prompt.md');
const PROFILE_TEMPLATE = join(ROOT, 'scanner', 'my-profile-template.md');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

// Settings stored in memory (persisted to data/settings.json)
let settings = {
  searchQueries: [],
  lastFetchTime: null,
};

// --- Helpers ---

async function ensureDir(dir) {
  try { await access(dir); } catch { await mkdir(dir, { recursive: true }); }
}

async function ensureDataDirs() {
  await ensureDir(join(DATA, 'jobs'));
  await ensureDir(join(DATA, 'scans'));
  await ensureDir(join(DATA, 'evaluations'));
}

async function readMarkdown(filepath) {
  try {
    return await readFile(filepath, 'utf-8');
  } catch {
    return null;
  }
}

function jobId(company, title) {
  const raw = `${company}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return raw.substring(0, 60);
}

function datePrefix() {
  return new Date().toISOString().split('T')[0];
}

async function callClaude(systemPrompt, userMessage) {
  if (!API_KEY || API_KEY === 'sk-ant-your-key-here') {
    throw new Error('ANTHROPIC_API_KEY not configured. Add it to app/.env');
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    if (resp.status === 401) throw new Error('Invalid API key');
    if (resp.status === 429) throw new Error('Rate limited — try again in a minute');
    throw new Error(`Anthropic API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  return data.content[0].text;
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

// --- Parse scanner output into structured jobs ---

function parseScannerOutput(markdown) {
  const jobs = [];
  const tableRegex = /\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
  let match;

  while ((match = tableRegex.exec(markdown)) !== null) {
    // Skip header row
    if (match[1] === '#' || match[2].includes('---')) continue;

    jobs.push({
      index: parseInt(match[1]),
      company: match[2].trim(),
      role: match[3].trim(),
      matchType: match[4].trim(),
      risk: match[5].trim(),
      action: match[6].trim(),
      keySignal: match[7].trim(),
    });
  }

  // Parse EVALUATE details
  const detailRegex = /###\s*\[(\d+)\]\s*(.+?)\n([\s\S]*?)(?=###\s*\[|## MAYBE|---\s*\nScanned|$)/g;
  while ((match = detailRegex.exec(markdown)) !== null) {
    const idx = parseInt(match[1]);
    const job = jobs.find(j => j.index === idx);
    if (job) {
      const detail = match[3];
      const whyMatch = detail.match(/\*\*Why:\*\*\s*(.+?)(?:\n|$)/);
      const riskMatch = detail.match(/\*\*Risk:\*\*\s*(.+?)(?:\n|$)/);
      const watchMatch = detail.match(/\*\*Watch for:\*\*\s*(.+?)(?:\n|$)/);
      const fenceMatch = detail.match(/\*\*On the fence because:\*\*\s*(.+?)(?:\n|$)/);

      if (whyMatch) job.narrative = whyMatch[1].trim();
      if (riskMatch) job.riskDetail = riskMatch[1].trim();
      if (watchMatch) job.watchFor = watchMatch[1].trim();
      if (fenceMatch) job.narrative = fenceMatch[1].trim();
    }
  }

  // Parse stats line
  const statsMatch = markdown.match(/Scanned:\s*(\d+)\s*\|\s*Evaluate:\s*(\d+)\s*\|\s*Maybe:\s*(\d+)\s*\|\s*Skipped:\s*(\d+)/);
  const stats = statsMatch ? {
    scanned: parseInt(statsMatch[1]),
    evaluate: parseInt(statsMatch[2]),
    maybe: parseInt(statsMatch[3]),
    skipped: parseInt(statsMatch[4]),
  } : null;

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
  if (job.action === 'EVALUATE') tags.push({ label: 'EVALUATE', color: 'green' });
  else if (job.action === 'MAYBE') tags.push({ label: 'MAYBE', color: 'amber' });
  else if (job.action === 'SKIP') tags.push({ label: 'SKIP', color: 'gray' });

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

// Jobs — list all jobs from scans
app.get('/api/jobs', async (req, res) => {
  try {
    const scanDir = join(DATA, 'scans');
    const files = await readdir(scanDir).catch(() => []);
    const allJobs = [];

    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(scanDir, file), 'utf-8');
      const parsed = parseScannerOutput(content);
      const profile = await readMarkdown(join(DATA, 'profile.md')) || '';

      for (const job of parsed.jobs) {
        job.id = jobId(job.company, job.role);
        job.scanFile = file;
        job.tags = extractTags(job, profile);
        job.source = file.includes('indeed') ? 'Indeed' : file.includes('linkedin') ? 'LinkedIn' : 'Manual';
        job.date = file.substring(0, 10); // YYYY-MM-DD prefix

        // Check if evaluation exists
        const evalFiles = await readdir(join(DATA, 'evaluations')).catch(() => []);
        const evalFile = evalFiles.find(f => f.includes(job.id));
        job.hasEvaluation = !!evalFile;
        job.evalFile = evalFile || null;

        allJobs.push(job);
      }
    }

    // Also include manually added jobs that haven't been scanned
    const jobDir = join(DATA, 'jobs');
    const jobFiles = await readdir(jobDir).catch(() => []);
    // Mark unscanned jobs
    for (const file of jobFiles.filter(f => f.endsWith('.md'))) {
      // These are raw fetched listings — they'll get scanned on next scan run
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

    const userMessage = `## My Profile\n\n${profile}\n\n## Job Listings\n\n${listings}`;
    const result = await callClaude(scannerPrompt, userMessage);

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
    res.json({ filename: finalName, ...parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Evaluate — run evaluator on a specific job
app.post('/api/evaluate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { jobDescription } = req.body;

    const profile = await readMarkdown(join(DATA, 'profile.md'));
    if (!profile) return res.status(400).json({ error: 'Profile not set' });

    const evalPrompt = await readMarkdown(EVALUATOR_PROMPT);
    if (!evalPrompt) return res.status(500).json({ error: 'Evaluator prompt not found' });

    const userMessage = jobDescription || `Please evaluate the job with ID: ${id}`;
    const result = await callClaude(evalPrompt, userMessage);

    const filename = `${datePrefix()}-${id}.md`;
    await writeFile(join(DATA, 'evaluations', filename), result);

    res.json({ filename, result });
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
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  // Include prompt info
  const scannerPrompt = await readMarkdown(SCANNER_PROMPT);
  const evalPrompt = await readMarkdown(EVALUATOR_PROMPT);

  res.json({
    ...settings,
    apiKeyConfigured: !!(API_KEY && API_KEY !== 'sk-ant-your-key-here'),
    prompts: {
      scanner: scannerPrompt ? scannerPrompt.substring(0, 200) + '...' : null,
      evaluator: evalPrompt ? evalPrompt.substring(0, 200) + '...' : null,
    },
  });
});

app.put('/api/settings', async (req, res) => {
  Object.assign(settings, req.body);
  await saveSettings();
  res.json({ ok: true });
});

// Manual job input (paste listings without scanning)
app.post('/api/jobs/manual', async (req, res) => {
  try {
    const { listings } = req.body;
    if (!listings) return res.status(400).json({ error: 'Listings required' });

    const filename = `${datePrefix()}-manual.md`;
    await writeFile(join(DATA, 'jobs', filename), listings);
    res.json({ ok: true, filename });
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
  recordFetch();
  settings.lastFetchTime = new Date().toISOString();
  await saveSettings();

  try {
    const result = await fetchJobs(searchQueries, {
      dataDir: DATA,
      headless: true,
      maxPages: 3,
      getSummaries: false,
    });

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
  if (searchQueries.length === 0) {
    return res.status(400).json({
      error: 'No search queries configured. Add them in Settings.',
    });
  }

  fetchInProgress = true;
  const fetchNumber = getTodaysFetchCount();
  recordFetch();
  settings.lastFetchTime = new Date().toISOString();
  await saveSettings();

  try {
    // Step 1: Fetch jobs
    const result = await fetchJobs(searchQueries, {
      dataDir: DATA,
      headless: true,
      maxPages: 3,
      getSummaries: false,
    });

    fetchInProgress = false;

    if (result.totalFetched === 0) {
      return res.json({ ok: true, totalFetched: 0, message: 'No new jobs found.' });
    }

    // Step 2: Read the fetched jobs and scan them
    let allListings = '';
    for (const file of result.files) {
      const content = await readFile(join(DATA, 'jobs', file), 'utf-8');
      allListings += content + '\n\n';
    }

    const profile = await readMarkdown(join(DATA, 'profile.md'));
    if (!profile) {
      return res.json({
        ok: true,
        totalFetched: result.totalFetched,
        message: 'Jobs fetched but not scanned — no profile set.',
        files: result.files,
      });
    }

    const scannerPrompt = await readMarkdown(SCANNER_PROMPT);
    const userMessage = `## My Profile\n\n${profile}\n\n## Job Listings\n\n${allListings}`;
    const scanResult = await callClaude(scannerPrompt, userMessage);

    const scanFilename = `${datePrefix()}-auto-scan.md`;
    await writeFile(join(DATA, 'scans', scanFilename), scanResult);

    const parsed = parseScannerOutput(scanResult);
    fetchInProgress = false;
    res.json({
      ok: true,
      totalFetched: result.totalFetched,
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

async function start() {
  await ensureDataDirs();
  await loadSettings();

  app.listen(PORT, () => {
    console.log(`\n  Pursuit Dashboard running at http://localhost:${PORT}\n`);
    if (!API_KEY || API_KEY === 'sk-ant-your-key-here') {
      console.log('  ⚠  No API key configured. Copy .env.example to .env and add your Anthropic key.\n');
    }
  });
}

start();
