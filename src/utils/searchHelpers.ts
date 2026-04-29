import { TOPIC_TRIGGERS } from '../config/topics';
import { normalizeSearchText, safeParse } from './appUtils';
import {
  getMarketFallbackQueries,
  getMarketQueryBlueprint,
} from './searchQueryPlanning.js';

export const MAX_SEARCH_PRESETS = 3;

export const COMMON_KEYWORDS = [
  'AI',
  'Artificial Intelligence',
  'Elon Musk',
  'Tesla',
  'SpaceX',
  'Bitcoin',
  'Ethereum',
  'Crypto',
  'Vitalik Buterin',
  'Technology',
  'Future',
  'Innovation',
  'Machine Learning',
  'GPT-4',
  'OpenAI',
  'Market Analysis',
  'Web3',
  'Blockchain',
  'Social Media',
  'Marketing Strategy',
];

export const normalizeSearchLabel = (value) => {
  const str = typeof value === 'string' ? value : (value?.label || String(value || ''));
  return str.trim().replace(/\s+/g, ' ');
};

export const deserializeSearchPresets = (saved) => {
  const parsed = safeParse(saved, []);
  if (!Array.isArray(parsed)) return [];

  return Array.from(
    new Set(
      parsed
        .map((item) => normalizeSearchLabel(typeof item === 'string' ? item : item?.label))
        .filter(Boolean),
    ),
  ).slice(0, MAX_SEARCH_PRESETS);
};

export const deserializeSearchHistory = (saved) => {
  const parsed = safeParse(saved, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => ({
      query: normalizeSearchLabel(item?.query),
      count: Math.max(1, Number(item?.count) || 1),
      lastUsedAt: typeof item?.lastUsedAt === 'string' ? item.lastUsedAt : new Date(0).toISOString(),
    }))
    .filter((item) => item.query)
    .slice(0, 12);
};

const TOPIC_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'your',
  'about',
  'into',
  'over',
  'after',
  'have',
  'has',
  'will',
  'just',
  'more',
  'than',
  'what',
  'when',
  'where',
  'their',
  'they',
  'them',
  'ข่าว',
  'โพสต์',
  'สรุป',
  'ข้อมูล',
  'ล่าสุด',
  'ตอนนี้',
  'ระบบ',
  'ของ',
  'และ',
  'หรือ',
  'ที่',
  'ใน',
  'จาก',
  'ให้',
  'แล้ว',
  'กับ',
  'แบบ',
  'มาก',
  'ขึ้น',
  'ตาม',
  'ผ่าน',
  'เพื่อ',
  'ยัง',
  'ไม่มี',
  'อยู่',
]);

const TOPIC_ALLOWLIST = new Set([
  'AI',
  'Web3',
  'Crypto',
  'Esport',
  'Esports',
  'Gaming',
  'Marketing',
  'Startup',
  'Netflix',
  'YouTube',
  'Epic Games',
  'Epic Games Store',
  'Dune',
  'Steam',
  'Xbox',
  'PS5',
  'OpenAI',
  'Bitcoin',
  'Ethereum',
]);

const includesLabelIgnoreCase = (items, label) =>
  items.some((item) => item.toLowerCase() === label.toLowerCase());

