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

export const getEngagementTotal = (post) =>
  (parseInt(post?.retweet_count) || 0) +
  (parseInt(post?.reply_count) || 0) +
  (parseInt(post?.like_count) || 0) +
  (parseInt(post?.quote_count) || 0);

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
        (activeFilters.view ? parseInt(left.view_count) || 0 : 0) +
        (activeFilters.engagement ? getEngagementTotal(left) : 0);
      const rightScore =
        (activeFilters.view ? parseInt(right.view_count) || 0 : 0) +
        (activeFilters.engagement ? getEngagementTotal(right) : 0);

      return rightScore - leftScore;
    });
  }

  return result;
};

export const mergePlanLabelsIntoQuery = (requestedQuery, topicLabels = []) =>
  [requestedQuery, ...topicLabels].filter(Boolean).join(' ');
