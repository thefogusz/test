import fs from 'node:fs';
import path from 'node:path';
import {
  getContentDiscoveryTopic,
  getContentFallbackQueries,
  getContentQueryBlueprint,
} from '../src/utils/contentDiscoveryTopics.js';
import {
  getMarketFallbackQueries,
  getMarketQueryBlueprint,
  getMarketTopicHints,
  isExplicitlyLocalSearchQuery,
  isMarketPriceSearchIntent,
} from '../src/utils/searchQueryPlanning.js';

const PERSONAS = [
  { persona: 'AI tool hunter', query: 'AI tools' },
  { persona: 'Thai global AI reader', query: '\u0e02\u0e48\u0e32\u0e27 AI' },
  { persona: 'AI video creator', query: 'Sora video' },
  { persona: 'Game industry follower', query: 'gaming industry' },
  { persona: 'Crypto narrative tracker', query: 'Ethereum ETF' },
  { persona: 'Startup operator', query: 'startup funding' },
  { persona: 'Growth marketer', query: 'marketing strategy' },
  { persona: 'Investor', query: 'stock market' },
  { persona: 'K-pop fan', query: 'kpop comeback' },
  { persona: 'Fashion editor', query: 'fashion week' },
  { persona: 'Basketball fan', query: 'NBA trade' },
  { persona: 'Football fan', query: 'Premier League' },
  { persona: 'Climate watcher', query: 'climate change' },
  { persona: 'Health researcher', query: 'health research' },
  { persona: 'Space nerd', query: 'space discovery' },
  { persona: 'Traveler', query: 'Japan travel' },
  { persona: 'Food trend watcher', query: 'restaurant trends' },
  { persona: 'Entertainment fan', query: 'streaming movies' },
  { persona: 'Parent/student', query: 'education trends' },
  { persona: 'EV shopper', query: 'EV market' },
];

const QUALITY_SAMPLE_SIZE = 10;
const HIGH_QUALITY_THRESHOLD = 5.2;
const RELEVANCE_THRESHOLD = 2.25;
const BASE_URL = process.env.LIVE_AUDIT_BASE_URL || 'http://127.0.0.1:5173';

const readDotEnv = () => {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        const key = line.slice(0, separatorIndex);
        const rawValue = line.slice(separatorIndex + 1).trim();
        return [key, rawValue.replace(/^['"]|['"]$/g, '')];
      }),
  );
};

const env = { ...readDotEnv(), ...process.env };
const internalHeaders = env.VITE_INTERNAL_API_SECRET
  ? { 'x-internal-token': env.VITE_INTERNAL_API_SECRET }
  : {};

const normalize = (value = '') =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}$%+.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const number = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const tweetText = (tweet = {}) =>
  [
    tweet.text,
    tweet.author?.name,
    tweet.author?.userName,
    tweet.author?.username,
    tweet.author?.description,
    tweet.author?.profile_bio?.description,
  ]
    .filter(Boolean)
    .join(' ');

const isThaiDominant = (tweet = {}) => {
  const text = tweetText(tweet);
  const thaiChars = text.match(/[\u0E00-\u0E7F]/g) || [];
  const latinChars = text.match(/[a-z]/gi) || [];
  return thaiChars.length >= 12 && thaiChars.length > latinChars.length * 2;
};

const hasMediaSignal = (tweet = {}) =>
  Boolean(
    tweet.card ||
      tweet.article ||
      tweet.media ||
      tweet.extendedEntities?.media?.length ||
      tweet.entities?.media?.length,
  );

const getCreatedAt = (tweet = {}) => tweet.createdAt || tweet.created_at || tweet.created_at_ms;

const getAgeDays = (tweet = {}) => {
  const timestamp = new Date(getCreatedAt(tweet)).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (Date.now() - timestamp) / 86_400_000);
};

const getBlueprint = (query) => {
  if (isExplicitlyLocalSearchQuery(query)) return null;
  if (isMarketPriceSearchIntent(query)) return getMarketQueryBlueprint(query);
  return getContentQueryBlueprint(query);
};

const getFallbacks = (query) =>
  isMarketPriceSearchIntent(query)
    ? getMarketFallbackQueries(query)
    : getContentFallbackQueries(query);

