/**
 * Pursuit — Puppeteer Auto-Browse
 *
 * Uses the user's own Chrome profile (logged-in session) to browse
 * LinkedIn Jobs and Indeed. Personal use, once a day, like a human
 * checking job boards over morning coffee.
 *
 * Usage:
 *   import { fetchJobs } from './browser.js';
 *   const results = await fetchJobs(searchQueries, options);
 */

import puppeteer from 'puppeteer-core';
import { writeFile, readFile, mkdir, access } from 'node:fs/promises';
import { accessSync as accessSyncFs } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

// --- Helpers ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function datePrefix() {
  return new Date().toISOString().split('T')[0];
}

function slugify(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 60);
}

function dedupeKey(company, title) {
  const raw = `${company}|${title}`.toLowerCase().trim();
  return createHash('md5').update(raw).digest('hex').substring(0, 12);
}

/**
 * Find the user's default Chrome profile directory.
 * Puppeteer will launch Chrome with this profile so the user
 * is already logged into LinkedIn, Indeed, etc.
 */
function findChromeProfile() {
  const home = homedir();
  const paths = [
    // macOS
    join(home, 'Library', 'Application Support', 'Google', 'Chrome'),
    // Linux
    join(home, '.config', 'google-chrome'),
    join(home, '.config', 'chromium'),
    // Windows (via WSL or native)
    join(home, 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
  ];

  return paths.find(p => {
    try { accessSyncFs(p); return true; } catch { return false; }
  }) || null;
}

/**
 * Find the Chrome/Chromium executable on the system.
 */
function findChromeExecutable() {
  const candidates = [
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Common Linux paths
    '/opt/google/chrome/chrome',
  ];

  for (const p of candidates) {
    try { accessSyncFs(p); return p; } catch { /* continue */ }
  }

  // Try `which` as fallback
  try {
    return execFileSync('which', ['google-chrome'], { encoding: 'utf-8' }).trim();
  } catch { /* ignore */ }
  try {
    return execFileSync('which', ['chromium'], { encoding: 'utf-8' }).trim();
  } catch { /* ignore */ }

  return null;
}

/**
 * Launch a browser instance.
 * Uses puppeteer-core with the user's installed Chrome + profile.
 * This means the user is logged into LinkedIn/Indeed already.
 */
async function launchBrowser(options = {}) {
  const executablePath = options.executablePath
    || process.env.CHROME_PATH
    || findChromeExecutable();

  if (!executablePath) {
    throw new Error(
      'Chrome not found. Install Chrome/Chromium, or set CHROME_PATH in .env.\n' +
      '  macOS: brew install --cask google-chrome\n' +
      '  Linux: sudo apt install chromium-browser'
    );
  }

  const chromeProfile = options.chromeProfile || findChromeProfile();

  const launchOptions = {
    executablePath,
    headless: options.headless !== false ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1280, height: 900 },
  };

  // Use the user's Chrome profile for logged-in sessions.
  // Note: Chrome can't share a profile with a running instance,
  // so if Chrome is open, Puppeteer will use a temp profile instead.
  if (chromeProfile) {
    launchOptions.userDataDir = chromeProfile;
  }

  return puppeteer.launch(launchOptions);
}

// --- LinkedIn Jobs Scraper ---

