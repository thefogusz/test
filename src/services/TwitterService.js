const BASE_URL = '/api/twitter/twitter';

const normalizeAuthor = (author) => {
  if (!author) return null;
  return {
    ...author,
    username: author.userName || author.username,
    profile_image_url: author.profilePicture || author.profile_image_url
  };
};

const normalizeTweets = (tweets) => {
  return (tweets || []).map(t => ({
    ...t,
    author: normalizeAuthor(t.author),
    like_count: t.likeCount || t.like_count || 0,
    view_count: t.viewCount || t.view_count || 0,
    retweet_count: t.retweetCount || t.retweet_count || 0,
    reply_count: t.replyCount || t.reply_count || 0,
    created_at: t.createdAt || t.created_at
  }));
};

/**
 * FEATURE 1: User Verification
 */
export const getUserInfo = async (username) => {
  try {
    const handle = username.startsWith('@') ? username.substring(1) : username;
    const response = await fetch(`${BASE_URL}/user/info?userName=${handle}`, {
      method: 'GET'
    });
    if (!response.ok) throw new Error('User not found');
    const result = await response.json();
    
    if (result.status === 'success' && result.data) {
      const u = result.data;
      // Normalizing for frontend consistency
      return {
        id: u.id,
        username: u.userName, // normalized
        name: u.name,
        profile_image_url: u.profilePicture, // normalized
        description: u.description
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
  date.setHours(date.getHours() - 24); // Strict 24h for initial sync
  const sinceDate = date.toISOString().split('T')[0];
  
  const batches = [];
  // Ensure handles are strings (extract from object if necessary)
  const validHandles = (watchlistHandles || [])
    .map(h => typeof h === 'string' ? h : h?.username)
    .filter(h => h && h !== 'undefined' && typeof h === 'string');
  
  if (validHandles.length === 0) return { data: [], meta: { next_cursor: null } };

  for (let i = 0; i < validHandles.length; i += 15) {
    batches.push(validHandles.slice(i, i + 15));
  }
  
  let allTweets = [];
  let nextCursor = null;

  for (const batch of batches) {
    // queryType=Latest ensures chronological order (newest first)
    // cursor='' for first page, or provided cursor for pagination
    const query = `(${batch.map(u => `from:${u}`).join(' OR ')}) since:${sinceDate}`;
    const url = `${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=${queryType}${cursor ? `&cursor=${cursor}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET'
    });
    const data = await response.json();
    allTweets = [...allTweets, ...normalizeTweets(data.tweets)];
    if (data.next_cursor) nextCursor = data.next_cursor;
  }
  
  // Sort all tweets from all batches to ensure consistency
  allTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    data: allTweets,
    meta: { next_cursor: nextCursor }
  };
};

export const fetchWatchlistFeed = fetchForoFeed;

/**
 * FEATURE 3: Search Everything in Matrix
 */
export const searchEverything = async (query, cursor = '', onlyNews = true, queryType = 'Latest') => {
  try {
    const newsFilter = onlyNews ? ' -filter:replies' : '';
    const fullQuery = `${query}${newsFilter}`;
    const url = `${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(fullQuery)}&queryType=${queryType}${cursor ? `&cursor=${cursor}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET'
    });
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    const sorted = normalizeTweets(data.tweets).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return {
      data: sorted,
      meta: { next_cursor: data.next_cursor || null }
    };
  } catch (error) {
    console.error('Error in searchEverything:', error);
    throw error;
  }
};

/**
 * FEATURE 2: Thread Reconstruction
 */
export const getThreadContext = async (conversationId, authorId) => {
  try {
    const response = await fetch(`${BASE_URL}/tweet/thread/context?conversationId=${conversationId}`, {
      method: 'GET'
    });
    const data = await response.json();
    const thread = data.tweets || [];
    
    // Filter logic: only keep tweets from the same author
    return thread.filter(t => t.author?.id === authorId)
                 .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } catch (error) {
    console.error('Error in getThreadContext:', error);
    return [];
  }
};
