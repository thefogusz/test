import {
  getContentDiscoveryTopic,
  getContentFallbackQueries,
  getContentQueryBlueprint,
} from '../src/utils/contentDiscoveryTopics.js';
import {
  getMarketFallbackQueries,
  getMarketQueryBlueprint,
  isExplicitlyLocalSearchQuery,
  isMarketPriceSearchIntent,
} from '../src/utils/searchQueryPlanning.js';

const PERSONAS = [
  { persona: 'AI tool hunter', query: 'AI tools' },
  { persona: 'Thai global AI reader', query: '\u0e02\u0e48\u0e32\u0e27 AI' },
  { persona: 'AI video creator', query: 'Sora video' },
  { persona: 'Game industry follower', query: 'gaming industry' },
  { persona: 'Crypto narrative tracker', query: 'Ethereum ETF' },
  { persona: 'Market investor', query: 'stock market' },
  { persona: 'Startup operator', query: 'startup funding' },
  { persona: 'Growth marketer', query: 'marketing strategy' },
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

const hasLangEn = (query = '') => /\blang:en\b/i.test(query);
const hasEngagementGate = (query = '') => /\bmin_faves:\d+\b/i.test(query);

const analyzePersona = ({ persona, query }) => {
  const local = isExplicitlyLocalSearchQuery(query);
  const market = isMarketPriceSearchIntent(query);
  const contentTopic = getContentDiscoveryTopic(query);
  const blueprint = market ? getMarketQueryBlueprint(query) : getContentQueryBlueprint(query);
  const fallbacks = market ? getMarketFallbackQueries(query) : getContentFallbackQueries(query);
  const issues = [];

  if (!local && !blueprint) issues.push('missing-blueprint');
  if (!local && blueprint?.entityQuery && !hasLangEn(blueprint.entityQuery)) issues.push('entity-not-global');
  if (!local && blueprint?.viralQuery && !hasLangEn(blueprint.viralQuery)) issues.push('viral-not-global');
  if (!local && blueprint?.viralQuery && !hasEngagementGate(blueprint.viralQuery)) issues.push('viral-no-engagement-gate');
  if (!local && fallbacks.length < 2) issues.push('low-fallback-recall');
  if (!local && fallbacks.length > 0 && !fallbacks.some(hasEngagementGate)) issues.push('fallback-no-engagement-lane');

  return {
    persona,
    query,
    mode: local ? 'local' : market ? 'market' : 'content',
    key: blueprint?.key || contentTopic?.key || '-',
    fallbackCount: fallbacks.length,
    status: issues.length ? 'WARN' : 'PASS',
    issues: issues.join(', ') || '-',
  };
};

const rows = PERSONAS.map(analyzePersona);
const passCount = rows.filter((row) => row.status === 'PASS').length;

console.log(`Search persona audit: ${passCount}/${rows.length} pass`);
console.log('| # | Persona | Query | Mode | Key | Fallbacks | Status | Issues |');
console.log('|---:|---|---|---|---|---:|---|---|');
rows.forEach((row, index) => {
  console.log(`| ${index + 1} | ${row.persona} | ${row.query} | ${row.mode} | ${row.key} | ${row.fallbackCount} | ${row.status} | ${row.issues} |`);
});