async function scrapeLinkedInJobs(page, query, location, maxPages = 3) {
  const jobs = [];
  const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&sortBy=DD`;

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000 + Math.random() * 2000); // Human-like delay

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      // Scroll to load lazy content
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);

      // Extract job cards
      const pageJobs = await page.evaluate(() => {
        const cards = document.querySelectorAll('.job-search-card, .base-card, [data-entity-urn*="jobPosting"]');
        return Array.from(cards).map(card => {
          const titleEl = card.querySelector('.base-search-card__title, h3, [class*="title"]');
          const companyEl = card.querySelector('.base-search-card__subtitle, h4, [class*="company"]');
          const locationEl = card.querySelector('.job-search-card__location, [class*="location"]');
          const dateEl = card.querySelector('time, [class*="date"], [class*="posted"]');
          const linkEl = card.querySelector('a[href*="/jobs/"]');

          return {
            title: titleEl?.textContent?.trim() || '',
            company: companyEl?.textContent?.trim() || '',
            location: locationEl?.textContent?.trim() || '',
            posted: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || 'Unknown',
            link: linkEl?.href || '',
            source: 'LinkedIn',
          };
        }).filter(j => j.title && j.company);
      });

      jobs.push(...pageJobs);

      // Rate limit: wait before next page
      if (pageNum < maxPages - 1) {
        // Try to click "next" or scroll for more
        const nextBtn = await page.$('button[aria-label="Next"], .artdeco-pagination__button--next');
        if (nextBtn) {
          await nextBtn.click();
          await sleep(3000 + Math.random() * 2000);
        } else {
          break; // No more pages
        }
      }
    }
  } catch (err) {
    console.error(`LinkedIn scrape error: ${err.message}`);
    // Return whatever we got
  }

  return jobs;
}

// --- Indeed Scraper ---

async function scrapeIndeedJobs(page, query, location, maxPages = 3) {
  const jobs = [];
  const searchUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&sort=date`;

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000 + Math.random() * 2000);

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      // Extract job cards
      const pageJobs = await page.evaluate(() => {
        const cards = document.querySelectorAll('.job_seen_beacon, .jobsearch-ResultsList .result, [data-jk]');
        return Array.from(cards).map(card => {
          const titleEl = card.querySelector('.jobTitle a, h2 a, [class*="Title"] a');
          const companyEl = card.querySelector('[data-testid="company-name"], .companyName, [class*="company"]');
          const locationEl = card.querySelector('[data-testid="text-location"], .companyLocation, [class*="location"]');
          const dateEl = card.querySelector('.date, [class*="date"], .new');
          const linkEl = card.querySelector('a[href*="/viewjob"], a[id^="job_"]');

          let link = linkEl?.href || '';
          if (link && !link.startsWith('http')) {
            link = `https://www.indeed.com${link}`;
          }

          return {
            title: titleEl?.textContent?.trim() || '',
            company: companyEl?.textContent?.trim() || '',
            location: locationEl?.textContent?.trim() || '',
            posted: dateEl?.textContent?.trim() || 'Unknown',
            link,
            source: 'Indeed',
          };
        }).filter(j => j.title && j.company);
      });

      jobs.push(...pageJobs);

      // Rate limit
      if (pageNum < maxPages - 1) {
        const nextBtn = await page.$('a[data-testid="pagination-page-next"], .np[data-pp]');
        if (nextBtn) {
          await nextBtn.click();
          await sleep(3000 + Math.random() * 2000);
        } else {
          break;
        }
      }
    }
  } catch (err) {
    console.error(`Indeed scrape error: ${err.message}`);
  }

  return jobs;
}

// --- Get JD Summary for a Single Job ---

async function getJobSummary(page, job) {
  if (!job.link) return job;

  try {
    await page.goto(job.link, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1500);

    const summary = await page.evaluate(() => {
      // Try common JD containers
      const selectors = [
        '.show-more-less-html__markup',     // LinkedIn
        '#jobDescriptionText',               // Indeed
        '[class*="description"]',
        '[class*="job-details"]',
        'article',
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 50) {
          // Get first ~500 chars as summary
          const text = el.textContent.trim();
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          return lines.slice(0, 15).join('\n');
        }
      }
      return '';
    });

    job.summary = summary;
  } catch {
    // Failed to get summary, that's OK
  }

  return job;
}

// --- Deduplication ---

