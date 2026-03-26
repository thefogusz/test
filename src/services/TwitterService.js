import { apiFetch } from '../utils/apiFetch';

const BASE_URL = '/api/twitter/twitter';
export const RECENT_WINDOW_HOURS = 24;


const SEARCH_STOPWORDS = new Set([
  'ข่าว',
  'ล่าสุด',
  'new',
  'news',
  'latest',
  'today',
  'update',
  'updates',
  'topic',
  'เรื่อง',
  'เกี่ยวกับ',
  'ของ',
  'และ',
  'ใน',
  'ที่',
  'the',
  'a',
  'an',
  'or',
  'for',
  'with',
]);

const LOW_SIGNAL_PATTERNS = [
  /\bairdrop\b/i,
  /\bgiveaway\b/i,
  /\btelegram\b/i,
  /\bwhatsapp\b/i,
  /\bdiscord\b/i,
  /\bjoin\b/i,
  /\bdm\b/i,
  /\bcontract\b/i,
  /\bpresale\b/i,
  /\breferral\b/i,
  /\bsignal\b/i,
  /\bcopy trade\b/i,
];

const HYPE_PATTERNS = [
  /\b100x\b/i,
  /\b1000x\b/i,
  /\bmoney printer\b/i,
  /\bquit your job\b/i,
  /\bfollow you back\b/i,
  /\bgiga volatile\b/i,
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const parsed = Number(String(value ?? '0').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const logScore = (value, multiplier, maxInput = 1) => {
  if (value <= 0 || maxInput <= 1) return 0;
  return clamp(Math.log10(value + 1) / Math.log10(maxInput + 1), 0, 1) * multiplier;
};

const getAgeHours = (dateString) => {
  const timestamp = new Date(dateString).getTime();
  if (!Number.isFinite(timestamp)) return 9999;
  return Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
};

const getAuthorBio = (author) =>
  author?.description || author?.profile_bio?.description || '';

const isNewsIntent = (query = '') => /ข่าว|news|latest|update|updates|breaking/i.test(query);

const normalizeSearchTerms = (query = '') => {
  const normalized = String(query || '').toLowerCase().trim();
  const latinTerms = normalized.match(/[a-z0-9$%+.-]{2,}/g) || [];
  const thaiTerms = normalized.match(/[\u0E00-\u0E7F]{2,}/g) || [];

  return Array.from(new Set([...latinTerms, ...thaiTerms])).filter(
    (term) => !SEARCH_STOPWORDS.has(term),
  );
};

const getTermMatches = (tweet, queryTerms) => {
  if (!queryTerms.length) return [];

  const text = String(tweet?.text || '').toLowerCase();
  const authorContext = [
    tweet?.author?.name,
    tweet?.author?.username,
    getAuthorBio(tweet?.author),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return queryTerms.filter((term) => text.includes(term) || authorContext.includes(term));
};

const getRelevanceScore = (tweet, queryTerms, rawQuery = '') => {
  if (!queryTerms.length) return 0;
  const text = String(tweet?.text || '').toLowerCase();
  const termMatches = getTermMatches(tweet, queryTerms);

  let score = 0;

  for (const term of queryTerms) {
    if (termMatches.includes(term) && text.includes(term)) {
      score += 1.2;
    } else if (termMatches.includes(term)) {
      score += 0.45;
    }
  }

  if (termMatches.length > 1) {
    score += Math.min(1.4, termMatches.length * 0.4);
  }

  const cleanedQuery = String(rawQuery || '').trim().toLowerCase();
  if (cleanedQuery && cleanedQuery.length > 4 && text.includes(cleanedQuery)) {
    score += 1.25;
  }

  return score;
};

const getCredibilityScore = (tweet) => {
  const author = tweet?.author || {};
  const followers = toNumber(author.followers || author.fastFollowersCount);
  const statuses = toNumber(author.statusesCount);
  const accountAgeDays = getAgeHours(author.createdAt) / 24;

  let score = 0;

  if (author.isVerified) {
    score += 3.5; // High boost for Gold/Official
  } else if (author.isBlueVerified) {
    score += 1.4; // Solid boost for Premium
  }

  if (author.verifiedType === 'Business' || author.verifiedType === 'Government') score += 1.2;

  score += logScore(followers, 5.0, 1_000_000); // Increased from 3.4
  score += logScore(statuses, 1.2, 500_000); // Increased from 0.9
  score += clamp(accountAgeDays / 365, 0, 5) * 0.5;

  if (getAuthorBio(author)) score += 0.2;
  if (author.location) score += 0.1;

  return score;
};

const getSignalScore = (tweet) => {
  const likes = toNumber(tweet?.like_count || tweet?.likeCount);
  const retweets = toNumber(tweet?.retweet_count || tweet?.retweetCount);
  const replies = toNumber(tweet?.reply_count || tweet?.replyCount);
  const quotes = toNumber(tweet?.quote_count || tweet?.quoteCount);
  const views = toNumber(tweet?.view_count || tweet?.viewCount);
  const engagement = likes + retweets + replies + quotes;
  const engagementRate = views > 0 ? engagement / views : 0;

  return (
    logScore(views, 3.5, 5_000_000) + 
    logScore(engagement, 6.0, 200_000) + // Increased multiplier significantly
    clamp(engagementRate / 0.04, 0, 1) * 3.5
  );
};

const getHypePenalty = (text = '') => {
  const normalized = String(text || '');
  const letters = normalized.match(/[A-Za-z]/g) || [];
  const uppercaseLetters = normalized.match(/[A-Z]/g) || [];
  const uppercaseRatio = letters.length > 0 ? uppercaseLetters.length / letters.length : 0;

  let penalty = 0;

  for (const pattern of HYPE_PATTERNS) {
    if (pattern.test(normalized)) penalty += 0.9;
  }

  if ((normalized.match(/!/g) || []).length >= 4) penalty += 0.35;
  if (letters.length >= 20 && uppercaseRatio > 0.65) penalty += 0.65;

  return penalty;
};

const getLowSignalPenalty = (tweet, queryTerms, rawQuery = '') => {
  const author = tweet?.author || {};
  const followers = toNumber(author.followers || author.fastFollowersCount);
  const accountAgeDays = getAgeHours(author.createdAt) / 24;
  const newsIntent = isNewsIntent(rawQuery);
  const compositeText = [
    tweet?.text,
    author?.name,
    author?.username,
    getAuthorBio(author),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let penalty = 0;

  for (const pattern of LOW_SIGNAL_PATTERNS) {
    if (pattern.test(compositeText)) penalty += 1.5; // Increased penalty
  }

  penalty += getHypePenalty(tweet?.text || '');

  if (author.isAutomated) penalty += 5.0;

  if (!author.isVerified && !author.isBlueVerified && followers < 1000 && accountAgeDays < 180) {
    penalty += 2.5;
  }

  if (newsIntent) {
    if (!author.isVerified && !author.isBlueVerified && followers < 10000) penalty += 2.0;
    if (getCredibilityScore(tweet) < 3.0) penalty += 1.5;
  }

  if (queryTerms.length > 0) {
    const relevanceScore = getRelevanceScore(tweet, queryTerms);
    if (relevanceScore === 0) penalty += 5.0; // Heavy penalty for no keyword match
  }

  // 🔴 KILL LOW-ENGAGEMENT CONTENT
  const isReply = Boolean(tweet?.isReply || tweet?.inReplyToUsername || tweet?.inReplyToStatusId);
  const likes = toNumber(tweet?.like_count || tweet?.likeCount);
  const retweets = toNumber(tweet?.retweet_count || tweet?.retweetCount);
  const totalEngagement = likes + retweets;
  
  if (isReply) {
    if (totalEngagement < 5) return 80; // Penalize garbage replies but don't insta-kill if they might be relevant
    else if (totalEngagement < 30) penalty += 5.0;
  } else {
    // For non-replies, we still want some validation for top/search results
    if (totalEngagement < 2 && !author.isVerified && followers < 500) {
      penalty += 8.0; // Significant but not fatal penalty for tiny 0-1 like accounts
    } else if (totalEngagement < 10 && !author.isVerified) {
      penalty += 1.5; // Mild penalty for low engagement
    }
  }

  return Math.min(penalty, 99);
};

const getProviderRankScore = (index, total, latestMode) => {
  if (total <= 1) return latestMode ? 0.8 : 1.6;

  const normalizedRank = 1 - index / (total - 1);
  return normalizedRank * (latestMode ? 1.25 : 2.2);
};

const getFreshnessScore = (tweet, latestMode) => {
  const ageHours = getAgeHours(tweet?.created_at || tweet?.createdAt);
  const freshnessWindow = latestMode ? RECENT_WINDOW_HOURS : 24 * 7;
  const multiplier = latestMode ? 1.15 : 0.7;

  return clamp(1 - ageHours / freshnessWindow, 0, 1) * multiplier;
};

const dedupeTweetsById = (tweets = []) => {
  const byId = new Map();

  for (const tweet of tweets) {
    if (!tweet?.id) continue;

    if (!byId.has(tweet.id)) {
      byId.set(tweet.id, tweet);
      continue;
    }

    const existing = byId.get(tweet.id);
    byId.set(tweet.id, {
      ...existing,
      ...tweet,
      author: tweet.author || existing.author,
    });
  }

  return Array.from(byId.values());
};

const diversifyByAuthor = (tweets, protectedWindow = 12) => {
  const prioritized = [];
  const overflow = [];
  const seenAuthors = new Set();

  for (const tweet of tweets) {
    const authorKey = String(tweet?.author?.username || tweet?.id || '').toLowerCase();

    if (prioritized.length < protectedWindow && authorKey && seenAuthors.has(authorKey)) {
      overflow.push(tweet);
      continue;
    }

    if (authorKey) seenAuthors.add(authorKey);
    prioritized.push(tweet);
  }

  return [...prioritized, ...overflow];
};

const ensureQueryCoverage = (curatedTweets, scoredTweets, queryTerms, latestMode) => {
  const coverageTerms = queryTerms.filter((term) => /[a-z0-9]/i.test(term) && term.length >= 3);
  if (coverageTerms.length < 2) return curatedTweets;

  const result = [...curatedTweets];
  const existingIds = new Set(result.map((tweet) => tweet.id));
  const maxResults = latestMode ? 12 : 14;

  for (const term of coverageTerms) {
    const alreadyCovered = result.some((tweet) => getTermMatches(tweet, [term]).length > 0);
    if (alreadyCovered) continue;

    const candidate = scoredTweets.find(
      (tweet) => !existingIds.has(tweet.id) && getTermMatches(tweet, [term]).length > 0,
    );

    if (!candidate) continue;
    result.push(candidate);
    existingIds.add(candidate.id);

    if (result.length >= maxResults) break;
  }

  return result;
};

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
    quote_count: tweet.quoteCount || tweet.quote_count || 0,
    created_at: tweet.createdAt || tweet.created_at,
  }));

const isWithinHours = (dateString, hours = RECENT_WINDOW_HOURS) => {
  const timestamp = new Date(dateString).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= hours * 60 * 60 * 1000;
};

export const filterTweetsWithinHours = (tweets, hours = RECENT_WINDOW_HOURS) =>
  normalizeTweets(tweets).filter((tweet) => isWithinHours(tweet.created_at || tweet.createdAt, hours));

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
    const response = await apiFetch(`${BASE_URL}/user/info?userName=${handle}`, {
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
    // Keep sync and load-more predictable: one request returns one page only.
    const MAX_PAGES_PER_BATCH = 1;

    while (pagesFetched < MAX_PAGES_PER_BATCH) {
      const query = `(${batch.map((username) => `from:${username}`).join(' OR ')}) since:${sinceDate}`;
      const url = `${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=${queryType}${
        currentCursor ? `&cursor=${currentCursor}` : ''
      }`;

      const response = await apiFetch(url, { method: 'GET' });
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

export const curateSearchResults = (tweets, rawQuery, options = {}) => {
  const latestMode = Boolean(options.latestMode);
  const preferCredibleSources = options.preferCredibleSources !== false;
  const newsIntent = isNewsIntent(rawQuery);
  const queryTerms = normalizeSearchTerms(rawQuery);
  const uniqueTweets = dedupeTweetsById(normalizeTweets(tweets));
  const hasFunIntent = /ฮา|ตลก|ขำ|funny|meme|lol|haha/i.test(rawQuery);

  const scored = uniqueTweets
    .map((tweet, index, list) => {
      const relevanceScore = getRelevanceScore(tweet, queryTerms, rawQuery);
      const credibilityScore = getCredibilityScore(tweet);
      const signalScore = getSignalScore(tweet);
      const freshnessScore = getFreshnessScore(tweet, latestMode);
      const providerRankScore = getProviderRankScore(index, list.length, latestMode);
      const lowSignalPenalty = getLowSignalPenalty(tweet, queryTerms, rawQuery);
      const weakCredibilityPenalty =
        !hasFunIntent && preferCredibleSources && newsIntent && credibilityScore < 2.35 ? 1.35 : 0;
      const weakRelevancePenalty =
        preferCredibleSources && queryTerms.length > 0 && relevanceScore < 1.15 ? 1.15 : 0;
      const totalScore =
        relevanceScore * (latestMode ? 2.5 : 2.2) +
        credibilityScore * (preferCredibleSources ? (latestMode ? 2.0 : 1.85) : newsIntent ? 1.4 : 1.1) +
        signalScore * (latestMode ? 2.0 : newsIntent ? 2.2 : 2.6) + // Increased from 0.9 / 1.15 / 1.4
        freshnessScore * (latestMode ? 0.75 : 0.6) +
        providerRankScore * (latestMode ? 0.4 : 0.7) -
        lowSignalPenalty -
        weakCredibilityPenalty -
        weakRelevancePenalty;

      return {
        ...tweet,
        search_score: Number(totalScore.toFixed(3)),
      };
    })
    .sort((a, b) => {
      if (b.search_score !== a.search_score) return b.search_score - a.search_score;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const softThreshold = latestMode ? 2.0 : 3.0; // Lowered from 2.5 / 3.5
  const hardThreshold = latestMode ? 1.0 : 2.0; // Lowered from 1.5 / 2.5

  // Filter out complete garbage (bots, 0-engagement) no matter what
  let acceptable = scored.filter(tweet => tweet.search_score >= hardThreshold);

  // ADAPTIVITY: If we have very few high-quality results, lower the bar slightly to find the "best of the rest"
  if (acceptable.length < 10) {
    const backupThreshold = hardThreshold * 0.7;
    acceptable = scored.filter(tweet => tweet.search_score >= backupThreshold);
  }

  const minimumKeep = Math.min(acceptable.length, latestMode ? 15 : 30);
  const filtered = acceptable.filter((tweet, index) => index < minimumKeep || tweet.search_score >= softThreshold);
  
  // Ensure we at least try to get 15-30 if we have them
  const curated = filtered.length >= Math.min(15, acceptable.length) ? filtered : acceptable.slice(0, 30);
  const covered = ensureQueryCoverage(curated, acceptable, queryTerms, latestMode);

  // Return the absolute best 30 items max to protect Grok's context window
  return diversifyByAuthor(covered, 30).slice(0, 30);
};

/**
 * FEATURE 3: Search Everything in Matrix
 */
export const searchEverything = async (
  query,
  cursor = '',
  onlyNews = true,
  queryType = 'Latest',
  duoFetch = false,
) => {
  try {
    const fullQuery = appendNewsFilter(query, onlyNews);
    
    // FIRST FETCH
    const url = `${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(fullQuery)}&queryType=${queryType}${
      cursor ? `&cursor=${cursor}` : ''
    }`;

    const response = await apiFetch(url, { method: 'GET' });
    if (!response.ok) throw new Error('Search failed (1)');

    const data1 = await safeJson(response, { tweets: [], next_cursor: null });
    let allTweets = normalizeTweets(data1.tweets);
    let nextCursor = data1.next_cursor || null;

    // OPTIONAL DUO-FETCH (Fetch next page if requested and available)
    if (duoFetch && nextCursor) {
      console.log('⚡ Duo-Fetch: Requesting second page of results...');
      const url2 = `${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(fullQuery)}&queryType=${queryType}&cursor=${nextCursor}`;
      const resp2 = await apiFetch(url2, { method: 'GET' });
      if (resp2.ok) {
        const data2 = await safeJson(resp2, { tweets: [], next_cursor: null });
        allTweets = [...allTweets, ...normalizeTweets(data2.tweets)];
        nextCursor = data2.next_cursor || null;
      }
    }

    const sorted =
      queryType === 'Latest'
        ? [...allTweets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : allTweets;

    return {
      data: sorted,
      meta: { next_cursor: nextCursor },
    };
  } catch (error) {
    console.error('searchEverything failed:', error);
    return { data: [], meta: {} };
  }
};

/**
 * FEATURE 4: Thread Reconstruction
 */
export const fetchTweetById = async (tweetId) => {
  try {
    const response = await apiFetch(`${BASE_URL}/tweet/detail?tweet_id=${tweetId}`, {
      method: 'GET',
    });

    if (!response.ok) throw new Error(`Tweet detail fetch failed: ${response.status}`);

    const data = await safeJson(response, {});
    const tweet = data.tweet || data.data || data;

    if (!tweet?.text && !tweet?.full_text) return null;

    return normalizeTweets([tweet])[0] || null;
  } catch (error) {
    console.warn('[TwitterService] fetchTweetById failed:', error.message);
    return null;
  }
};

export const getThreadContext = async (tweetId, authorId) => {
  try {
    const response = await apiFetch(`${BASE_URL}/tweet/thread_context?tweetId=${tweetId}`, {
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
