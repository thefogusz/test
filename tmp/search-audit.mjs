import { analyzeSearchQueryIntent, curateSearchResults } from '../src/services/TwitterService.js';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const makeTweet = (index, text, overrides = {}) => ({
  id: `tweet-${index}`,
  text,
  created_at: overrides.created_at || new Date(Date.now() - index * 60_000).toISOString(),
  like_count: overrides.like_count ?? 50000 - index * 100,
  retweet_count: overrides.retweet_count ?? 4000 - index * 10,
  reply_count: overrides.reply_count ?? 500 - index,
  quote_count: overrides.quote_count ?? 250 - Math.floor(index / 2),
  view_count: overrides.view_count ?? 500000 + index * 2000,
  author: {
    username: overrides.username || `source${index}`,
    name: overrides.name || `Source ${index}`,
    followers: overrides.followers ?? 200000 + index * 1000,
    statusesCount: overrides.statusesCount ?? 30000,
    createdAt: overrides.authorCreatedAt || '2020-01-01T00:00:00.000Z',
    isVerified: overrides.isVerified ?? true,
    isBlueVerified: overrides.isBlueVerified ?? false,
    description: overrides.description || 'Gaming news and analysis',
  },
  ...overrides,
});

const gamingTweets = Array.from({ length: 80 }, (_, index) =>
  makeTweet(
    index + 1,
    `Gaming industry update: Nintendo Switch 2, PlayStation, Xbox, Steam, GTA and Pokemon are trending in global game news ${index + 1}`,
    {
      username: `gamingnews${index + 1}`,
      name: `Gaming News ${index + 1}`,
    },
  ),
);

const keywordChecks = [
  ['ข่าววงการเกม', true],
  ['ข่าววงการเกมวันนี้', true],
  ['ข่าววงการเกมที่คนพูดถึงวันนี้', true],
  ['gaming news', true],
  ['ข่าวฟุตบอล', true],
  ['ข่าวคริปโตวันนี้', true],
  ['รีวิว Monster Hunter Wilds', false],
  ['Mario movie box office analysis', false],
  ['from:NintendoAmerica switch 2', false],
];

for (const [query, expectedBroad] of keywordChecks) {
  const analysis = analyzeSearchQueryIntent(query);
  assert(
    analysis.broadDiscoveryIntent === expectedBroad,
    `Unexpected broad intent for "${query}": got ${analysis.broadDiscoveryIntent}, expected ${expectedBroad}`,
  );
}

const curatedBroad = curateSearchResults(gamingTweets, 'ข่าววงการเกม', {
  latestMode: false,
  preferCredibleSources: true,
});

assert(
  curatedBroad.length >= 30,
  `Expected at least 30 curated broad gaming results, got ${curatedBroad.length}`,
);

const curatedLongBroad = curateSearchResults(gamingTweets, 'ข่าววงการเกมที่คนพูดถึงวันนี้', {
  latestMode: true,
  preferCredibleSources: true,
});

assert(
  curatedLongBroad.length >= 30,
  `Expected at least 30 curated long broad gaming results, got ${curatedLongBroad.length}`,
);

console.log('Search audit passed.');
console.log(
  JSON.stringify(
    {
      keywordChecks: keywordChecks.map(([query]) => ({
        query,
        ...analyzeSearchQueryIntent(query),
      })),
      broadCuratedCount: curatedBroad.length,
      longBroadCuratedCount: curatedLongBroad.length,
    },
    null,
    2,
  ),
);
