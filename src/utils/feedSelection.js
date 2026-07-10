const getPostTimestamp = (post) => {
  const timestamp = Date.parse(String(post?.created_at || post?.createdAt || ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getFeedSourceKey = (post) => {
  const sourceType = String(post?.sourceType || '').trim().toLowerCase();
  const authorHandle = String(post?.author?.username || post?.author?.userName || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();

  if (sourceType === 'rss') {
    const sourceId = String(post?.rssSourceId || authorHandle.replace(/^rss:/, '')).trim().toLowerCase();
    return sourceId ? `rss:${sourceId}` : '';
  }

  return authorHandle ? `x:${authorHandle}` : '';
};

export const selectBalancedInitialFeedPosts = (posts = [], limit = 20) => {
  const maxItems = Math.max(0, Number(limit) || 0);
  if (maxItems === 0) return [];

  const sortedPosts = [...posts]
    .filter((post) => String(post?.id || '').trim())
    .sort((left, right) => getPostTimestamp(right) - getPostTimestamp(left));
  const selected = [];
  const selectedIds = new Set();
  const representedSources = new Set();

  for (const post of sortedPosts) {
    if (selected.length >= maxItems) break;

    const sourceKey = getFeedSourceKey(post);
    if (!sourceKey || representedSources.has(sourceKey)) continue;

    selected.push(post);
    selectedIds.add(String(post.id));
    representedSources.add(sourceKey);
  }

  for (const post of sortedPosts) {
    if (selected.length >= maxItems) break;

    const postId = String(post.id);
    if (selectedIds.has(postId)) continue;

    selected.push(post);
    selectedIds.add(postId);
  }

  return selected.sort((left, right) => getPostTimestamp(right) - getPostTimestamp(left));
};
