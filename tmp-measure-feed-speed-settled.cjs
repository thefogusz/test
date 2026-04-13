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
  page.on('request', (req) => {
    if (req.url().includes('/api/twitter') || req.url().includes('/api/xai') || req.url().includes('/api/rss')) {
      requests.push({ url: req.url(), method: req.method(), start: performance.now() });
    }
  });
  page.on('response', (res) => {
    const item = requests.find((r) => r.url === res.url() && !r.end);
    if (item) {
      item.end = performance.now();
      item.status = res.status();
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const syncButton = page.locator('header .btn-pill.primary').first();
  await syncButton.click();
  const clickStart = performance.now();

  let firstCardMs = null;
  try {
    await page.locator('.feed-card').first().waitFor({ state: 'visible', timeout: 30000 });
    firstCardMs = performance.now() - clickStart;
  } catch (_) {}

  let settledMs = null;
  let finalStatus = '';
  for (let i = 0; i < 120; i++) {
    const statusText = ((await page.locator('.status-toast').textContent().catch(() => '')) || '').trim();
    finalStatus = statusText;
    const xaiInFlight = requests.some((r) => r.url.includes('/api/xai/') && !r.end);
    if (!xaiInFlight && statusText && !statusText.includes('กำลัง')) {
      settledMs = performance.now() - clickStart;
      break;
    }
    await page.waitForTimeout(500);
  }

  const cardCount = await page.locator('.feed-card').count();
  console.log(JSON.stringify({
    clickToFirstCardMs: firstCardMs === null ? null : Math.round(firstCardMs),
    clickToSettledMs: settledMs === null ? null : Math.round(settledMs),
    cardCount,
    finalStatus,
    xaiDurations: requests.filter(r => r.url.includes('/api/xai/') && r.end).map(r => Math.round(r.end - r.start)),
    twitterDurations: requests.filter(r => r.url.includes('/api/twitter/') && r.end).map(r => Math.round(r.end - r.start)),
  }, null, 2));

  await browser.close();
})();