const getQualityContext = (query) => {
  const topic = getContentDiscoveryTopic(query);
  const marketHints = getMarketTopicHints(query);
  const queryTerms = normalize(query)
    .split(' ')
    .filter((term) => term.length > 1 && !['news', 'latest', 'today', 'update'].includes(term));
  const exactTerms = [...new Set([...queryTerms, ...(topic?.exactTerms || []), ...marketHints.slice(0, 6)])];
  const hints = [...new Set([...(topic?.hints || []), ...marketHints])];
  const negativeHints = [
    ...(topic?.softNegativeHints || []),
    'airdrop',
    'giveaway',
    'telegram',
    'whatsapp',
    'presale',
    'referral',
    'dm me',
    'coupon code',
  ];

  return { exactTerms, hints, negativeHints };
};

const scoreTweet = (tweet, context) => {
  const normalizedText = normalize(tweetText(tweet));
  const phraseHits = context.exactTerms.filter((term) => {
    const normalizedTerm = normalize(term);
    return normalizedTerm && normalizedText.includes(normalizedTerm);
  });
  const hintHits = context.hints.filter((term) => {
    const normalizedTerm = normalize(term);
    return normalizedTerm && normalizedText.includes(normalizedTerm);
  });
  const spamHits = context.negativeHints.filter((term) => {
    const normalizedTerm = normalize(term);
    return normalizedTerm && normalizedText.includes(normalizedTerm);
  });

  const likes = number(tweet.likeCount, tweet.like_count, tweet.favorite_count);
  const views = number(tweet.viewCount, tweet.view_count);
  const retweets = number(tweet.retweetCount, tweet.retweet_count);
  const followers = number(tweet.author?.followers, tweet.author?.followers_count);
  const engagementScore =
    (likes >= 500 || views >= 50_000 || retweets >= 100 ? 1.7 : 0) +
    (likes >= 2_000 || views >= 250_000 || retweets >= 500 ? 0.8 : 0) +
    (likes >= 10_000 || views >= 1_000_000 ? 0.6 : 0);
  const authorityScore =
    (tweet.author?.isVerified || tweet.author?.isBlueVerified ? 0.45 : 0) +
    (followers >= 50_000 ? 0.45 : 0) +
    (followers >= 250_000 ? 0.35 : 0);
  const relevanceScore =
    (phraseHits.length > 0 ? 2.5 : 0) +
    Math.min(1.4, Math.max(0, phraseHits.length - 1) * 0.35) +
    Math.min(1.5, hintHits.length * 0.28);
  const globalScore = tweet.lang === 'en' || !isThaiDominant(tweet) ? 0.7 : -1.5;
  const spamPenalty = spamHits.length ? 1.4 + spamHits.length * 0.35 : 0;
  const mediaScore = hasMediaSignal(tweet) ? 0.25 : 0;
  const ageDays = getAgeDays(tweet);
  const stalePenalty = ageDays !== null && ageDays > 730 ? 0.45 : 0;
  const total = relevanceScore + engagementScore + authorityScore + globalScore + mediaScore - spamPenalty - stalePenalty;

  return {
    total,
    relevanceScore,
    phraseHits,
    hintHits,
    spamHits,
    likes,
    views,
    retweets,
    followers,
    ageDays,
    hasMedia: hasMediaSignal(tweet),
    isGlobal: globalScore > 0,
    isEngaged: engagementScore >= 1.7,
    isRelevant: relevanceScore >= RELEVANCE_THRESHOLD,
    isHighQuality: total >= HIGH_QUALITY_THRESHOLD && relevanceScore >= RELEVANCE_THRESHOLD && engagementScore >= 1.7 && globalScore > 0 && spamHits.length === 0,
  };
};

