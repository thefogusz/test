// @ts-nocheck
import { apiFetch } from '../utils/apiFetch';
import {
  RECENT_WINDOW_HOURS,
  buildQueryProfile,
  dedupeTweetsById,
  diversifyByAuthor,
  diversifyBroadResults,
  ensureQueryCoverage,
  getBroadGlobalAuthorityScore,
  getBroadLocalCasualPenalty,
  getBroadSemanticScore,
  getBroadTopicFocusPenalty,
  getBroadTopicPenalty,
  getBroadViralMomentumScore,
  getCredibilityScore,
  getFreshnessScore,
  getLowSignalPenalty,
  getProviderRankScore,
  getRelevanceScore,
  getSignalScore,
  getVelocityTag,
  isExplicitlyLocalQuery,
  isThaiDominantPost,
  isNewsIntent,
} from './scoring';

export { RECENT_WINDOW_HOURS } from './scoring';
export { isExplicitlyLocalQuery } from './scoring';

const BASE_URL = '/api/twitter';

const normalizeAuthor = (author) => {
  if (!author) return null;

  return {
    ...author,
    username: author.userName || author.username,
    profile_image_url: author.profilePicture || author.profile_image_url,
  };
};

const pickFirstString = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

const coerceArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const collectTweetMedia = (tweet) => [
  ...coerceArray(tweet?.extended_entities?.media),
  ...coerceArray(tweet?.extendedEntities?.media),
  ...coerceArray(tweet?.entities?.media),
  ...coerceArray(tweet?.media),
  ...coerceArray(tweet?.attachments?.media),
  ...coerceArray(tweet?.attachments?.media_keys),
  ...coerceArray(tweet?.videos),
].filter((item) => item && typeof item === 'object');

const getVideoVariants = (media) =>
  coerceArray(media?.video_info?.variants)
    .concat(coerceArray(media?.videoInfo?.variants))
    .concat(coerceArray(media?.variants));

const selectBestVideoUrl = (media) => {
  const directUrl = pickFirstString(
    media?.video_url,
    media?.videoUrl,
    media?.playback_url,
    media?.playbackUrl,
    media?.stream_url,
    media?.streamUrl,
  );
  if (directUrl) return directUrl;

  const rankedVariants = getVideoVariants(media)
    .map((variant) => ({
      url: pickFirstString(variant?.url, variant?.src),
      bitrate: Number(variant?.bitrate || variant?.bitRate || 0),
      contentType: pickFirstString(variant?.content_type, variant?.contentType),
    }))
    .filter((variant) => variant.url)
    .sort((left, right) => {
      if (left.contentType.includes('mp4') !== right.contentType.includes('mp4')) {
        return left.contentType.includes('mp4') ? -1 : 1;
      }
      return right.bitrate - left.bitrate;
    });

  return rankedVariants[0]?.url || '';
};

const extractVideoMeta = (tweet) => {
  const mediaItems = collectTweetMedia(tweet);
  const videoMedia = mediaItems.find((media) => {
    const mediaType = String(media?.type || media?.media_type || media?.mediaType || '').toLowerCase();
    return (
      mediaType === 'video' ||
      mediaType === 'animated_gif' ||
      Boolean(media?.video_info || media?.videoInfo) ||
      getVideoVariants(media).length > 0
    );
  });

  if (!videoMedia) return null;

  const videoUrl = selectBestVideoUrl(videoMedia);
  const thumbnailUrl = pickFirstString(
    videoMedia?.media_url_https,
    videoMedia?.media_url,
    videoMedia?.thumbnail_url,
    videoMedia?.thumbnailUrl,
    videoMedia?.preview_image_url,
    videoMedia?.previewImageUrl,
    videoMedia?.poster_url,
    videoMedia?.posterUrl,
  );
  const rawDuration = Number(
    videoMedia?.video_info?.duration_millis ||
      videoMedia?.videoInfo?.durationMillis ||
      videoMedia?.duration_millis ||
      videoMedia?.durationMs ||
      0,
  );

  return {
    videoUrl,
    thumbnailUrl,
    videoDurationMs: Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : undefined,
  };
};

const extractImageMeta = (tweet) => {
  const mediaItems = collectTweetMedia(tweet);
  const imageUrls = mediaItems
    .filter((media) => {
      const mediaType = String(media?.type || media?.media_type || media?.mediaType || '').toLowerCase();
      return mediaType === 'photo' || mediaType === 'image';
    })
    .map((media) =>
      pickFirstString(
        media?.media_url_https,
        media?.media_url,
        media?.url,
        media?.image_url,
        media?.imageUrl,
        media?.preview_image_url,
        media?.previewImageUrl,
      ),
    )
    .filter(Boolean);

  return {
    primaryImageUrl: imageUrls[0] || '',
    imageUrls,
  };
};

