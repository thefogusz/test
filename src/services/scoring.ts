// @ts-nocheck
import { toNumber } from '../utils/appUtils';
import { TOPIC_TRIGGERS } from '../config/topics';

export const RECENT_WINDOW_HOURS = 24;

export const SEARCH_STOPWORDS = new Set([
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

const BROAD_TOPIC_HINTS = [
  {
    triggers: TOPIC_TRIGGERS.ai,
    hints: [
      'artificial intelligence', 'machine learning', 'generative ai', 'genai', 'llm', 'gpt',
      'openai', 'anthropic', 'claude', 'gemini', 'deepmind', 'mistral', 'prompt engineering',
      'ai agent', 'reasoning model', 'multimodal', 'inference', 'fine-tuning', 'rag',
    ],
  },
  {
    triggers: TOPIC_TRIGGERS.gaming,
    hints: [
      'nintendo', 'switch', 'switch 2', 'playstation', 'ps5', 'xbox', 'steam', 'pc gaming',
      'esports', 'game awards', 'gta', 'minecraft', 'fortnite', 'monster hunter', 'pokemon',
      'zelda', 'mario', 'capcom', 'square enix', 'bandai namco', 'fromsoftware',
    ],
  },
  {
    triggers: TOPIC_TRIGGERS.football,
    hints: ['premier league', 'champions league', 'fifa', 'uefa', 'goal', 'matchday', 'liverpool', 'man utd'],
  },
  {
    triggers: TOPIC_TRIGGERS.crypto,
    hints: ['solana', 'binance', 'altcoin', 'defi', 'web3', 'token', 'coinbase', 'blockchain'],
  },
];

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

export const VIRAL_GLOBAL_PATTERNS = [
  /ไวรัล|viral/i,
  /ฮา|ตลก|ขำ|funny|hilarious|comedy|lol|haha/i,
  /มีม|meme/i,
  /คลิป|clip|video|videos/i,
  /internet culture|must-watch|best videos?/i,
];

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const logScore = (value, multiplier, maxInput = 1) => {
  if (value <= 0 || maxInput <= 1) return 0;
  return clamp(Math.log10(value + 1) / Math.log10(maxInput + 1), 0, 1) * multiplier;
};

export const getAgeHours = (dateString) => {
  const timestamp = new Date(dateString).getTime();
  if (!Number.isFinite(timestamp)) return 9999;
  return Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
};

export const getAuthorBio = (author) =>
  author?.description || author?.profile_bio?.description || '';

export const isNewsIntent = (query = '') => /ข่าว|news|latest|update|updates|breaking/i.test(query);

export const isBroadDiscoveryIntent = (query = '') => {
  const normalized = String(query || '').toLowerCase().trim();
  const stripped = normalized
    .replace(/\b(latest|update|updates|breaking|news|review|vs|leak|rumor)\b/g, ' ')
    .replace(/ข่าว|ล่าสุด|วันนี้|ด่วน|อัปเดต|อัพเดต|รีวิว|เทียบ|หลุด/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = stripped ? stripped.split(/\s+/).filter(Boolean) : [];

  if (!normalized || tokens.length === 0 || tokens.length > 6) return false;
  if (/from:|since:|until:|@|"/i.test(normalized)) {
    return false;
  }

  if (VIRAL_GLOBAL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  return BROAD_TOPIC_HINTS.some((group) =>
    group.triggers.some((trigger) => normalized.includes(trigger)),
  );
};

export const getBroadTopicHints = (query = '') => {
  const normalized = String(query || '').toLowerCase();
  const hints = BROAD_TOPIC_HINTS
    .filter((group) => group.triggers.some((trigger) => normalized.includes(trigger)))
    .flatMap((group) => group.hints);

  return Array.from(new Set(hints));
};

const getTweetTextOnly = (tweet) => String(tweet?.text || '').toLowerCase();

export const isExplicitlyLocalQuery = (query = '') =>
  /\u0E44\u0E17\u0E22|thai|\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22|bangkok|thailand/i.test(String(query || ''));

export const normalizeSearchTerms = (query = '') => {
  const normalized = String(query || '').toLowerCase().trim();
  const latinTerms = normalized.match(/[a-z0-9$%+.-]{2,}/g) || [];
  const thaiTerms = normalized.match(/[\u0E00-\u0E7F]{2,}/g) || [];

  return Array.from(new Set([...latinTerms, ...thaiTerms])).filter(
    (term) => !SEARCH_STOPWORDS.has(term),
  );
};

export const buildQueryProfile = (rawQuery = '') => {
  const normalizedQuery = String(rawQuery || '').toLowerCase().trim();
  const broadIntent = isBroadDiscoveryIntent(rawQuery);
  const queryTerms = normalizeSearchTerms(rawQuery);
  const broadHints = getBroadTopicHints(rawQuery);
  const preferGlobal = broadIntent && !isExplicitlyLocalQuery(rawQuery);

  if (VIRAL_GLOBAL_PATTERNS.some((pattern) => pattern.test(normalizedQuery))) {
    return {
      key: 'viral_video',
      broadIntent: true,
      preferGlobal,
      queryTerms,
      exactTerms: Array.from(
        new Set([
          ...queryTerms,
          'viral',
          'funny',
          'meme',
          'clip',
          'video',
          'comedy',
          'hilarious',
          'internet culture',
          'ไวรัล',
          'คลิป',
          'ฮา',
          'ตลก',
          'ขำ',
          'มีม',
        ]),
      ),
      primaryHints: [
        'viral video',
        'funny video',
        'funniest video',
        'hilarious',
        'comedy',
        'meme',
        'internet culture',
        'must watch',
        'caught on camera',
        'laugh',
        'lol',
        'viral clip',
        'comedy clip',
      ],
      secondaryHints: [
        'trend',
        'trending',
        'fyp',
        'viral',
        'funny',
        'meme',
        'clip',
        'video',
      ],
      softNegativeHints: [
        'fan cam',
        'fancam',
        'idol',
        'dispatch',
        'stan',
        'shipping',
        'stream now',
        'vote now',
      ],
    };
  }

  if (
    normalizedQuery === 'ai' ||
    normalizedQuery.includes('artificial intelligence') ||
    normalizedQuery.includes('machine learning') ||
    normalizedQuery.includes('llm') ||
    normalizedQuery.includes('gpt') ||
    normalizedQuery.includes('genai')
  ) {
    return {
      key: 'ai',
      broadIntent: true,
      preferGlobal,
      queryTerms,
      exactTerms: ['ai', 'artificial intelligence', 'machine learning', 'generative ai', 'genai', 'llm', 'gpt'],
      primaryHints: ['openai', 'anthropic', 'claude', 'gemini', 'deepmind', 'mistral', 'chatgpt', 'copilot', 'ai model', 'foundation model', 'ai agent', 'prompt engineering'],
      secondaryHints: broadHints,
      softNegativeHints: ['giveaway', 'airdrop', 'follow', 'dm', 'telegram', 'whatsapp', 'casino', 'พนัน', 'หวย'],
    };
  }

  if (normalizedQuery.includes('เกม') || normalizedQuery.includes('gaming') || normalizedQuery.includes('games')) {
    return {
      key: 'gaming',
      broadIntent,
      preferGlobal,
      queryTerms,
      exactTerms: ['เกม', 'วงการเกม', 'gaming', 'games', 'videogames', 'game'],
      primaryHints: ['nintendo', 'switch', 'switch 2', 'playstation', 'ps5', 'xbox', 'steam', 'gta', 'pokemon', 'zelda', 'mario', 'monster hunter', 'game awards', 'gamedev', 'game dev', 'studio'],
      secondaryHints: broadHints,
      softNegativeHints: ['esports', 'valorant', 'league of legends', 'lolesports', 'faze', 'cblol', 'faker', 'counter-strike', 'tournament', 'scrim', 'coach', 'giveaway', 'gaming pc', 'rtx', 'steam deck'],
    };
  }

  return {
    key: 'generic',
    broadIntent,
    preferGlobal,
    queryTerms,
    exactTerms: queryTerms,
    primaryHints: broadHints,
    secondaryHints: broadHints,
    softNegativeHints: [],
  };
};

export const getTermMatches = (tweet, queryTerms) => {
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

export const getRelevanceScore = (tweet, queryTerms, rawQuery = '') => {
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

export const getBroadSemanticScore = (tweet, queryProfile) => {
  if (!queryProfile?.broadIntent) return 0;

  const text = getTweetTextOnly(tweet);
  if (!text) return 0;

  let score = 0;
  const exactMatches = queryProfile.exactTerms.filter((term) => text.includes(term)).length;
  const primaryMatches = queryProfile.primaryHints.filter((hint) => text.includes(hint)).length;
  const secondaryMatches = queryProfile.secondaryHints.filter((hint) => text.includes(hint)).length;

  score += exactMatches * (queryProfile.preferGlobal ? 0.45 : 1.2);
  score += primaryMatches * (queryProfile.preferGlobal ? 1.25 : 0.95);
  score += Math.min(1.2, secondaryMatches * 0.2);

  return Math.min(5, score);
};

export const getBroadTopicPenalty = (tweet, queryProfile) => {
  if (!queryProfile?.broadIntent) return 0;

  const text = getTweetTextOnly(tweet);
  const primaryMatches = queryProfile.primaryHints.filter((hint) => text.includes(hint)).length;
  const exactMatches = queryProfile.exactTerms.filter((term) => text.includes(term)).length;
  const softNegativeMatches = queryProfile.softNegativeHints.filter((hint) => text.includes(hint)).length;
  const promoMatches = (text.match(/giveaway|sweepstakes|win a|free steam|gaming pc|rtx|steam deck|follow \+|repost \+|like and follow/gi) || []).length;
  const esportsMatches = (text.match(/esports|valorant|league of legends|lolesports|faze|counter-strike|tournament|coach|scrim/gi) || []).length;

  if (softNegativeMatches === 0) return 0;
  if (queryProfile.key === 'gaming' && queryProfile.preferGlobal) {
    if (promoMatches > 0 && primaryMatches === 0) {
      return Math.min(6, 2.6 + promoMatches * 1.3);
    }

    if (esportsMatches > 0 && primaryMatches === 0 && exactMatches === 0) {
      return Math.min(4.5, 1.6 + esportsMatches * 0.7);
    }
  }

  if (primaryMatches > 0 || exactMatches > 0) return Math.max(0, softNegativeMatches - 1) * 0.35;

  return Math.min(2.6, 0.8 + softNegativeMatches * 0.45);
};

export const getBroadTopicFocusPenalty = (tweet, queryProfile) => {
  if (!queryProfile?.broadIntent) return 0;

  const text = String(tweet?.text || '').toLowerCase();
  if (!text) return 0;

  const exactTextMatches = queryProfile.exactTerms.filter((term) => text.includes(term)).length;
  const primaryTextMatches = queryProfile.primaryHints.filter((hint) => text.includes(hint)).length;
  const secondaryTextMatches = queryProfile.secondaryHints.filter((hint) => text.includes(hint)).length;

  if (queryProfile.key === 'viral_video') {
    const listLikeText = (text.match(/[,:|/]/g) || []).length >= 4 || text.split(/\s+/).length > 45;

    if (primaryTextMatches === 0 && exactTextMatches === 0) {
      return 4.2;
    }

    if (primaryTextMatches === 0 && exactTextMatches <= 1) {
      return listLikeText ? 2.8 : 1.9;
    }

    return 0;
  }

  if (queryProfile.key === 'ai') {
    const hasExplicitAiPhrase =
      /artificial intelligence|machine learning|generative ai|genai|large language model|language model|foundation model|ai model|ai agent|chatgpt|copilot|claude|gemini|deepmind|mistral|openai|anthropic|llm|gpt/i.test(text);
    const listLikeText = (text.match(/[,:|/]/g) || []).length >= 4 || text.split(/\s+/).length > 45;

    if (hasExplicitAiPhrase || primaryTextMatches >= 1) {
      return 0;
    }

    if (exactTextMatches > 0 && primaryTextMatches === 0 && secondaryTextMatches === 0) {
      return listLikeText ? 3.2 : 2.1;
    }

    if (exactTextMatches === 0 && primaryTextMatches === 0 && secondaryTextMatches > 0) {
      return 0.6;
    }
  }

  if (queryProfile.key !== 'gaming') return 0;

  const listLikeText = (text.match(/[,:|/]/g) || []).length >= 4 || text.split(/\s+/).length > 45;

  if (exactTextMatches > 0 && primaryTextMatches === 0 && secondaryTextMatches === 0) {
    return listLikeText ? 2.4 : 1.1;
  }

  if (exactTextMatches === 0 && primaryTextMatches === 0 && secondaryTextMatches > 0) {
    return 0.35;
  }

  return 0;
};

export const getBroadGlobalAuthorityScore = (tweet, queryProfile) => {
  if (!queryProfile?.broadIntent) return 0;

  const author = tweet?.author || {};
  const followers = toNumber(author.followers || author.fastFollowersCount);
  const text = getTweetTextOnly(tweet);
  const exactMatches = queryProfile.exactTerms.filter((term) => text.includes(term)).length;
  const primaryMatches = queryProfile.primaryHints.filter((hint) => text.includes(hint)).length;

  let score = 0;

  if (author.isVerified) score += 1.8;
  else if (author.isBlueVerified) score += 0.7;

  if (followers >= 1_000_000) score += 1.8;
  else if (followers >= 250_000) score += 1.1;
  else if (followers >= 50_000) score += 0.5;

  if (primaryMatches > 0) score += 0.7;
  if (exactMatches > 0 && primaryMatches > 0) score += 0.35;

  return Math.min(4.5, score);
};

export const getBroadViralMomentumScore = (tweet, queryProfile) => {
  if (!queryProfile?.broadIntent) return 0;

  const likes = toNumber(tweet?.like_count || tweet?.likeCount);
  const retweets = toNumber(tweet?.retweet_count || tweet?.retweetCount);
  const replies = toNumber(tweet?.reply_count || tweet?.replyCount);
  const quotes = toNumber(tweet?.quote_count || tweet?.quoteCount);
  const views = toNumber(tweet?.view_count || tweet?.viewCount);
  const engagement = likes + retweets + replies + quotes;
  const ageHours = getAgeHours(tweet?.created_at || tweet?.createdAt);

  let score = 0;

  score += logScore(engagement, 3.2, 500_000);
  score += logScore(likes, 1.8, 300_000);
  score += logScore(retweets + quotes, 1.6, 100_000);
  score += logScore(replies, 0.8, 25_000);

  if (views > 0 && engagement > 0) {
    const engagementRate = engagement / views;
    score += clamp(engagementRate / 0.03, 0, 1) * 1.4;
  }

  if (ageHours <= 24) score += 0.8;
  else if (ageHours <= 72) score += 0.35;

  return Math.min(7, score);
};

export const getBroadLocalCasualPenalty = (tweet, queryProfile) => {
  if (!queryProfile?.broadIntent || !queryProfile?.preferGlobal) return 0;

  const author = tweet?.author || {};
  const followers = toNumber(author.followers || author.fastFollowersCount);
  const text = String(tweet?.text || '').toLowerCase();
  const thaiChars = text.match(/[\u0E00-\u0E7F]/g) || [];
  const latinChars = text.match(/[a-z]/gi) || [];
  const thaiHeavy = thaiChars.length >= 24 && thaiChars.length > latinChars.length * 2;
  const exactMatches = queryProfile.exactTerms.filter((term) => text.includes(term)).length;
  const primaryMatches = queryProfile.primaryHints.filter((hint) => text.includes(hint)).length;
  const signalScore = getSignalScore(tweet);
  const hasLatinSignal = /[a-z]/i.test(text);

  if (queryProfile.key === 'viral_video') {
    if (primaryMatches >= 2) return 0;
    if (author.isVerified && followers >= 100_000) return 0;

    let penalty = 0;
    if (exactMatches === 0 && primaryMatches === 0) penalty += 4.5;
    if (!hasLatinSignal) penalty += 2.4;
    if (!author.isVerified && !author.isBlueVerified && followers < 100_000) penalty += 2.4;
    if (!author.isVerified && followers < 25_000) penalty += 1.6;
    if (thaiHeavy) penalty += 2.0;
    return penalty;
  }

  if (!thaiHeavy) return 0;
  if (primaryMatches > 0) return 0;
  if (author.isVerified || author.isBlueVerified) return 0;
  if (followers >= 250_000 && primaryMatches > 0) return 0;

  if (exactMatches > 0) {
    return followers < 25_000 ? 7.5 : 5.2;
  }

  return signalScore >= 9 ? 1.4 : 2.2;
};

export const getCredibilityScore = (tweet) => {
  const author = tweet?.author || {};
  const followers = toNumber(author.followers || author.fastFollowersCount);
  const statuses = toNumber(author.statusesCount);
  const accountAgeDays = getAgeHours(author.createdAt) / 24;

  let score = 0;

  if (author.isVerified) {
    score += 3.5;
  } else if (author.isBlueVerified) {
    score += 1.4;
  }

  if (author.verifiedType === 'Business' || author.verifiedType === 'Government') score += 1.2;

  score += logScore(followers, 5.0, 1_000_000);
  score += logScore(statuses, 1.2, 500_000);
  score += clamp(accountAgeDays / 365, 0, 5) * 0.5;

  if (getAuthorBio(author)) score += 0.2;
  if (author.location) score += 0.1;

  return score;
};

export const getSignalScore = (tweet) => {
  const likes = toNumber(tweet?.like_count || tweet?.likeCount);
  const retweets = toNumber(tweet?.retweet_count || tweet?.retweetCount);
  const replies = toNumber(tweet?.reply_count || tweet?.replyCount);
  const quotes = toNumber(tweet?.quote_count || tweet?.quoteCount);
  const views = toNumber(tweet?.view_count || tweet?.viewCount);
  const engagement = likes + retweets + replies + quotes;
  const engagementRate = views > 0 ? engagement / views : 0;

  return (
    logScore(views, 3.5, 5_000_000) +
    logScore(engagement, 6.0, 200_000) +
    clamp(engagementRate / 0.04, 0, 1) * 3.5
  );
};

export const getVelocityTag = (tweet) => {
  const likes = toNumber(tweet?.like_count || tweet?.likeCount);
  const retweets = toNumber(tweet?.retweet_count || tweet?.retweetCount);
  const engagement = likes + retweets;
  const ageHours = getAgeHours(tweet?.created_at || tweet?.createdAt);
  if (ageHours <= 0 || engagement === 0) return null;
  const engPerHour = engagement / ageHours;
  if (ageHours <= 6 && engPerHour >= 200) return '🔥 กำลังระเบิด';
  if (ageHours <= 24 && engPerHour >= 50) return '📈 กำลังขึ้น';
  if (ageHours <= 48 && engPerHour >= 15) return '📊 กำลังมา';
  return null;
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

export const getLowSignalPenalty = (tweet, queryTerms, rawQuery = '') => {
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
  const broadDiscoveryIntent = isBroadDiscoveryIntent(rawQuery);

  for (const pattern of LOW_SIGNAL_PATTERNS) {
    if (pattern.test(compositeText)) penalty += 1.5;
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

  if (queryTerms.length > 0 && !broadDiscoveryIntent) {
    const relevanceScore = getRelevanceScore(tweet, queryTerms);
    if (relevanceScore === 0) penalty += 5.0;
  }

  const isReply = Boolean(tweet?.isReply || tweet?.inReplyToUsername || tweet?.inReplyToStatusId);
  const likes = toNumber(tweet?.like_count || tweet?.likeCount);
  const retweets = toNumber(tweet?.retweet_count || tweet?.retweetCount);
  const totalEngagement = likes + retweets;

  if (isReply) {
    if (totalEngagement < 5) return 80;
    else if (totalEngagement < 30) penalty += 5.0;
  } else {
    if (totalEngagement < 2 && !author.isVerified && followers < 500) {
      penalty += 8.0;
    } else if (totalEngagement < 5 && !author.isVerified) {
      penalty += 3.5;
    } else if (totalEngagement < 10 && !author.isVerified) {
      penalty += 1.5;
    } else if (totalEngagement < 5 && author.isVerified) {
      penalty += 1.5;
    }
  }

  return Math.min(penalty, 99);
};

export const getProviderRankScore = (index, total, latestMode) => {
  if (total <= 1) return latestMode ? 0.8 : 1.6;

  const normalizedRank = 1 - index / (total - 1);
  return normalizedRank * (latestMode ? 1.25 : 2.2);
};

export const getFreshnessScore = (tweet, latestMode) => {
  const ageHours = getAgeHours(tweet?.created_at || tweet?.createdAt);
  const freshnessWindow = latestMode ? RECENT_WINDOW_HOURS : 24 * 7;
  const multiplier = latestMode ? 1.15 : 0.7;

  return clamp(1 - ageHours / freshnessWindow, 0, 1) * multiplier;
};

export const dedupeTweetsById = (tweets = []) => {
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

export const diversifyByAuthor = (tweets, protectedWindow = 12) => {
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

const getTopicBucket = (tweet, queryProfile) => {
  if (!queryProfile?.broadIntent) return 'general';

  const text = getTweetTextOnly(tweet);
  if (queryProfile.key === 'viral_video') {
    if (/(viral video|funny video|funniest|hilarious|comedy clip|must watch)/i.test(text)) return 'viral-main';
    if (/(meme|internet culture|lol|haha|laugh)/i.test(text)) return 'meme';
    if (/(idol|dispatch|fan cam|fancam|stan|shipping)/i.test(text)) return 'fan-share';
    return 'general';
  }

  if (queryProfile.key === 'ai') {
    if (/(openai|anthropic|google deepmind|deepmind|mistral|meta ai|claude|gemini|chatgpt|gpt-?5|gpt-?4|copilot|cursor|perplexity)/i.test(text)) return 'ai-main';
    if (/(chip|gpu|nvidia|blackwell|h100|data center|inference|training cluster|semiconductor|compute)/i.test(text)) return 'ai-infra';
    if (/(llm|language model|foundation model|ai model|agent|agents|reasoning model|benchmark|multimodal|fine-tuning|open source model)/i.test(text)) return 'ai-research';
    if (/(artificial intelligence|machine learning|generative ai|genai|\bai\b)/i.test(text)) return 'ai-general';
  }

  if (queryProfile.key === 'gaming') {
    if (/(giveaway|gaming pc|rtx|steam deck)/i.test(text)) return 'promo';
    if (/(esports|valorant|league of legends|lolesports|faze|cblol|faker|counter-strike|tournament)/i.test(text)) return 'esports';
    if (/(nintendo|switch|switch 2|playstation|ps5|xbox|steam|gta|pokemon|zelda|mario|monster hunter|studio|gamedev|game dev)/i.test(text)) return 'gaming-main';
    if (/(game|gaming|videogame|เกม)/i.test(text)) return 'gaming-general';
  }

  return 'general';
};

export const diversifyBroadResults = (tweets, queryProfile, limit = 30) => {
  if (!queryProfile?.broadIntent) return tweets.slice(0, limit);

  const buckets = new Map();
  for (const tweet of tweets) {
    const bucket = getTopicBucket(tweet, queryProfile);
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket).push(tweet);
  }

  const bucketOrder = queryProfile.key === 'gaming'
    ? ['gaming-main', 'gaming-general', 'general', 'esports', 'promo']
    : queryProfile.key === 'ai'
      ? ['ai-main', 'ai-infra', 'ai-research', 'ai-general', 'general']
    : queryProfile.key === 'viral_video'
      ? ['viral-main', 'meme', 'general', 'fan-share']
      : ['general'];

  const result = [];
  const seenIds = new Set();
  let madeProgress = true;

  while (result.length < limit && madeProgress) {
    madeProgress = false;
    for (const bucket of bucketOrder) {
      if (queryProfile.key === 'gaming' && queryProfile.preferGlobal) {
        if (bucket === 'promo') continue;
        if (bucket === 'esports') {
          const esportsCount = result.filter((tweet) => getTopicBucket(tweet, queryProfile) === 'esports').length;
          if (esportsCount >= 2) continue;
        }
      }
      if (queryProfile.key === 'viral_video' && queryProfile.preferGlobal && bucket === 'fan-share') {
        const fanShareCount = result.filter((tweet) => getTopicBucket(tweet, queryProfile) === 'fan-share').length;
        if (fanShareCount >= 1) continue;
      }
      const items = buckets.get(bucket) || [];
      while (items.length > 0 && seenIds.has(items[0].id)) items.shift();
      if (items.length === 0) continue;
      const tweet = items.shift();
      seenIds.add(tweet.id);
      result.push(tweet);
      madeProgress = true;
      if (result.length >= limit) break;
    }
  }

  if (result.length < limit) {
    for (const tweet of tweets) {
      if (seenIds.has(tweet.id)) continue;
      result.push(tweet);
      seenIds.add(tweet.id);
      if (result.length >= limit) break;
    }
  }

  return result;
};

export const ensureQueryCoverage = (curatedTweets, scoredTweets, queryTerms, latestMode) => {
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
