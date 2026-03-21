const BASE_URL = '/api/twitter/twitter';

const normalizeAuthor = (author) => {
  if (!author) return null;

  return {
    ...author,
    username: author.userName || author.username,
    profile_image_url: author.profilePicture || author.profile_image_url,
  };
};

const normalizeTweets = (tweets) =>
  (tweets || []).map((tweet) => ({
    ...tweet,
    author: normalizeAuthor(tweet.author),
    like_count: tweet.likeCount || tweet.like_count || 0,
    view_count: tweet.viewCount || tweet.view_count || 0,
    retweet_count: tweet.retweetCount || tweet.retweet_count || 0,
    reply_count: tweet.replyCount || tweet.reply_count || 0,
    created_at: tweet.createdAt || tweet.created_at,
  }));

const appendNewsFilter = (query, onlyNews) => {
  if (!onlyNews) return query;
  if ((query || '').includes('-filter:replies')) return query;
  return `${query} -filter:replies`.trim();
};

const safeJson = async (response, fallback = {}) => {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
};

/**
 * FEATURE 1: User Verification
 */
export const getUserInfo = async (username) => {
  try {
    const handle = username.startsWith('@') ? username.substring(1) : username;
    const response = await fetch(`${BASE_URL}/user/info?userName=${handle}`, {
      method: 'GET',
    });

    if (!response.ok) throw new Error('User not found');

    const result = await response.json();

    if (result.status === 'success' && result.data) {
      const user = result.data;
      return {
        id: user.id,
        username: user.userName,
        name: user.name,
        profile_image_url: user.profilePicture,
        description: user.description,
      };
    }

    throw new Error('User data missing');
  } catch (error) {
    console.error('Error in getUserInfo:', error);
    throw error;
  }
};

/**
 * FEATURE 2: Optimized Feed Fetching with Batching & Pagination
 */
export const fetchForoFeed = async (watchlistHandles, cursor = '', queryType = 'Latest') => {
  const date = new Date();
  date.setHours(date.getHours() - 24);
  const sinceDate = date.toISOString().split('T')[0];

  const validHandles = (watchlistHandles || [])
    .map((handle) => (typeof handle === 'string' ? handle : handle?.username))
    .filter((handle) => handle && handle !== 'undefined' && typeof handle === 'string');

  if (validHandles.length === 0) {
    return { data: [], meta: { next_cursor: null } };
  }

  const batches = [];
  for (let index = 0; index < validHandles.length; index += 15) {
    batches.push(validHandles.slice(index, index + 15));
  }

  let allTweets = [];
  let nextCursor = null;

  for (const batch of batches) {
    let currentCursor = cursor;
    let pagesFetched = 0;
    const MAX_PAGES_PER_BATCH = 3;

    while (pagesFetched < MAX_PAGES_PER_BATCH) {
      const query = `(${batch.map((username) => `from:${username}`).join(' OR ')}) since:${sinceDate}`;
      const url = `${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=${queryType}${
        currentCursor ? `&cursor=${currentCursor}` : ''
      }`;

      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        if (pagesFetched > 0) break; // If we already got some results, just stop here
        throw new Error(`Feed fetch failed with status ${response.status}`);
      }

      const data = await safeJson(response, { tweets: [], next_cursor: null });
      const newTweets = normalizeTweets(data.tweets);
      allTweets = [...allTweets, ...newTweets];
      nextCursor = data.next_cursor;
      currentCursor = data.next_cursor;
      pagesFetched++;

      if (!currentCursor || newTweets.length < 5) break; 
    }
  }

  allTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    data: allTweets,
    meta: { next_cursor: nextCursor },
  };
};

export const fetchWatchlistFeed = fetchForoFeed;

/**
 * FEATURE 3: Search Everything in Matrix
 */
export const searchEverything = async (
  query,
  cursor = '',
  onlyNews = true,
  queryType = 'Latest',
) => {
  try {
    const fullQuery = appendNewsFilter(query, onlyNews);
    const url = `${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(fullQuery)}&queryType=${queryType}${
      cursor ? `&cursor=${cursor}` : ''
    }`;

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) throw new Error('Search failed');

    const data = await safeJson(response, { tweets: [], next_cursor: null });
    const sorted = normalizeTweets(data.tweets).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );

    return {
      data: sorted,
      meta: { next_cursor: data.next_cursor || null },
    };
  } catch (error) {
    console.error('Error in searchEverything:', error);
    throw error;
  }
};

/**
 * FEATURE 4: Thread Reconstruction
 */
export const getThreadContext = async (tweetId, authorId) => {
  try {
    const response = await fetch(`${BASE_URL}/tweet/thread_context?tweetId=${tweetId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Thread lookup failed with status ${response.status}`);
    }

    const data = await safeJson(response, { replies: [] });
    const thread = normalizeTweets(data.replies || data.tweets || []);

    return thread
      .filter((tweet) => !authorId || tweet.author?.id === authorId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } catch (error) {
    console.error('Error in getThreadContext:', error);
    return [];
  }
};
