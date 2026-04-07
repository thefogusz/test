export const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const extractFirstImageUrl = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  // Find all matches to pick the best one
  const imgRegex = /<img[^>]+src=(?:["']?)([^"'\s>?]+)(?:["']?)[^>]*>/gi;
  const matches = Array.from(html.matchAll(imgRegex));
  
  if (matches.length === 0) return '';
  
  // Find the first image that doesn't look like a tracking pixel
  let bestMatch = matches.find((m) => {
    const url = m[1].toLowerCase();
    return (
      !url.includes('pixel') &&
      !url.includes('tracking') &&
      !url.includes('stats') &&
      !url.includes('icon') &&
      !url.includes('spacer') &&
      !url.includes('doubleclick') &&
      !url.includes('feedburner')
    );
  });

  let url = bestMatch ? bestMatch[1] : matches[0][1];

  // Logic to upgrade common low-res RSS images (like BBC)
  if (url.includes('ichef.bbci.co.uk')) {
    // Replace news/320/... with news/800/... or similar
    url = url.replace(/\/news\/\d+\//, '/news/1024/');
  } else if (url.includes('bloomberg.com')) {
    // Bloomerg often uses /40x40/ or similar for thumbnails
    url = url.replace(/\/\d+x\d+\//, '/800x-1/');
  } else if (url.includes('reuters.com')) {
    url = url.replace(/w=\d+/, 'w=1200');
  }

  return url;
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
const UNICODE_LETTER_REGEX = /\p{L}/gu;
const EDGE_QUOTES_REGEX = /^[\s"'`\u2018\u2019\u201C\u201D]+|[\s"'`\u2018\u2019\u201C\u201D]+$/g;
const RSS_TITLE_ONLY_MAX_TITLE_WITH_MEDIA = 82;
const RSS_TITLE_ONLY_MAX_TITLE_NO_MEDIA = 100;
const RSS_TITLE_ONLY_MAX_SUMMARY_WITH_MEDIA = 72;
const RSS_TITLE_ONLY_MAX_SUMMARY_NO_MEDIA = 88;
const RSS_TITLE_ONLY_MAX_COMBINED_WITH_MEDIA = 150;
const RSS_TITLE_ONLY_MAX_COMBINED_NO_MEDIA = 172;

export const hasThaiCharacters = (value) => THAI_CHAR_REGEX.test((value || '').trim());

export const hasSubstantialThaiContent = (
  value,
  options: {
    minThaiChars?: number;
    minThaiRatio?: number;
    minLetterCount?: number;
  } = {},
) => {
  const {
    minThaiChars = 10,
    minThaiRatio = 0.18,
    minLetterCount = 18,
  } = options;

  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) return false;

  const thaiCount = (trimmedValue.match(/[\u0E00-\u0E7F]/g) || []).length;
  if (thaiCount < minThaiChars) return false;

  const letterMatches = trimmedValue.match(UNICODE_LETTER_REGEX) || [];
  const letterCount = letterMatches.length;
  if (letterCount < minLetterCount) {
    return thaiCount >= minThaiChars;
  }

  return thaiCount / letterCount >= minThaiRatio;
};

export const hasUsefulThaiSummary = (summary, originalText = '') => {
  const trimmedSummary = (summary || '').trim();
  const trimmedOriginal = (originalText || '').trim();

  if (!trimmedSummary) return false;
  if (trimmedSummary.startsWith('(Grok')) return false;
  if (trimmedOriginal && trimmedSummary === trimmedOriginal) return false;

  return hasSubstantialThaiContent(trimmedSummary, {
    minThaiChars: 10,
    minThaiRatio: 0.18,
    minLetterCount: 18,
  });
};

const cleanCardCopy = (value = '') =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(EDGE_QUOTES_REGEX, '')
    .replace(/\.+$/, '')
    .trim();

const normalizeCardCopy = (value = '') =>
  cleanCardCopy(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitSummarySegments = (value = '') =>
  String(value || '')
    .split(/\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) =>
      segment
        .split(/(?<=[.!?…])\s+/)
        .map((part) => part.trim())
        .filter(Boolean),
    );

const stripLeadingHeadlineCopy = (summary = '', title = '') => {
  const cleanedSummary = cleanCardCopy(summary);
  const rawCleanTitle = cleanCardCopy(title);

  if (!cleanedSummary || !rawCleanTitle) return '';
  // If title was truncated mid-word (ends with ...), stripping would leave partial word
  if (rawCleanTitle.endsWith('...')) return '';

  const cleanedTitle = rawCleanTitle.trim();
  if (!cleanedSummary.startsWith(cleanedTitle)) return '';

  return cleanCardCopy(
    cleanedSummary
      .slice(cleanedTitle.length)
      .replace(/^[-:,.!?\s]+/, ''),
  );
};

const isNearDuplicateCopy = (left = '', right = '') => {
  const normalizedLeft = normalizeCardCopy(left);
  const normalizedRight = normalizeCardCopy(right);

  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;

  const shorter =
    normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  const longer =
    normalizedLeft.length <= normalizedRight.length ? normalizedRight : normalizedLeft;

  return shorter.length >= 18 && longer.startsWith(shorter);
};

export const getPreferredPostTitle = (post) => {
  if (!post || typeof post !== 'object') return '';

  const sourceType = String(post?.sourceType || '').trim().toLowerCase();
  const originalTitle = String(post?.title || '').trim();
  const originalText = String(post?.full_text || post?.text || '').trim();
  const summary = String(post?.summary || '').trim();

  if (sourceType === 'rss' && hasUsefulThaiSummary(summary, originalText)) {
    return summary;
  }

  return originalTitle || originalText;
};

export const getPreferredPostSummary = (post) => {
  if (!post || typeof post !== 'object') return '';

  const sourceType = String(post?.sourceType || '').trim().toLowerCase();
  const originalText = cleanCardCopy(post?.text || post?.full_text || '');
  const summary = cleanCardCopy(post?.summary || '');
  const title = cleanCardCopy(getPreferredPostTitle(post));
  const baseSummary =
    sourceType === 'rss'
      ? hasUsefulThaiSummary(summary, originalText)
        ? summary
        : originalText
      : hasUsefulThaiSummary(summary, originalText)
        ? summary
        : originalText;

  if (!baseSummary) return '';
  if (!title) return baseSummary;
  if (normalizeCardCopy(baseSummary) === normalizeCardCopy(title)) return '';

  const segments = splitSummarySegments(baseSummary);
  const firstSegment = segments[0] || baseSummary;

  if (!isNearDuplicateCopy(firstSegment, title)) {
    return baseSummary;
  }

  const remainder = cleanCardCopy(segments.slice(1).join(' '));
  if (remainder) return remainder;

  const trimmedPrefixRemainder = stripLeadingHeadlineCopy(baseSummary, title);
  return trimmedPrefixRemainder.length >= 24 ? trimmedPrefixRemainder : '';
};

export const getRssCardPresentation = (
  post,
  options: { hasMediaPreview?: boolean } = {},
) => {
  const rawTitle = cleanCardCopy(getPreferredPostTitle(post));
  const rawSummary = cleanCardCopy(getPreferredPostSummary(post));
  
  // If title and summary are nearly identical, keep just the title
  if (isNearDuplicateCopy(rawTitle, rawSummary)) {
    return {
      title: rawTitle,
      summary: '',
      isTitleOnly: true,
      titleLineClamp: 3,
      summaryLineClamp: 0,
    };
  }

  return {
    title: rawTitle,
    summary: rawSummary,
    isTitleOnly: false,
    titleLineClamp: 2,
    summaryLineClamp: 3,
  };
};

export const getPostSummarySourceText = (post) => {
  if (!post || typeof post !== 'object') return '';

  const sourceType = String(post?.sourceType || '').trim().toLowerCase();
  const title = String(post?.title || '').trim();
  const baseText = String(post?.full_text || post?.text || '').trim();

  if (sourceType === 'rss') {
    if (!title) return baseText;
    if (!baseText || baseText === title) return title;
    if (baseText.startsWith(`${title}\n`)) return baseText;
    return `${title}\n\n${baseText}`;
  }

  return baseText || title;
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

const MAX_RSS_FEED_AGE_DAYS = 30;

const isSupportedFreshRssPost = (post, subscribedSources = []) => {
  if (post?.sourceType !== 'rss') return true;

  const username = String(post?.author?.username || '').trim().toLowerCase();
  if (!username.startsWith('rss:')) return false;

  const subscribedHandles = new Set(
    (Array.isArray(subscribedSources) ? subscribedSources : [])
      .map((source) => `rss:${String(source?.id || '').trim().toLowerCase()}`),
  );

  if (!subscribedHandles.has(username)) return false;

  const createdAt = new Date(post?.created_at || post?.createdAt || 0).getTime();
  if (!Number.isFinite(createdAt)) return false;

  return Date.now() - createdAt <= MAX_RSS_FEED_AGE_DAYS * 24 * 60 * 60 * 1000;
};

export const deriveVisibleFeed = ({
  activeFilters,
  activeListId,
  activeView,
  originalFeed,
  postLists,
  subscribedSources,
}) => {
  let result = [];

  if (activeListId) {
    const activeList = postLists.find((list) => list.id === activeListId);
    if (activeList) {
      result = originalFeed.filter(
        (post) => {
          if (!post) return false;
          if (!isSupportedFreshRssPost(post, subscribedSources)) return false;

          const authorUsername = (post.author?.username || '').toLowerCase();
          const activeMembers = Array.isArray(activeList.members) ? activeList.members : [];

          return activeMembers.some(
            (member) => (member || '').toLowerCase() === authorUsername,
          );
        },
      );
    }
  } else if (activeView === 'home') {
    result = originalFeed.filter(
      (post) => {
        if (!post) return false;
        const username = (post.author?.username || '').toLowerCase();
        // If it's an RSS post, apply the fresh/supported check.
        // If it's not RSS (likely X/Twitter), allow it in the Home view.
        if (username.startsWith('rss:')) {
          return isSupportedFreshRssPost(post, subscribedSources);
        }
        return true;
      },
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
