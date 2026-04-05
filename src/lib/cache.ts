// @ts-nocheck

const CACHE_MAX_ENTRIES = 400;

export const TAVILY_CACHE_TTL_MS = 5 * 60 * 1000;
export const QUERY_CACHE_TTL_MS = 15 * 60 * 1000;
export const SUMMARY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const EXECUTIVE_SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000;
export const CONTENT_BRIEF_CACHE_TTL_MS = 30 * 60 * 1000;
export const FACT_CACHE_TTL_MS = 30 * 60 * 1000;
export const X_VIDEO_ANALYSIS_CACHE_TTL_MS = 30 * 60 * 1000;

export const normalizeCacheText = (value = '') =>
  String(value || '').replace(/\s+/g, ' ').trim();

const hashString = (value = '') => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

export const buildCacheKey = (namespace, value) =>
  `${namespace}:${hashString(typeof value === 'string' ? value : JSON.stringify(value))}`;

const pruneCache = (cache) => {
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }

  while (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
};

export const getCachedValue = (cache, key) => {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
};

export const setCachedValue = (cache, key, value, ttlMs) => {
  pruneCache(cache);
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
};

export const dedupeByNormalizedText = (items = [], selector = (item) => item) => {
  const result = [];
  const seen = new Set();

  for (const item of items) {
    const normalized = normalizeCacheText(selector(item));
    const key = normalized || `empty:${result.length}`;

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
};

export const tokenizeSummaryText = (value = '') =>
  Array.from(
    new Set(
      normalizeCacheText(value)
        .toLowerCase()
        .match(/[a-z0-9\u0E00-\u0E7F]{3,}/g) || [],
    ),
  );

export const textSimilarity = (left = '', right = '') => {
  const leftTokens = new Set(tokenizeSummaryText(left));
  const rightTokens = new Set(tokenizeSummaryText(right));
  if (!leftTokens.size || !rightTokens.size) return 0;

  let intersection = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) intersection += 1;
  });

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union > 0 ? intersection / union : 0;
};
