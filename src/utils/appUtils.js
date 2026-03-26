export const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const mergeUniquePostsById = (...collections) => {
  const byId = new Map();

  collections
    .flat()
    .filter(Boolean)
    .forEach((post) => {
      if (!post?.id) return;
      const existing = byId.get(post.id);
      byId.set(post.id, {
        ...existing,
        ...post,
        author: post.author || existing?.author,
      });
    });

  return Array.from(byId.values());
};

const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/;

export const hasThaiCharacters = (value) => THAI_CHAR_REGEX.test((value || '').trim());

export const hasUsefulThaiSummary = (summary, originalText = '') => {
  const trimmedSummary = (summary || '').trim();
  const trimmedOriginal = (originalText || '').trim();

  if (!trimmedSummary) return false;
  if (trimmedSummary.startsWith('(Grok')) return false;
  if (trimmedOriginal && trimmedSummary === trimmedOriginal) return false;

  return hasThaiCharacters(trimmedSummary);
};

export const sanitizeStoredPost = (post) => {
  if (!post || typeof post !== 'object' || post.type === 'article') return post;
  if (!Object.prototype.hasOwnProperty.call(post, 'summary')) return post;
  if (hasUsefulThaiSummary(post.summary, post.text)) return post;

  const { summary: _summary, ...rest } = post;
  return rest;
};

export const sanitizeStoredCollection = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map(sanitizeStoredPost);
};

export const sanitizeStoredSingle = (item) => {
  if (!item || typeof item !== 'object') return item;
  return sanitizeStoredPost(item);
};

export const sanitizeCollectionState = (items) => {
  if (!Array.isArray(items)) return items;

  let changed = false;
  const nextItems = items.map((item) => {
    const sanitized = sanitizeStoredPost(item);
    if (sanitized !== item) changed = true;
    return sanitized;
  });

  return changed ? nextItems : items;
};

export const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  
  const str = String(value).toLowerCase().replace(/,/g, '').trim();
  let multiplier = 1;
  
  if (str.endsWith('k')) {
    multiplier = 1000;
  } else if (str.endsWith('m')) {
    multiplier = 1000000;
  } else if (str.endsWith('b')) {
    multiplier = 1000000000;
  }
  
  const numericPart = str.replace(/[kmb]$/, '');
  const parsed = parseFloat(numericPart);
  
  return Number.isFinite(parsed) ? parsed * multiplier : 0;
};

export const getEngagementTotal = (post) =>
  toNumber(post?.retweet_count) +
  toNumber(post?.reply_count) +
  toNumber(post?.like_count) +
  toNumber(post?.quote_count);

export const deriveVisibleFeed = ({
  activeFilters,
  activeListId,
  activeView,
  originalFeed,
  postLists,
  watchlist,
}) => {
  let result = [];

  if (activeListId) {
    const activeList = postLists.find((list) => list.id === activeListId);
    if (activeList) {
      result = originalFeed.filter(
        (post) =>
          post &&
          post.author &&
          activeList.members.some(
            (member) => (member || '').toLowerCase() === (post.author.username || '').toLowerCase(),
          ),
      );
    }
  } else if (activeView === 'home') {
    const watchlistHandles = watchlist
      .map((user) => (user.username || '').toLowerCase())
      .filter(Boolean);

    result = originalFeed.filter(
      (post) =>
        post &&
        post.author &&
        (post.author.username || '').toLowerCase() &&
        watchlistHandles.includes((post.author.username || '').toLowerCase()),
    );
  }

  if (activeFilters.view || activeFilters.engagement) {
    result = [...result].sort((left, right) => {
      const leftScore =
        (activeFilters.view ? toNumber(left.view_count) : 0) +
        (activeFilters.engagement ? getEngagementTotal(left) : 0);
      const rightScore =
        (activeFilters.view ? toNumber(right.view_count) : 0) +
        (activeFilters.engagement ? getEngagementTotal(right) : 0);

      return rightScore - leftScore;
    });
  }

  return result;
};

export const mergePlanLabelsIntoQuery = (requestedQuery, topicLabels = []) =>
  [requestedQuery, ...topicLabels].filter(Boolean).join(' ');

const stripDiacritics = (value) =>
  (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

export const normalizeSearchText = (value) =>
  stripDiacritics(String(value || ''))
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenizeSearchText = (value) =>
  normalizeSearchText(value)
    .split(' ')
    .filter(Boolean);

const levenshteinDistance = (source, target) => {
  if (source === target) return 0;
  if (!source.length) return target.length;
  if (!target.length) return source.length;

  const previous = new Array(target.length + 1);
  const current = new Array(target.length + 1);

  for (let j = 0; j <= target.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= source.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= target.length; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }

    for (let j = 0; j <= target.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[target.length];
};

const tokenSimilarityScore = (queryToken, candidateToken) => {
  if (!queryToken || !candidateToken) return 0;
  if (candidateToken === queryToken) return 1;
  if (candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken)) return 0.92;
  if (candidateToken.includes(queryToken)) return 0.82;

  const distance = levenshteinDistance(queryToken, candidateToken);
  const maxLength = Math.max(queryToken.length, candidateToken.length);
  if (!maxLength) return 0;

  const similarity = 1 - distance / maxLength;
  return similarity >= 0.58 ? similarity * 0.78 : 0;
};

export const scoreFuzzyTextMatch = (query, ...fields) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 1;

  const queryTokens = tokenizeSearchText(normalizedQuery);
  const normalizedFields = fields
    .flat()
    .map((field) => normalizeSearchText(field))
    .filter(Boolean);

  if (normalizedFields.length === 0) return 0;

  const joinedText = normalizedFields.join(' ');
  const fieldTokens = normalizedFields.flatMap(tokenizeSearchText);

  let score = 0;

  if (joinedText.includes(normalizedQuery)) {
    score += 2.6;
  }

  queryTokens.forEach((queryToken) => {
    let bestTokenScore = 0;

    for (const fieldToken of fieldTokens) {
      const candidateScore = tokenSimilarityScore(queryToken, fieldToken);
      if (candidateScore > bestTokenScore) bestTokenScore = candidateScore;
      if (bestTokenScore >= 1) break;
    }

    score += bestTokenScore;
  });

  const averageTokenScore = queryTokens.length ? score / queryTokens.length : score;
  return averageTokenScore >= 0.62 ? score : 0;
};
