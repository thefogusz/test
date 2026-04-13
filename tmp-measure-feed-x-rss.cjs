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

const RSS_SOURCES = {
  techcrunch: {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    siteUrl: 'https://techcrunch.com',
    description: 'ข่าว startup, tech, venture capital',
    frequency: '~30 บทความ/วัน',
    lang: 'en',
    type: 'news',
    topic: 'tech',
  },
  openaiBlog: {
    id: 'openai-blog',
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    siteUrl: 'https://openai.com',
    description: 'ประกาศและอัปเดตโมเดลโดยตรงจาก OpenAI',
    frequency: '~2 บทความ/สัปดาห์',
    lang: 'en',
    type: 'news',
    topic: 'ai',
  },
};

const SCENARIOS = [
  {
    name: 'x-only-postlist',
    postLists: [
      {
        id: 'list-x-only',
        name: 'X Only',
        color: '#4DA3FF',
        createdAt: new Date().toISOString(),
        members: ['elonmusk', 'openai', 'techcrunch', 'verge', 'ycombinator'],
      },
    ],
    activeListId: 'list-x-only',
    subscribedSources: [],
  },
  {
    name: 'x-plus-rss-postlist',
    postLists: [
      {
        id: 'list-x-rss',
        name: 'X + RSS',
        color: '#4DA3FF',
        createdAt: new Date().toISOString(),
        members: ['openai', 'techcrunch', 'verge', 'rss:techcrunch', 'rss:openai-blog'],
      },
    ],
    activeListId: 'list-x-rss',
    subscribedSources: [RSS_SOURCES.techcrunch, RSS_SOURCES.openaiBlog],
  },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const scenario of SCENARIOS) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    await context.addInitScript(({ watchlist, scenario }) => {
      localStorage.clear();
      localStorage.setItem('foro_watchlist_v2', JSON.stringify(watchlist));
      localStorage.setItem('foro_postlists_v2', JSON.stringify(scenario.postLists));
      localStorage.setItem('foro_active_list_id_v1', JSON.stringify(scenario.activeListId));
      localStorage.setItem('foro_subscribed_sources_v1', JSON.stringify(scenario.subscribedSources));
      localStorage.setItem('foro_active_plan_v1', JSON.stringify('admin'));
      localStorage.setItem('foro_active_view_v2', JSON.stringify('home'));
      localStorage.setItem('foro_content_tab_v1', JSON.stringify('search'));
      localStorage.setItem('foro_plus_access_v1', JSON.stringify(true));
      localStorage.setItem('foro_daily_usage_v1', JSON.stringify({ date: new Date().toISOString().slice(0,10), feed: 0, search: 0, generate: 0 }));
      localStorage.removeItem('foro_home_feed_v1');
      localStorage.removeItem('foro_pending_feed_v1');
      localStorage.removeItem('foro_read_archive_v1');
      localStorage.removeItem('foro_rss_seen_registry_v1');
      localStorage.removeItem('foro_x_seen_registry_v1');
      localStorage.removeItem('foro_x_sync_checkpoints_v1');
    }, { watchlist: WATCHLIST, scenario });

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
      await page.locator('.feed-card').first().waitFor({ state: 'visible', timeout: 45000 });
      firstCardMs = performance.now() - clickStart;
    } catch (_) {}

    let settledMs = null;
    let finalStatus = '';
    for (let i = 0; i < 180; i++) {
      const statusText = ((await page.locator('.status-toast').textContent().catch(() => '')) || '').trim();
      finalStatus = statusText;
      const xaiInFlight = requests.some((r) => r.url.includes('/api/xai/') && !r.end);
      const rssInFlight = requests.some((r) => r.url.includes('/api/rss/') && !r.end);
      const twitterInFlight = requests.some((r) => r.url.includes('/api/twitter/') && !r.end);
      if (!xaiInFlight && !rssInFlight && !twitterInFlight && statusText && !statusText.includes('กำลัง')) {
        settledMs = performance.now() - clickStart;
        break;
      }
      await page.waitForTimeout(500);
    }

    const cardCount = await page.locator('.feed-card').count();
    results.push({
      scenario: scenario.name,
      clickToFirstCardMs: firstCardMs === null ? null : Math.round(firstCardMs),
      clickToSettledMs: settledMs === null ? null : Math.round(settledMs),
      cardCount,
      finalStatus,
      xaiDurations: requests.filter(r => r.url.includes('/api/xai/') && r.end).map(r => Math.round(r.end - r.start)),
      twitterDurations: requests.filter(r => r.url.includes('/api/twitter/') && r.end).map(r => Math.round(r.end - r.start)),
      rssDurations: requests.filter(r => r.url.includes('/api/rss/') && r.end).map(r => Math.round(r.end - r.start)),
      rssRequestCount: requests.filter(r => r.url.includes('/api/rss/') && r.end).length,
      twitterRequestCount: requests.filter(r => r.url.includes('/api/twitter/') && r.end).length,
      xaiRequestCount: requests.filter(r => r.url.includes('/api/xai/') && r.end).length,
    });

    await context.close();
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