const pickNestedTweetCandidate = (tweet) =>
  tweet?.retweeted_status ||
  tweet?.retweetedStatus ||
  tweet?.retweeted_tweet ||
  tweet?.retweetedTweet ||
  tweet?.reposted_status ||
  tweet?.repostedStatus ||
  tweet?.reposted_tweet ||
  tweet?.repostedTweet ||
  tweet?.quoted_status ||
  tweet?.quotedStatus ||
  null;

const normalizeSingleTweet = (tweet, depth = 0) => {
  const videoMeta = extractVideoMeta(tweet);
  const imageMeta = extractImageMeta(tweet);
  const repostedCandidate = depth < 1 ? pickNestedTweetCandidate(tweet) : null;
  const repostedPost = repostedCandidate ? normalizeSingleTweet(repostedCandidate, depth + 1) : null;
  const isRepost = Boolean(
    tweet?.isRepost ||
    tweet?.isRetweet ||
    tweet?.retweeted ||
    tweet?.retweetedStatus ||
    tweet?.retweeted_status ||
    tweet?.repostedTweet ||
    tweet?.reposted_tweet ||
    tweet?.repostedStatus ||
    tweet?.reposted_status,
  );

  return {
    ...tweet,
    author: normalizeAuthor(tweet.author),
    like_count: tweet.likeCount || tweet.like_count || 0,
    view_count: tweet.viewCount || tweet.view_count || 0,
    retweet_count: tweet.retweetCount || tweet.retweet_count || 0,
    reply_count: tweet.replyCount || tweet.reply_count || 0,
    quote_count: tweet.quoteCount || tweet.quote_count || 0,
    created_at: tweet.createdAt || tweet.created_at,
    sourceType:
      tweet.sourceType ||
      (tweet.isXVideo || videoMeta ? 'x_video' : tweet.type === 'article' ? 'article' : 'x_post'),
    isXVideo: Boolean(tweet.isXVideo || videoMeta),
    supportsVideoAnalysis: Boolean(tweet.supportsVideoAnalysis || tweet.isXVideo || videoMeta),
    videoUrl: tweet.videoUrl || videoMeta?.videoUrl || '',
    thumbnailUrl: tweet.thumbnailUrl || videoMeta?.thumbnailUrl || '',
    primaryImageUrl: tweet.primaryImageUrl || imageMeta?.primaryImageUrl || '',
    imageUrls: Array.isArray(tweet.imageUrls) && tweet.imageUrls.length > 0 ? tweet.imageUrls : imageMeta?.imageUrls || [],
    videoDurationMs: tweet.videoDurationMs || videoMeta?.videoDurationMs,
    isRepost,
    repostedByName: tweet.repostedByName || tweet.reposted_by_name || tweet.author?.name || '',
    repostedByUsername:
      tweet.repostedByUsername ||
      tweet.reposted_by_username ||
      tweet.author?.userName ||
      tweet.author?.username ||
      '',
    repostedPost,
  };
};