export const extractInterestTopics = (items = []) => {
  const topicScores = new Map();

  const pushTopic = (rawLabel, weight = 1) => {
    const label = normalizeSearchLabel(rawLabel);
    if (!label) return;

    const normalized = normalizeSearchText(label);
    if (!normalized || TOPIC_STOPWORDS.has(normalized)) return;

    if (!TOPIC_ALLOWLIST.has(label)) {
      if (label.startsWith('@')) return;
      if (label.length < 3 || label.length > 32) return;
      if (/^[a-z0-9_]+$/i.test(label) && !/[A-Z]/.test(label) && !/[ก-๙]/.test(label)) return;
      if (label.split(' ').length > 3) return;
    }

    topicScores.set(label, (topicScores.get(label) || 0) + weight);
  };

  items.forEach((item) => {
    const text = [item?.summary, item?.text].filter(Boolean).join(' ');
    const authorName = normalizeSearchText(item?.author?.name);
    const authorUsername = normalizeSearchText(item?.author?.username);

    const hashtags = Array.from(
      text.matchAll(/#([\p{L}\p{N}_]{3,30})/gu),
      (match) => match[0],
    );
    hashtags.forEach((hashtag) => pushTopic(hashtag.replace(/^#/, ''), 3));

    const uppercasePhrases = text.match(/\b(?:AI|Web3|Crypto|Gaming|Esports?|Netflix|YouTube|Steam|Xbox|PS5|OpenAI|Bitcoin|Ethereum|Dune|Epic Games(?: Store)?)\b/gi) || [];
    uppercasePhrases.forEach((phrase) => pushTopic(phrase, 3));

    const properNouns = text.match(/\b[A-Z][a-zA-Z0-9+.-]{2,}(?:\s+[A-Z][a-zA-Z0-9+.-]{2,}){0,2}\b/g) || [];
    properNouns.forEach((phrase) => {
      const normalizedPhrase = normalizeSearchText(phrase);
      if (normalizedPhrase === authorName || normalizedPhrase === authorUsername) return;
      pushTopic(phrase, 2);
    });
  });

  return Array.from(topicScores.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([label]) => label)
    .slice(0, 6);
};

const BROAD_QUERY_BLUEPRINTS = [
  {
    triggers: ['ai video', 'generative ai video', 'text to video', 'text-to-video', 'runway', 'sora', 'kling'],
    entityQuery: '(sora OR runway OR "gen-3" OR kling OR hailuo OR luma OR "text-to-video" OR "ai video" OR "generative video") (generate OR prompt OR model OR release) lang:en',
    viralQuery: '(sora OR runway OR kling OR luma OR "ai video") (insane OR crazy OR mindblowing OR "looks so real" OR generating) lang:en min_faves:1000',
  },
  {
    triggers: TOPIC_TRIGGERS.ai,
    entityQuery: '(openai OR anthropic OR claude OR gemini OR chatgpt OR "gpt-4" OR mistral OR "language model" OR llm OR "ai model" OR "generative ai")',
    viralQuery: '(ai OR "artificial intelligence" OR openai OR chatgpt) (breakthrough OR update OR launch OR crazy OR future) lang:en min_faves:1000',
  },
  {
    triggers: ['viral', 'funny', 'meme', 'clip', 'video', 'ไวรัล', 'ฮา', 'ตลก', 'ขำ', 'คลิป', 'มีม'],
    entityQuery: '("viral video" OR "funny video" OR meme OR "internet culture" OR hilarious OR comedy OR "must watch") lang:en',
    viralQuery: '("viral video" OR "funny clip" OR meme OR hilarious OR comedy OR "internet culture") lang:en min_faves:1000',
  },
  {
    triggers: TOPIC_TRIGGERS.gaming,
    entityQuery: '(Nintendo OR PlayStation OR Xbox OR Steam OR "Switch 2" OR GTA OR Pokemon OR Zelda OR Mario OR "Monster Hunter" OR "Game Awards")',
    viralQuery: '(gaming OR videogames OR Nintendo OR PlayStation OR Xbox OR Steam OR "Switch 2" OR GTA) min_faves:500',
  },
  {
    triggers: TOPIC_TRIGGERS.football,
    entityQuery: '(Premier League OR Champions League OR FIFA OR UEFA OR Arsenal OR Liverpool OR Real Madrid OR Barcelona)',
    viralQuery: '(football OR soccer OR Premier League OR Champions League OR FIFA OR UEFA) min_faves:500',
  },
  {
    triggers: TOPIC_TRIGGERS.crypto,
    entityQuery: '(Bitcoin OR BTC OR Ethereum OR ETH OR Solana OR Binance OR Coinbase OR ETF)',
    viralQuery: '(crypto OR bitcoin OR btc OR ethereum OR eth OR solana) min_faves:500',
  },
];

const BROAD_QUERY_FALLBACKS = [
  {
    triggers: ['ai video', 'generative ai video', 'text to video', 'text-to-video', 'runway', 'sora', 'kling'],
    queries: [
      '("ai video" OR "generative video" OR "text to video" OR "ai film") lang:en',
      '(sora OR runway OR "gen-3" OR kling OR hailuo OR luma) (video OR ai) lang:en',
      '("ai generation" OR "generating video") (prompt OR tool OR free) lang:en min_faves:500',
    ],
  },
  {
    triggers: TOPIC_TRIGGERS.ai,
    queries: [
      '(ai OR "artificial intelligence" OR "generative ai" OR genai OR llm) lang:en',
      '(openai OR anthropic OR claude OR gemini OR chatgpt OR copilot) lang:en',
      '("prompt engineering" OR "ai tool" OR "ai tools" OR "ai model") lang:en min_faves:500',
    ],
  },
  {
    triggers: ['viral', 'funny', 'meme', 'clip', 'video', 'ไวรัล', 'ฮา', 'ตลก', 'ขำ', 'คลิป', 'มีม'],
    queries: [
      '("viral video" OR "funny video" OR meme OR comedy OR hilarious) lang:en',
      '("viral clip" OR "funniest video" OR "must watch" OR "internet culture") lang:en',
      '(meme OR hilarious OR comedy OR funny OR viral) lang:en min_faves:500',
    ],
  },
  {
    triggers: TOPIC_TRIGGERS.gaming,
    queries: [
      '(game OR gaming OR videogame OR videogames OR เกม OR วงการเกม)',
      '(Nintendo OR PlayStation OR Xbox OR Steam OR PS5 OR GTA OR Pokemon OR Zelda OR Mario OR "Monster Hunter" OR "Game Awards")',
      '(esports OR gamedev OR "game dev" OR studio OR trailer OR launch)',
    ],
  },
  {
    triggers: TOPIC_TRIGGERS.football,
    queries: [
      '(football OR soccer OR ฟุตบอล)',
      '(Premier League OR Champions League OR FIFA OR UEFA OR Arsenal OR Liverpool OR Real Madrid OR Barcelona)',
    ],
  },
  {
    triggers: TOPIC_TRIGGERS.crypto,
    queries: [
      '(crypto OR bitcoin OR btc OR ethereum OR eth OR คริปโต)',
      '(Solana OR Binance OR Coinbase OR ETF OR blockchain OR web3)',
    ],
  },
];

export const getBroadQueryBlueprint = (query = '') => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return null;

  return BROAD_QUERY_BLUEPRINTS.find((blueprint) =>
    blueprint.triggers.some((trigger) => normalized.includes(normalizeSearchText(trigger))),
  ) || getMarketQueryBlueprint(query) || null;
};

export const getBroadFallbackQueries = (query = '') => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const match = BROAD_QUERY_FALLBACKS.find((group) =>
    group.triggers.some((trigger) => normalized.includes(normalizeSearchText(trigger))),
  );

  return match ? match.queries : getMarketFallbackQueries(query);
};

export const buildDynamicSearchTags = ({
  searchPresets = [],
  searchHistoryLabels = [],
  interestSeedLabels = [],
  commonKeywords = COMMON_KEYWORDS,
  limit = MAX_SEARCH_PRESETS,
}) => [
  ...searchPresets.map((label) => ({ label, source: 'preset' })),
  ...searchHistoryLabels
    .filter((label) => !includesLabelIgnoreCase(searchPresets, label))
    .map((label) => ({ label, source: 'history' })),
  ...interestSeedLabels
    .filter(
      (label) =>
        !includesLabelIgnoreCase(searchPresets, label) &&
        !includesLabelIgnoreCase(searchHistoryLabels, label),
    )
    .map((label) => ({ label, source: 'interest' })),
  ...commonKeywords
    .filter(
      (label) =>
        !includesLabelIgnoreCase(searchPresets, label) &&
        !includesLabelIgnoreCase(searchHistoryLabels, label) &&
        !includesLabelIgnoreCase(interestSeedLabels, label),
    )
    .map((label) => ({ label, source: 'fallback' })),
].slice(0, limit);

export const getSearchSuggestions = ({
  query,
  searchPresets = [],
  searchHistoryLabels = [],
  interestSeedLabels = [],
  commonKeywords = COMMON_KEYWORDS,
  limit = 5,
}) => {
  const normalizedQuery = (query || '').trim().toLowerCase();
  if (!normalizedQuery) return [];

  const suggestionPool = Array.from(
    new Set([
      ...(Array.isArray(searchPresets) ? searchPresets : []),
      ...(Array.isArray(searchHistoryLabels) ? searchHistoryLabels : []),
      ...(Array.isArray(interestSeedLabels) ? interestSeedLabels : []),
      ...(Array.isArray(commonKeywords) ? commonKeywords : []),
    ]),
  ).filter((keyword) => typeof keyword === 'string' && keyword.trim().length > 0);

  return suggestionPool
    .filter((keyword) => {
      const normalizedKeyword = keyword.toLowerCase();
      return normalizedKeyword.includes(normalizedQuery) && normalizedKeyword !== normalizedQuery;
    })
    .slice(0, limit);
};
