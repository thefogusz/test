const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

const readSource = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('market price searches get deterministic English X query lanes', async () => {
  const {
    buildTopEngagementBackfillQuery,
    getMarketQueryBlueprint,
    hasThaiSearchText,
    isExplicitlyLocalSearchQuery,
    isMarketPriceSearchIntent,
  } = await import('../../src/utils/searchQueryPlanning.js');
  const thaiSilverTrend = '\u0e41\u0e19\u0e27\u0e42\u0e19\u0e49\u0e21\u0e23\u0e32\u0e04\u0e32 Silver';

  assert.equal(hasThaiSearchText(thaiSilverTrend), true);
  assert.equal(isExplicitlyLocalSearchQuery(thaiSilverTrend), false);
  assert.equal(isMarketPriceSearchIntent(thaiSilverTrend), true);

  const blueprint = getMarketQueryBlueprint(thaiSilverTrend);
  assert.ok(blueprint, 'silver price query should have a deterministic market blueprint');
  assert.match(blueprint.entityQuery, /silver price/i);
  assert.match(blueprint.entityQuery, /\bXAG\b/);
  assert.match(blueprint.entityQuery, /lang:en/);
  assert.match(blueprint.viralQuery, /min_faves:100/);

  const backfillQuery = buildTopEngagementBackfillQuery(
    'silver price lang:en since:2026-04-28 min_faves:5 -filter:replies',
    { now: new Date('2026-04-29T12:00:00Z') },
  );

  assert.match(backfillQuery, /silver price/i);
  assert.match(backfillQuery, /since:2026-04-15/);
  assert.match(backfillQuery, /min_faves:100/);
  assert.equal((backfillQuery.match(/-filter:replies/g) || []).length, 1);
  assert.doesNotMatch(backfillQuery, /since:2026-04-28/);
  assert.doesNotMatch(backfillQuery, /min_faves:5/);
});

test('Thai input language stays global until Thailand scope is explicit', async () => {
  const {
    getLocalFallbackQueries,
    isExplicitlyLocalSearchQuery,
  } = await import('../../src/utils/searchQueryPlanning.js');

  assert.equal(isExplicitlyLocalSearchQuery('\u0e02\u0e48\u0e32\u0e27 AI'), false);
  assert.equal(isExplicitlyLocalSearchQuery('\u0e01\u0e32\u0e23\u0e40\u0e21\u0e37\u0e2d\u0e07'), false);
  assert.equal(isExplicitlyLocalSearchQuery('AI trend Thai language input'), false);
  assert.equal(isExplicitlyLocalSearchQuery('AI \u0e43\u0e19\u0e1b\u0e23\u0e30\u0e40\u0e17\u0e28\u0e44\u0e17\u0e22'), true);
  assert.equal(isExplicitlyLocalSearchQuery('\u0e2b\u0e32 creator \u0e04\u0e19\u0e44\u0e17\u0e22'), true);
  assert.equal(isExplicitlyLocalSearchQuery('\u0e15\u0e25\u0e32\u0e14\u0e2b\u0e38\u0e49\u0e19\u0e44\u0e17\u0e22'), true);
  assert.equal(isExplicitlyLocalSearchQuery('Thailand AI startups'), true);

  const creatorFallbacks = getLocalFallbackQueries('\u0e2b\u0e32 creator \u0e04\u0e19\u0e44\u0e17\u0e22');
  assert.ok(creatorFallbacks.length >= 2);
  assert.match(creatorFallbacks.join(' '), /Thai creators?|creator|influencer/i);

  const stockFallbacks = getLocalFallbackQueries('\u0e15\u0e25\u0e32\u0e14\u0e2b\u0e38\u0e49\u0e19\u0e44\u0e17\u0e22');
  assert.ok(stockFallbacks.length >= 1);
  assert.match(stockFallbacks.join(' '), /SET50|SET index/i);
});

test('content search runs a Top engagement backfill for market price intent', () => {
  const source = readSource('src/hooks/useSearchWorkspace.ts');

  assert.match(source, /buildTopEngagementBackfillQuery/);
  assert.match(source, /topEngagementBackfillPromise/);
  assert.match(source, /searchEverythingDeep\(\s*topEngagementQuery,\s*null,\s*onlyNews,\s*'Top'/);
  assert.match(source, /queryIntent\.intentType === 'price'/);
});

test('content search translates global Thai queries and excludes Thai-local RSS by default', () => {
  const hookSource = readSource('src/hooks/useSearchWorkspace.ts');
  const grokSource = readSource('src/services/GrokService.ts');
  const scoringSource = readSource('src/services/scoring.ts');

  assert.match(hookSource, /shouldTranslateThaiGlobalQuery/);
  assert.match(hookSource, /shouldUseSearchExpansion\([\s\S]*\)\s*\|\|\s*shouldTranslateThaiGlobalQuery/);
  assert.match(hookSource, /const allowLocalRssSources = isExplicitlyLocalQuery\(query\);/);
  assert.match(hookSource, /source\.lang === 'th'/);
  assert.match(hookSource, /const allowGlobalBlueprintQueries = !isExplicitlyLocalQuery\(requestedQuery\);/);
  assert.match(
    hookSource,
    /const shouldUseBlueprintQueries =\s*allowGlobalBlueprintQueries &&\s*\(effectiveBroadDiscoveryQuery \|\| queryIntent\.intentType === 'price'\);/,
  );
  assert.match(hookSource, /const shouldRunExactBroadSearch =\s*effectiveBroadDiscoveryQuery && !shouldTranslateThaiGlobalQuery;/);
  assert.match(hookSource, /getLocalFallbackQueries\(requestedQuery\)/);
  assert.match(hookSource, /const fallbackSearchQueries = shouldUseBlueprintQueries/);

  assert.match(grokSource, /isExplicitlyLocalSearchQuery/);
  assert.match(grokSource, /const globalByDefault = !isExplicitlyLocalSearchQuery\(originalQuery\)/);
  assert.match(scoringSource, /isExplicitlyLocalSearchQuery/);
});
