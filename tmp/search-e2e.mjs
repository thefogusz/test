import { chromium } from 'playwright';

const baseUrl = process.env.APP_BASE_URL || 'http://127.0.0.1:4173';

const categories = {
  gaming: ['game', 'gaming', 'วงการเกม', 'เกม', 'nintendo', 'playstation', 'xbox', 'steam'],
  crypto: ['crypto', 'bitcoin', 'คริปโต', 'btc', 'ethereum'],
  football: ['football', 'soccer', 'ฟุตบอล', 'บอล', 'premier league'],
};

const detectCategory = (query = '') => {
  const normalized = decodeURIComponent(query).toLowerCase();
  for (const [category, hints] of Object.entries(categories)) {
    if (hints.some((hint) => normalized.includes(hint.toLowerCase()))) {
      return category;
    }
  }
  return 'generic';
};

const buildTweet = (category, index) => {
  const topicText = {
    gaming: `Gaming news ${index}: Nintendo Switch 2, PlayStation, Xbox and Steam are driving huge conversation across the game industry.`,
    crypto: `Crypto update ${index}: Bitcoin, Ethereum and ETF flows are driving major market discussion today.`,
    football: `Football news ${index}: Premier League, Champions League and transfer updates are driving major fan discussion.`,
    generic: `Global news ${index}: major trending story with strong engagement and broad discussion.`,
  }[category];

  return {
    id: `${category}-${index}`,
    text: topicText,
    createdAt: new Date(Date.now() - index * 60_000).toISOString(),
    likeCount: 60000 - index * 250,
    retweetCount: 8000 - index * 20,
    replyCount: 1200 - index * 3,
    quoteCount: 700 - index * 2,
    viewCount: 900000 + index * 5000,
    author: {
      userName: `${category}desk${index}`,
      name: `${category.toUpperCase()} Desk ${index}`,
      profilePicture: '',
      followers: 300000 + index * 1000,
      statusesCount: 50000,
      createdAt: '2020-01-01T00:00:00.000Z',
      isVerified: true,
      isBlueVerified: false,
      description: `${category} newsroom`,
    },
  };
};

const buildPage = (category, page) => {
  const start = page * 25;
  return Array.from({ length: 25 }, (_, offset) => buildTweet(category, start + offset + 1));
};

const searchCases = [
  { query: 'ข่าววงการเกม', expectedInitialCards: 10, expectedAfterLoadMore: 20, expectedCategory: 'gaming' },
  { query: 'ข่าววงการเกมที่คนพูดถึงวันนี้', expectedInitialCards: 10, expectedAfterLoadMore: 20, expectedCategory: 'gaming' },
  { query: 'gaming news', expectedInitialCards: 10, expectedAfterLoadMore: 20, expectedCategory: 'gaming' },
  { query: 'ข่าวคริปโตวันนี้', expectedInitialCards: 10, expectedAfterLoadMore: 20, expectedCategory: 'crypto' },
  { query: 'ข่าวฟุตบอล', expectedInitialCards: 10, expectedAfterLoadMore: 20, expectedCategory: 'football' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.addInitScript(() => {
  localStorage.setItem('foro_active_view_v2', JSON.stringify('content'));
  localStorage.setItem('foro_content_tab_v1', JSON.stringify('search'));
  localStorage.setItem('foro_search_query_v1', JSON.stringify(''));
  localStorage.setItem('foro_search_results_v1', JSON.stringify([]));
  localStorage.setItem('foro_search_summary_v1', JSON.stringify(''));
});

await page.route('**/api/tavily/search', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ results: [], answer: '' }),
  });
});

await page.route('**/api/xai/**', async (route) => {
  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'mocked in e2e' }),
  });
});

await page.route('**/api/twitter/tweet/advanced_search**', async (route) => {
  const url = new URL(route.request().url());
  const query = url.searchParams.get('query') || '';
  const cursor = url.searchParams.get('cursor') || '';
  const category = detectCategory(query);
  const pageIndex = cursor === 'page2' ? 1 : cursor === 'page3' ? 2 : 0;
  const tweets = buildPage(category, pageIndex);
  const next_cursor = pageIndex < 1 ? 'page2' : null;

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ tweets, next_cursor }),
  });
});

const results = [];

for (const searchCase of searchCases) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('foro_active_view_v2', JSON.stringify('content'));
    localStorage.setItem('foro_content_tab_v1', JSON.stringify('search'));
    localStorage.setItem('foro_search_query_v1', JSON.stringify(''));
    localStorage.setItem('foro_search_results_v1', JSON.stringify([]));
    localStorage.setItem('foro_search_summary_v1', JSON.stringify(''));
    localStorage.setItem('foro_search_web_sources_v1', JSON.stringify([]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  const input = page.locator('input.hero-search-input');
  await input.fill(searchCase.query);
  await input.press('Enter');

  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('.feed-card');
    return cards.length > 0;
  });

  await page.waitForTimeout(300);

  const initialCardCount = await page.locator('.feed-card').count();
  if (initialCardCount !== searchCase.expectedInitialCards) {
    throw new Error(`Expected exactly ${searchCase.expectedInitialCards} initial cards for "${searchCase.query}", got ${initialCardCount}`);
  }

  await page.getByRole('button', { name: /โหลดเพิ่มเติม/i }).click();
  await page.waitForTimeout(300);

  const cardCount = await page.locator('.feed-card').count();
  results.push({
    query: searchCase.query,
    initialCardCount,
    cardCount,
    expectedAfterLoadMore: searchCase.expectedAfterLoadMore,
  });

  if (cardCount !== searchCase.expectedAfterLoadMore) {
    throw new Error(`Expected ${searchCase.expectedAfterLoadMore} cards after load more for "${searchCase.query}", got ${cardCount}`);
  }
}

console.log(JSON.stringify({ baseUrl, results }, null, 2));

await browser.close();
