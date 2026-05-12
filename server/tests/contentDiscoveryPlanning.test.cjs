const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

const readSource = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const GLOBAL_PERSONA_CASES = [
  { persona: 'AI tool builder', query: 'AI tools', key: 'ai_tools' },
  { persona: 'Thai global AI reader', query: '\u0e02\u0e48\u0e32\u0e27 AI', key: 'ai' },
  { persona: 'AI video creator', query: 'Sora video', key: 'ai_video' },
  { persona: 'Game industry follower', query: 'gaming industry', key: 'gaming' },
  { persona: 'Console fan', query: 'Nintendo Switch 2', key: 'gaming' },
  { persona: 'Crypto narrative tracker', query: 'Ethereum ETF', key: 'crypto' },
  { persona: 'Startup operator', query: 'startup funding', key: 'business_startup' },
  { persona: 'Growth marketer', query: 'marketing strategy', key: 'marketing' },
  { persona: 'Investor', query: 'stock market', key: 'finance_investing' },
  { persona: 'K-pop fan', query: 'kpop comeback', key: 'kpop' },
  { persona: 'Fashion editor', query: 'fashion week', key: 'fashion' },
  { persona: 'Basketball fan', query: 'NBA trade', key: 'basketball' },
  { persona: 'Climate watcher', query: 'climate change', key: 'climate' },
  { persona: 'Health researcher', query: 'health research', key: 'health' },
  { persona: 'Space nerd', query: 'space discovery', key: 'science_space' },
  { persona: 'Traveler', query: 'Japan travel', key: 'travel' },
  { persona: 'Food trend watcher', query: 'restaurant trends', key: 'food' },
  { persona: 'Entertainment fan', query: 'streaming movies', key: 'entertainment' },
  { persona: 'Parent/student', query: 'education trends', key: 'education' },
  { persona: 'EV shopper', query: 'EV market', key: 'auto_ev' },
];

const MARKET_PERSONA_CASES = [
  { query: '\u0e23\u0e32\u0e04\u0e32 Bitcoin', key: 'bitcoin', match: /bitcoin|btc/i },
  { query: 'ETH price', key: 'ethereum', match: /ethereum|eth/i },
  { query: 'oil price outlook', key: 'oil', match: /oil|brent|wti/i },
  { query: 'NVDA stock price', key: 'stocks', match: /stock|nasdaq|nvda/i },
];

test('20 global persona searches have English-first high-engagement discovery plans', async () => {
  const {
    getContentDiscoveryTopic,
    getContentFallbackQueries,
    getContentQueryBlueprint,
  } = await import('../../src/utils/contentDiscoveryTopics.js');

  assert.equal(GLOBAL_PERSONA_CASES.length, 20);

  for (const { persona, query, key } of GLOBAL_PERSONA_CASES) {
    const topic = getContentDiscoveryTopic(query);
    assert.equal(topic?.key, key, `${persona} should map "${query}" to ${key}`);

    const blueprint = getContentQueryBlueprint(query);
    assert.ok(blueprint?.entityQuery, `${persona} should have an entity query`);
    assert.ok(blueprint?.viralQuery, `${persona} should have a viral query`);
    assert.match(blueprint.entityQuery, /\blang:en\b/i, `${persona} entity query should be global English-first`);
    assert.match(blueprint.viralQuery, /\blang:en\b/i, `${persona} viral query should be global English-first`);
    assert.match(blueprint.viralQuery, /\bmin_faves:\d+\b/i, `${persona} viral query should require engagement`);

    const fallbacks = getContentFallbackQueries(query);
    assert.ok(fallbacks.length >= 2, `${persona} should have fallback recall lanes`);
    assert.ok(
      fallbacks.every((fallbackQuery) => /\blang:en\b/i.test(fallbackQuery)),
      `${persona} fallback queries should stay global English-first`,
    );
    assert.ok(
      fallbacks.some((fallbackQuery) => /\bmin_faves:\d+\b/i.test(fallbackQuery)),
      `${persona} fallback queries should include a high-engagement lane`,
    );
  }
});

test('market price personas include crypto, oil, and stock lanes', async () => {
  const {
    getMarketFallbackQueries,
    getMarketQueryBlueprint,
    isMarketPriceSearchIntent,
  } = await import('../../src/utils/searchQueryPlanning.js');

  for (const { query, key, match } of MARKET_PERSONA_CASES) {
    assert.equal(isMarketPriceSearchIntent(query), true, `${query} should be market price intent`);

    const blueprint = getMarketQueryBlueprint(query);
    assert.equal(blueprint?.key, key);
    assert.match(blueprint.entityQuery, /\blang:en\b/i);
    assert.match(blueprint.viralQuery, /\bmin_faves:\d+\b/i);
    assert.match(blueprint.viralQuery, match);

    const fallbacks = getMarketFallbackQueries(query);
    assert.ok(fallbacks.length >= 2);
    assert.ok(fallbacks.every((fallbackQuery) => /\blang:en\b/i.test(fallbackQuery)));
    assert.ok(fallbacks.some((fallbackQuery) => /\bmin_faves:\d+\b/i.test(fallbackQuery)));
  }
});

test('search workspace consumes content discovery plans for X ranking and RSS fallback', () => {
  const helperSource = readSource('src/utils/searchHelpers.ts');
  const hookSource = readSource('src/hooks/useSearchWorkspace.ts');
  const scoringSource = readSource('src/services/scoring.ts');

  assert.match(helperSource, /getContentQueryBlueprint/);
  assert.match(helperSource, /getContentFallbackQueries/);
  assert.match(scoringSource, /getContentDiscoveryTopic/);
  assert.match(scoringSource, /getContentTopicHints/);
  assert.match(scoringSource, /LEGACY_TOPIC_PROFILE_KEYS/);
  assert.match(hookSource, /CONTENT_DISCOVERY_TOPICS/);
  assert.match(hookSource, /rssTopics/);
  assert.match(hookSource, /rssSynonyms/);
});

test('specific content topics rank before broad AI and viral scoring profiles', () => {
  const scoringSource = readSource('src/services/scoring.ts');
  const contentTopicOverrideIndex = scoringSource.indexOf(
    "contentTopic && !LEGACY_TOPIC_PROFILE_KEYS.has(contentTopic.key)",
  );
  const aiProfileIndex = scoringSource.indexOf('if (isAiQuery)');
  const viralProfileIndex = scoringSource.indexOf(
    'if (VIRAL_GLOBAL_PATTERNS.some((pattern) => pattern.test(normalizedQuery)))',
  );

  assert.ok(contentTopicOverrideIndex > 0, 'specific content topic override should exist');
  assert.ok(contentTopicOverrideIndex < aiProfileIndex, 'AI tools should not fall back to generic AI scoring');
  assert.ok(contentTopicOverrideIndex < viralProfileIndex, 'topic video searches should not fall back to generic viral scoring');
});

test('AI tools viral lane stays broad enough to return engaged global posts', async () => {
  const { getContentQueryBlueprint } = await import('../../src/utils/contentDiscoveryTopics.js');

  const blueprint = getContentQueryBlueprint('AI tools');

  assert.equal(blueprint?.key, 'ai_tools');
  assert.match(blueprint.viralQuery, /\("AI tools" OR "AI tool" OR "AI apps"/i);
  assert.match(blueprint.viralQuery, /\bmin_faves:1000\b/i);
  assert.doesNotMatch(
    blueprint.viralQuery,
    /\)\s+\((?:useful|best|launch|demo|productivity)/i,
    'AI tools viral lane should not require a second qualifier group that collapses recall',
  );
});
