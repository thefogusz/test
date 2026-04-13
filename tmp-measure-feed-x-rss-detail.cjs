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
const scenario = {
  postLists: [{ id: 'list-x-rss', name: 'X + RSS', color: '#4DA3FF', createdAt: new Date().toISOString(), members: ['openai', 'techcrunch', 'verge', 'rss:techcrunch', 'rss:openai-blog'] }],
  activeListId: 'list-x-rss',
  subscribedSources: [
    { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', siteUrl: 'https://techcrunch.com', description: 'ข่าว startup, tech, venture capital', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'openai-blog', name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', siteUrl: 'https://openai.com', description: 'ประกาศและอัปเดตโมเดลโดยตรงจาก OpenAI', frequency: '~2 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
  ],
};
(async () => {
  const browser = await chromium.launch({ headless: true });
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
    requests.push({ url: req.url(), method: req.method(), start: performance.now() });
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
  await page.locator('header .btn-pill.primary').first().click();
  await page.waitForTimeout(18000);

  const cardCount = await page.locator('.feed-card').count();
  const rssBadgeCount = await page.locator('.feed-card').filter({ hasText: 'RSS' }).count();
  const hostSamples = await page.locator('.feed-card').evaluateAll((cards) => cards.slice(0, 10).map((card) => card.textContent?.slice(0, 180)));
  const filtered = requests.filter((r) => /api\/(twitter|xai|rss|article)/.test(r.url)).map((r) => ({ url: r.url, ms: r.end ? Math.round(r.end - r.start) : null, status: r.status || null }));
  console.log(JSON.stringify({ cardCount, rssBadgeCount, filtered, hostSamples }, null, 2));
  await browser.close();
})();