const fetchLane = async ({ query, lane, label }) => {
  const url = new URL('/api/twitter/tweet/advanced_search', BASE_URL);
  url.searchParams.set('query', query);
  url.searchParams.set('queryType', 'Top');

  const response = await fetch(url, {
    headers: internalHeaders,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    return { lane, label, ok: false, error: `HTTP ${response.status}`, tweets: [] };
  }

  const body = await response.json().catch(() => ({}));
  return {
    lane,
    label,
    ok: true,
    tweets: Array.isArray(body.tweets) ? body.tweets : [],
  };
};

const dedupeTweets = (tweets = []) => {
  const seen = new Set();
  const deduped = [];
  for (const tweet of tweets) {
    const key = tweet.id || tweet.url || tweet.twitterUrl || tweet.text;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(tweet);
  }
  return deduped;
};

const auditPersona = async ({ persona, query }) => {
  const blueprint = getBlueprint(query);
  const fallbacks = getFallbacks(query);
  const topic = getContentDiscoveryTopic(query);

  if (!blueprint) {
    return {
      persona,
      query,
      key: topic?.key || '-',
      status: 'FAIL',
      count: 0,
      relevant: 0,
      highQuality: 0,
      engaged: 0,
      media: 0,
      issues: ['missing-blueprint'],
      weakExamples: [],
    };
  }

  const lanes = [
    { label: 'entity', query: blueprint.entityQuery },
    { label: 'viral', query: blueprint.viralQuery },
  ].filter((lane) => lane.query);

  const laneResults = [];
  for (const lane of lanes) {
    laneResults.push(await fetchLane({ ...lane, lane: persona }));
  }

  let combinedTweets = dedupeTweets(laneResults.flatMap((result) => result.tweets));

  if (combinedTweets.length < QUALITY_SAMPLE_SIZE && fallbacks[0]) {
    laneResults.push(await fetchLane({ lane: persona, label: 'fallback', query: fallbacks[0] }));
    combinedTweets = dedupeTweets(laneResults.flatMap((result) => result.tweets));
  }

  const context = getQualityContext(query);
  const scored = combinedTweets
    .map((tweet) => ({ tweet, quality: scoreTweet(tweet, context) }))
    .sort((left, right) => right.quality.total - left.quality.total)
    .slice(0, QUALITY_SAMPLE_SIZE);

  const count = scored.length;
  const relevant = scored.filter(({ quality }) => quality.isRelevant).length;
  const highQuality = scored.filter(({ quality }) => quality.isHighQuality).length;
  const engaged = scored.filter(({ quality }) => quality.isEngaged).length;
  const media = scored.filter(({ quality }) => quality.hasMedia).length;
  const global = scored.filter(({ quality }) => quality.isGlobal).length;
  const spam = scored.filter(({ quality }) => quality.spamHits.length > 0).length;
  const stale = scored.filter(({ quality }) => quality.ageDays !== null && quality.ageDays > 730).length;
  const laneErrors = laneResults.filter((result) => !result.ok).map((result) => `${result.label}:${result.error}`);
  const issues = [...laneErrors];

  if (count < 6) issues.push('low-recall');
  if (relevant < Math.min(8, count)) issues.push('low-relevance');
  if (engaged < Math.min(6, count)) issues.push('low-engagement');
  if (global < Math.min(8, count)) issues.push('local/off-language-drift');
  if (spam > 1) issues.push('spam-drift');
  if (stale > 4) issues.push('stale-top-results');

  const status =
    highQuality >= Math.min(7, count) && issues.length === 0
      ? 'PASS'
      : highQuality >= Math.min(5, count) && relevant >= Math.min(7, count)
        ? 'WARN'
        : 'FAIL';
  const weakExamples = scored
    .filter(({ quality }) => !quality.isHighQuality)
    .slice(0, 2)
    .map(({ tweet, quality }) => {
      const author = tweet.author?.userName || tweet.author?.username || tweet.author?.name || 'unknown';
      const text = String(tweet.text || '').replace(/\s+/g, ' ').slice(0, 92);
      return `@${author}: ${text} (${quality.total.toFixed(1)})`;
    });

  return {
    persona,
    query,
    key: blueprint.key || topic?.key || '-',
    status,
    count,
    relevant,
    highQuality,
    engaged,
    media,
    issues,
    weakExamples,
  };
};

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : PERSONAS.length;
const selectedPersonas = PERSONAS.slice(0, Number.isFinite(limit) ? limit : PERSONAS.length);
const rows = [];

for (const persona of selectedPersonas) {
  rows.push(await auditPersona(persona));
}

const passCount = rows.filter((row) => row.status === 'PASS').length;
const warnCount = rows.filter((row) => row.status === 'WARN').length;
const failCount = rows.filter((row) => row.status === 'FAIL').length;

console.log(`Live search quality audit: ${passCount} PASS / ${warnCount} WARN / ${failCount} FAIL (${rows.length} personas)`);
console.log('| # | Persona | Query | Key | Top | Relevant | High-Q | Engaged | Media | Status | Issues |');
console.log('|---:|---|---|---|---:|---:|---:|---:|---:|---|---|');
rows.forEach((row, index) => {
  console.log(
    `| ${index + 1} | ${row.persona} | ${row.query} | ${row.key} | ${row.count} | ${row.relevant} | ${row.highQuality} | ${row.engaged} | ${row.media} | ${row.status} | ${row.issues.join(', ') || '-'} |`,
  );
});

const rowsWithWeakExamples = rows.filter((row) => row.weakExamples.length > 0);
if (rowsWithWeakExamples.length) {
  console.log('\nWeak examples from non-high-quality top results:');
  for (const row of rowsWithWeakExamples) {
    console.log(`- ${row.query}: ${row.weakExamples.join(' | ')}`);
  }
}