async function loadSeenJobs(dataDir) {
  const seenPath = join(dataDir, '.seen-jobs.json');
  try {
    const content = await readFile(seenPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveSeenJobs(dataDir, seen) {
  const seenPath = join(dataDir, '.seen-jobs.json');
  await writeFile(seenPath, JSON.stringify(seen, null, 2));
}

function deduplicateJobs(jobs, seen) {
  const newJobs = [];
  const updatedSeen = { ...seen };

  for (const job of jobs) {
    const key = dedupeKey(job.company, job.title);
    if (!updatedSeen[key]) {
      updatedSeen[key] = {
        date: new Date().toISOString(),
        company: job.company,
        title: job.title,
      };
      newJobs.push(job);
    }
  }

  return { newJobs, updatedSeen };
}

// --- Format as Markdown ---

function formatJobsMarkdown(jobs, query) {
  const lines = [
    `# Fetched Jobs — ${datePrefix()}`,
    '',
    `**Query:** ${query}`,
    `**Jobs found:** ${jobs.length}`,
    '',
  ];

  jobs.forEach((job, i) => {
    lines.push('---');
    lines.push(`**Job ${i + 1}**`);
    lines.push(`Title: ${job.title}`);
    lines.push(`Company: ${job.company}`);
    lines.push(`Location: ${job.location || 'Unknown'}`);
    lines.push(`Posted: ${job.posted || 'Unknown'}`);
    lines.push(`Source: ${job.source}`);
    if (job.summary) {
      lines.push(`Summary: ${job.summary}`);
    }
    if (job.link) {
      lines.push(`Link: ${job.link}`);
    }
    lines.push('');
  });

  lines.push('---');
  return lines.join('\n');
}

// --- Main Export ---

/**
 * Fetch jobs from configured sources.
 *
 * @param {Array<{query: string, location: string, sources: string[]}>} searches
 * @param {Object} options
 * @param {string} options.dataDir - Path to data/ directory
 * @param {boolean} options.headless - Run headless (default: true)
 * @param {number} options.maxPages - Max pages per source (default: 3)
 * @param {boolean} options.getSummaries - Fetch full JD summaries (slower, default: false)
 * @returns {Object} { totalFetched, newJobs, files }
 */
export async function fetchJobs(searches, options = {}) {
  const {
    dataDir = join(process.cwd(), '..', 'data'),
    headless = true,
    maxPages = 3,
    getSummaries = false,
  } = options;

  // Ensure jobs directory exists
  const jobsDir = join(dataDir, 'jobs');
  try { await access(jobsDir); } catch { await mkdir(jobsDir, { recursive: true }); }

  // Load seen jobs for dedup
  const seen = await loadSeenJobs(dataDir);
  let allNewJobs = [];
  const files = [];

  let browser;
  try {
    browser = await launchBrowser({ headless });
    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    for (const search of searches) {
      const { query, location = '', sources = ['linkedin', 'indeed'] } = search;
      let jobs = [];

      // Scrape each source
      for (const source of sources) {
        console.log(`  Fetching ${source}: "${query}" in "${location}"...`);

        if (source === 'linkedin') {
          const linkedinJobs = await scrapeLinkedInJobs(page, query, location, maxPages);
          jobs.push(...linkedinJobs);
        } else if (source === 'indeed') {
          const indeedJobs = await scrapeIndeedJobs(page, query, location, maxPages);
          jobs.push(...indeedJobs);
        }

        // Rate limit between sources
        await sleep(2000);
      }

      // Optionally fetch JD summaries (slower — visits each job page)
      if (getSummaries && jobs.length > 0) {
        console.log(`  Fetching summaries for ${Math.min(jobs.length, 10)} jobs...`);
        const toFetch = jobs.slice(0, 10); // Cap at 10 to be respectful
        for (const job of toFetch) {
          await getJobSummary(page, job);
          await sleep(2000 + Math.random() * 1000);
        }
      }

      // Deduplicate
      const { newJobs, updatedSeen } = deduplicateJobs(jobs, seen);
      Object.assign(seen, updatedSeen);

      if (newJobs.length > 0) {
        // Write to markdown
        const slug = slugify(query);
        let filename = `${datePrefix()}-${slug}.md`;

        // Avoid overwriting
        let counter = 1;
        while (true) {
          try {
            await access(join(jobsDir, filename));
            counter++;
            filename = `${datePrefix()}-${slug}-${counter}.md`;
          } catch {
            break;
          }
        }

        const markdown = formatJobsMarkdown(newJobs, query);
        await writeFile(join(jobsDir, filename), markdown);
        files.push(filename);
        allNewJobs.push(...newJobs);

        console.log(`  Found ${newJobs.length} new jobs for "${query}" → ${filename}`);
      } else {
        console.log(`  No new jobs for "${query}" (${jobs.length} total, all seen before)`);
      }
    }

    // Save updated seen list
    await saveSeenJobs(dataDir, seen);

  } catch (err) {
    console.error(`Browser error: ${err.message}`);
    throw err;
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }

  return {
    totalFetched: allNewJobs.length,
    newJobs: allNewJobs,
    files,
  };
}

/**
 * One-time setup: launch a visible browser so the user can log in
 * to LinkedIn/Indeed. After logging in, close the browser — the session
 * cookies are saved in the Puppeteer profile.
 */
export async function setupLogin(options = {}) {
  console.log('\n  Opening browser for login...');
  console.log('  Log into LinkedIn and Indeed, then close the browser.\n');

  const browser = await launchBrowser({ headless: false, ...options });
  const page = await browser.newPage();
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });

  // Keep browser open until user closes it
  return new Promise((resolve) => {
    browser.on('disconnected', () => {
      console.log('  Browser closed. Login session saved.\n');
      resolve();
    });
  });
}
