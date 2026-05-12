import { normalizeSearchText, safeParse } from './appUtils';
import {
  getContentFallbackQueries,
  getContentQueryBlueprint,
} from './contentDiscoveryTopics.js';
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

export const getBroadQueryBlueprint = (query = '') => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return null;

  return getMarketQueryBlueprint(query) || getContentQueryBlueprint(query) || null;
};

export const getBroadFallbackQueries = (query = '') => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const marketFallbacks = getMarketFallbackQueries(query);
  if (marketFallbacks.length) return marketFallbacks;

  return getContentFallbackQueries(query);
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