const normalizeTweets = (tweets) =>
  (tweets || []).map((tweet) => normalizeSingleTweet(tweet));

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
    const MAX_PAGES_PER_BATCH = 1;

    while (pagesFetched < MAX_PAGES_PER_BATCH) {
      const query = `(${batch.map((username) => `from:${username}`).join(' OR ')}) since:${sinceDate}`;
      const url = `${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=${queryType}${
        currentCursor ? `&cursor=${currentCursor}` : ''
      }`;

      const response = await apiFetch(url, { method: 'GET' });
      if (!response.ok) {
        if (pagesFetched > 0) break;
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
  const queryProfile = buildQueryProfile(rawQuery);
  const explicitLocalQuery = isExplicitlyLocalQuery(rawQuery);
  const broadDiscoveryIntent = queryProfile.broadIntent;
  const queryTerms = queryProfile.queryTerms;
  const uniqueTweets = dedupeTweetsById(normalizeTweets(tweets)).filter((tweet) =>
    explicitLocalQuery ? true : !isThaiDominantPost(tweet),
  );
  const hasFunIntent = /ฮา|ตลก|ขำ|funny|meme|lol|haha/i.test(rawQuery);

  const scored = uniqueTweets
    .map((tweet, index, list) => {
      const relevanceScore = getRelevanceScore(tweet, queryTerms, rawQuery);
      const broadSemanticScore = getBroadSemanticScore(tweet, queryProfile);
      const credibilityScore = getCredibilityScore(tweet);
      const signalScore = getSignalScore(tweet);
      const freshnessScore = getFreshnessScore(tweet, latestMode);
      const providerRankScore = getProviderRankScore(index, list.length, latestMode);
      const lowSignalPenalty = getLowSignalPenalty(tweet, queryTerms, rawQuery);
      const broadTopicPenalty = getBroadTopicPenalty(tweet, queryProfile);
      const broadTopicFocusPenalty = getBroadTopicFocusPenalty(tweet, queryProfile);
      const broadGlobalAuthorityScore = getBroadGlobalAuthorityScore(tweet, queryProfile);
      const broadViralMomentumScore = getBroadViralMomentumScore(tweet, queryProfile);
      const broadLocalCasualPenalty = getBroadLocalCasualPenalty(tweet, queryProfile);
      const weakCredibilityPenalty =
        !hasFunIntent && preferCredibleSources && newsIntent && credibilityScore < 2.35 ? 1.35 : 0;
      const weakRelevancePenalty =
        !broadDiscoveryIntent && preferCredibleSources && queryTerms.length > 0 && relevanceScore < 1.15 ? 1.15 : 0;
      const totalScore =
        (broadDiscoveryIntent
          ? relevanceScore * (queryProfile.preferGlobal ? 0.3 : 1.0) +
            broadSemanticScore * (queryProfile.key === 'viral_video' ? 3.1 : queryProfile.preferGlobal ? 2.2 : 1.9) +
            credibilityScore * (queryProfile.preferGlobal ? 1.2 : 2.1) +
            signalScore * (queryProfile.key === 'viral_video' ? 1.9 : queryProfile.preferGlobal ? 2.2 : 3.1) +
            broadGlobalAuthorityScore * (queryProfile.key === 'viral_video' ? 1.15 : queryProfile.preferGlobal ? 0.55 : 1.3) +
            broadViralMomentumScore * (queryProfile.key === 'viral_video' ? 2.8 : queryProfile.preferGlobal ? 2.4 : 1.1)
          : relevanceScore * (latestMode ? 2.5 : 2.2) +
            credibilityScore * (preferCredibleSources ? (latestMode ? 2.0 : 1.85) : newsIntent ? 1.4 : 1.1) +
            signalScore * (latestMode ? 2.0 : newsIntent ? 2.2 : 2.6)) +
        freshnessScore * (latestMode ? 0.75 : 0.6) +
        providerRankScore * (latestMode ? 0.4 : 0.7) -
        lowSignalPenalty -
        broadTopicPenalty -
        broadTopicFocusPenalty -
        broadLocalCasualPenalty -
        weakCredibilityPenalty -
        weakRelevancePenalty;

      return {
        ...tweet,
        broad_semantic_score: Number(broadSemanticScore.toFixed(3)),
        broad_global_authority_score: Number(broadGlobalAuthorityScore.toFixed(3)),
        broad_viral_momentum_score: Number(broadViralMomentumScore.toFixed(3)),
        search_score: Number(totalScore.toFixed(3)),
        velocityTag: getVelocityTag(tweet),
      };
    })
    .sort((a, b) => {
      if (b.search_score !== a.search_score) return b.search_score - a.search_score;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const softThreshold = broadDiscoveryIntent ? 4.5 : latestMode ? 1.5 : 2.5;
  const hardThreshold = broadDiscoveryIntent ? 2.2 : latestMode ? 0.5 : 1.5;

  let acceptable = scored.filter(tweet => tweet.search_score >= hardThreshold);

  if (broadDiscoveryIntent && queryProfile.preferGlobal) {
    acceptable = acceptable.filter((tweet) =>
      tweet.broad_semantic_score >= (queryProfile.key === 'viral_video' ? 1.1 : 0.45),
    );
    if (acceptable.length < 8) {
      acceptable = scored
        .filter((tweet) =>
          tweet.search_score >= hardThreshold * 0.7 &&
          tweet.broad_semantic_score >= (queryProfile.key === 'viral_video' ? 0.8 : 0.2),
        )
        .slice(0, 80);
    }
  }

  if (acceptable.length < 10) {
    const backupThreshold = hardThreshold * 0.7;
    acceptable = scored.filter(tweet => tweet.search_score >= backupThreshold);
  }

  const minimumKeep = Math.min(acceptable.length, broadDiscoveryIntent ? 36 : latestMode ? 15 : 30);
  const filtered = acceptable.filter((tweet, index) => index < minimumKeep || tweet.search_score >= softThreshold);

  const curated = filtered.length >= Math.min(broadDiscoveryIntent ? 18 : 15, acceptable.length) ? filtered : acceptable.slice(0, broadDiscoveryIntent ? 60 : 30);
  const covered = ensureQueryCoverage(curated, acceptable, queryTerms, latestMode);

  return diversifyBroadResults(diversifyByAuthor(covered, broadDiscoveryIntent ? 60 : 30), queryProfile, broadDiscoveryIntent ? 60 : 30)
    .slice(0, broadDiscoveryIntent ? 60 : 30);
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
  _maxPages = 1,
) => {
  try {
    const fullQuery = appendNewsFilter(query, onlyNews);

    const url = `${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(fullQuery)}&queryType=${queryType}${
      cursor ? `&cursor=${cursor}` : ''
    }`;

    const response = await apiFetch(url, { method: 'GET' });
    if (!response.ok) throw new Error('Search failed (1)');

    const data1 = await safeJson(response, { tweets: [], next_cursor: null });
    let allTweets = normalizeTweets(data1.tweets);
    let nextCursor = data1.next_cursor || null;

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

export const searchEverythingDeep = async (
  query,
  cursor = '',
  onlyNews = true,
  queryType = 'Latest',
  maxPages = 3,
) => {
  let currentCursor = cursor || '';
  let nextCursor = null;
  let pagesFetched = 0;
  let allTweets = [];

  while (pagesFetched < Math.max(1, maxPages)) {
    const result = await searchEverything(query, currentCursor, onlyNews, queryType, false);
    const chunk = Array.isArray(result?.data) ? result.data : [];
    const chunkCursor = result?.meta?.next_cursor || null;

    allTweets = [...allTweets, ...chunk];
    nextCursor = chunkCursor;
    pagesFetched += 1;

    if (!chunkCursor || chunk.length < 5) break;
    currentCursor = chunkCursor;
  }

  return {
    data: dedupeTweetsById(allTweets),
    meta: { next_cursor: nextCursor },
  };
};

let segmenter = null;
try {
  segmenter = new Intl.Segmenter('th-TH', { granularity: 'word' });
} catch (_e) {
  // Graceful fallback if Intl.Segmenter is not supported
}

const getBigrams = (text = '') => {
  const rawText = String(text || '').toLowerCase();
  const words = [];

  if (segmenter) {
    for (const { segment, isWordLike } of segmenter.segment(rawText)) {
      if (isWordLike) words.push(segment);
    }
  } else {
    const cleanText = rawText.replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, '');
    const segments = cleanText.split(/\s+/).filter(Boolean);
    for (const segment of segments) {
      if (/[a-z0-9]/.test(segment)) words.push(segment);
      else for (let i = 0; i < segment.length; i++) words.push(segment[i]);
    }
  }

  const bigrams = new Set();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]}_${words[i + 1]}`);
  }
  return bigrams;
};

const jaccardSimilarity = (a, b) => {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  return intersection / (a.size + b.size - intersection);
};

export const clusterBySimilarity = (tweets = [], threshold = 0.55) => {
  if (!tweets.length) return tweets;
  const bigramSets = tweets.map((t) => getBigrams(t.text || ''));
  const kept = [];
  const consumed = new Set();

  for (let i = 0; i < tweets.length; i++) {
    if (consumed.has(i)) continue;
    let bestIdx = i;
    let bestScore = tweets[i].search_score ?? 0;
    consumed.add(i);
    for (let j = i + 1; j < tweets.length; j++) {
      if (consumed.has(j)) continue;
      if (jaccardSimilarity(bigramSets[i], bigramSets[j]) >= threshold) {
        const jScore = tweets[j].search_score ?? 0;
        if (jScore > bestScore) { bestScore = jScore; bestIdx = j; }
        consumed.add(j);
      }
    }
    kept.push(tweets[bestIdx]);
  }
  return kept;
};

export const analyzeSearchQueryIntent = (rawQuery = '') => {
  const queryProfile = buildQueryProfile(rawQuery);
  const q = String(rawQuery || '').toLowerCase();

  let intentType = 'general';
  if (/ราคา|price|ค่าเงิน|btc|eth|bitcoin|ethereum|\$/.test(q)) intentType = 'price';
  else if (/เปิดตัว|ประกาศ|ด่วน|breaking|event|งาน|เปิดงาน|launch/.test(q)) intentType = 'event';
  else if (/vs|เทียบ|comparison|เปรียบเทียบ|ต่างกัน/.test(q)) intentType = 'comparison';
  else if (/^@\w+/.test(q.trim())) intentType = 'person';

  const forceLatestMode = intentType === 'price' || intentType === 'event';
  const tavilyFirst = intentType === 'event' || (intentType === 'general' && /ข่าว|news|update/.test(q));

  return {
    broadDiscoveryIntent: Boolean(queryProfile.broadIntent),
    preferGlobal: Boolean(queryProfile.preferGlobal),
    queryKey: queryProfile.key,
    queryTerms: [...(queryProfile.queryTerms || [])],
    intentType,
    forceLatestMode,
    tavilyFirst,
  };
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
