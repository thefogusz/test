const test = require('node:test');
const assert = require('node:assert/strict');

test('initial feed selection reserves a card for every active RSS source before filling with duplicates', async () => {
  const { selectBalancedInitialFeedPosts } = await import('../../src/utils/feedSelection.js');
  const posts = [
    { id: 'x-1', created_at: '2026-07-10T10:00:00.000Z', author: { username: 'very-active' } },
    { id: 'x-2', created_at: '2026-07-10T09:59:00.000Z', author: { username: 'very-active' } },
    { id: 'x-3', created_at: '2026-07-10T09:58:00.000Z', author: { username: 'very-active' } },
    { id: 'cointelegraph-1', created_at: '2026-07-10T09:30:00.000Z', sourceType: 'rss', rssSourceId: 'cointelegraph', author: { username: 'rss:cointelegraph' } },
    { id: 'decrypt-1', created_at: '2026-07-10T09:20:00.000Z', sourceType: 'rss', rssSourceId: 'decrypt', author: { username: 'rss:decrypt' } },
  ];

  const selected = selectBalancedInitialFeedPosts(posts, 3);

  assert.deepEqual(
    selected.map((post) => post.id),
    ['x-1', 'cointelegraph-1', 'decrypt-1'],
  );
});
