globalThis.performance = require('perf_hooks').performance;
const { chromium } = require('playwright');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://127.0.0.1:5173/test/';
const WATCHLIST = [
  { id: '1', username: 'elonmusk', name: 'Elon Musk', profile_image_url: '' },
  { id: '2', username: 'openai', name: 'OpenAI', profile_image_url: '' },
  { id: '3', username: 'techcrunch', name: 'TechCrunch', profile_image_url: '' },
  { id: '4', username: 'verge', name: 'The Verge', profile_image_url: '' },
  { id: '5', username: 'ycombinator', name: 'Y Combinator', profile_image_url: '' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript((watchlist) => {
    localStorage.clear();
    localStorage.setItem('foro_watchlist_v2', JSON.stringify(watchlist));
    localStorage.setItem('foro_active_plan_v1', JSON.stringify('admin'));
    localStorage.setItem('foro_active_view_v2', JSON.stringify('home'));
    localStorage.setItem('foro_content_tab_v1', JSON.stringify('search'));
    localStorage.setItem('foro_plus_access_v1', JSON.stringify(true));
    localStorage.setItem('foro_daily_usage_v1', JSON.stringify({ date: new Date().toISOString().slice(0,10), feed: 0, search: 0, generate: 0 }));
  }, WATCHLIST);

  const page = await context.newPage();
  const requests = [];
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('request', (req) => {
    if (req.url().includes('/api/twitter') || req.url().includes('/api/xai') || req.url().includes('/api/rss')) {
      requests.push({ url: req.url(), method: req.method(), start: performance.now() });
    }
  });
  page.on('response', async (res) => {
    const item = requests.find((r) => r.url === res.url() && !r.end);
    if (item) {
      item.end = performance.now();
      item.status = res.status();
    }
  });

  const navStart = performance.now();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const syncButton = page.locator('header .btn-pill.primary').first();
  await syncButton.waitFor({ state: 'visible', timeout: 15000 });

  const clickStart = performance.now();
  await syncButton.click();

  let firstCardMs = null;
  try {
    await page.locator('.feed-card').first().waitFor({ state: 'visible', timeout: 30000 });
    firstCardMs = performance.now() - clickStart;
  } catch (_) {}

  await page.waitForTimeout(4000);
  const statusText = ((await page.locator('.status-toast').textContent().catch(() => '')) || '').trim();
  const cardCount = await page.locator('.feed-card').count();

  const summary = {
    baseUrl: BASE_URL,
    navMs: Math.round(performance.now() - navStart),
    clickToFirstCardMs: firstCardMs === null ? null : Math.round(firstCardMs),
    totalObservedMs: Math.round(performance.now() - clickStart),
    cardCount,
    statusText,
    apiCalls: requests.filter(r => r.end).map(r => ({
      path: r.url.replace(/^https?:\/\/[^/]+/, ''),
      method: r.method,
      status: r.status,
      durationMs: Math.round(r.end - r.start),
    })),
    consoleErrors,
  };

  console.log(JSON.stringify(summary, null, 2));
  await page.screenshot({ path: 'D:/TEST/tmp-feed-speed-check.png', fullPage: true });
  await browser.close();
})();
