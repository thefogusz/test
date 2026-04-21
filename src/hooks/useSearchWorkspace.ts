import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  agentFilterFeed,
  buildSearchPlan,
  expandSearchQuery,
  generateExecutiveSummary,
  generateGrokBatch,
  tavilySearch,
} from '../services/GrokService';
import {
  analyzeSearchQueryIntent,
  clusterBySimilarity,
  curateSearchResults,
  isExplicitlyLocalQuery,
  searchEverything,
  searchEverythingDeep,
} from '../services/TwitterService';
import { useIndexedDbState } from './useIndexedDbState';
import { usePersistentState } from './usePersistentState';
import {
  COMMON_KEYWORDS,
  buildDynamicSearchTags,
  deserializeSearchHistory,
  deserializeSearchPresets,
  extractInterestTopics,
  getBroadFallbackQueries,
  getBroadQueryBlueprint,
  MAX_SEARCH_PRESETS,
  normalizeSearchLabel,
} from '../utils/searchHelpers';
import {
  getPostSummarySourceText,
  hasUsefulThaiSummary,
  mergePlanLabelsIntoQuery,
  mergeUniquePostsById,
  normalizeSearchText,
  sanitizeStoredPost,
} from '../utils/appUtils';
import { deserializeStoredCollection } from '../utils/appPersistence';
import { fetchAllSubscribedFeeds, type RssSourceInfo } from '../services/RssService';
import { RSS_CATALOG } from '../config/rssCatalog';

type UseSearchWorkspaceParams = {
  activeView: string;
  contentTab: string;
  originalFeed: any[];
  readArchive: any[];
  subscribedSources: RssSourceInfo[];
  setStatus: (value: string) => void;
  status: string;
};

type SearchCacheSnapshot = {
  lastSubmittedSearchQuery: string;
  searchCursor: string | null;
  searchOverflowResults: any[];
  searchResults: any[];
  searchSummary: string;
  searchWebSources: any[];
};

type SearchMediaType = 'all' | 'videos';
type SearchSummaryMode = 'balanced' | 'rss_first';

const SEARCH_CACHE_VERSION = 'v2';

const getSearchCacheKey = (query: string, mode: string) => [
  'foro-search',
  SEARCH_CACHE_VERSION,
  normalizeSearchLabel(query).toLowerCase(),
  mode.toLowerCase(),
];

const buildSearchRequestQuery = (query: string, mediaType: SearchMediaType) => {
  let nextQuery = String(query || '').trim();
  if (!nextQuery) return nextQuery;

  if (mediaType === 'videos' && !/\bfilter:videos\b/i.test(nextQuery)) {
    nextQuery = `${nextQuery} filter:videos`;
  }

  if (
    !isExplicitlyLocalQuery(nextQuery) &&
    !/\blang:[a-z]{2,3}\b/i.test(nextQuery)
  ) {
    nextQuery = `${nextQuery} lang:en`;
  }

  return nextQuery;
};

const buildWebSearchQuery = (query: string, mediaType: SearchMediaType) =>
  buildSearchRequestQuery(query, mediaType)
    .replace(/\bfilter:videos\b/gi, ' ')
    .replace(/\bmin_faves:\d+\b/gi, ' ')
    .replace(/\bsince:\d{4}-\d{2}-\d{2}\b/gi, ' ')
    .replace(/\b-filter:replies\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const shouldUseSearchWebContext = ({
  queryIntent,
  isComplexQuery,
  isLatestMode,
  isBroadDiscoveryQuery,
  mediaType,
}: {
  queryIntent: ReturnType<typeof analyzeSearchQueryIntent>;
  isComplexQuery: boolean;
  isLatestMode: boolean;
  isBroadDiscoveryQuery: boolean;
  mediaType: SearchMediaType;
}) => {
  if (mediaType === 'videos') return false;
  if (queryIntent.queryKey === 'viral_video') return false;
  if (isBroadDiscoveryQuery && !isLatestMode && !queryIntent.tavilyFirst) return false;

  return isComplexQuery || isLatestMode || queryIntent.tavilyFirst;
};

const shouldUseSearchExpansion = ({
  isComplexQuery,
  isLatestMode,
  isBroadDiscoveryQuery,
  mediaType,
}: {
  isComplexQuery: boolean;
  isLatestMode: boolean;
  isBroadDiscoveryQuery: boolean;
  mediaType: SearchMediaType;
}) => {
  if (mediaType === 'videos') return false;
  if (isBroadDiscoveryQuery) return false;

  return isComplexQuery || isLatestMode;
};

const buildSearchSummaryWebContext = (sources: any[] = []) =>
  sources
    .map((src: any) => `${src.citation_id || ''} ${src.title || ''} ${src.content || ''}`.trim())
    .filter(Boolean)
    .join('\n');

const THAI_LOCAL_HOST_PATTERNS = [
  /\.th$/i,
  /siamblockchain/i,
  /line\.today/i,
  /mgronline/i,
  /bangkokbiznews/i,
  /kaohoon/i,
  /thestandard/i,
  /dailynews/i,
  /khaosod/i,
  /posttoday/i,
  /matichon/i,
  /ประชาชาติ/i,
];

const getSourceHostname = (url = '') => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
};

const isThaiHeavyText = (value = '') => {
  const text = String(value || '');
  const thaiChars = text.match(/[\u0E00-\u0E7F]/g) || [];
  const latinChars = text.match(/[a-z]/gi) || [];

  return thaiChars.length >= 24 && thaiChars.length > latinChars.length * 1.5;
};

const filterSearchWebSources = (sources: any[] = [], query = '') => {
  if (isExplicitlyLocalQuery(query)) return sources;

  return sources.filter((source: any) => {
    const hostname = getSourceHostname(source?.url || '');
    if (!hostname) return false;
    if (THAI_LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) return false;

    const combinedText = `${source?.title || ''} ${source?.content || ''} ${source?.raw_content || ''}`;
    if (isThaiHeavyText(combinedText)) return false;

    return true;
  });
};

const toWebSearchCards = (sources: any[] = [], latestMode = false) =>
  sources
    .filter((source: any) => source?.url && (source?.title || source?.content || source?.raw_content))
    .map((source: any, index: number) => {
      let hostname = 'web';

      try {
        hostname = new URL(source.url).hostname.replace(/^www\./i, '') || hostname;
      } catch {
        hostname = 'web';
      }

      const title = String(source.title || '').trim();
      const content = String(source.content || source.raw_content || source.snippet || '').trim();
      const summary = content || title;

      return sanitizeStoredPost({
        id: `web:${source.url}:${index}`,
        type: 'post',
        sourceType: 'web_article',
        title,
        text: summary,
        summary,
        full_text: summary,
        url: source.url,
        citation_id: source.citation_id || `[W${index + 1}]`,
        author: {
          name: hostname,
          username: hostname,
          profile_image_url: '',
        },
        temporalTag: latestMode ? 'Breaking' : 'Related',
        ai_reasoning: 'Matched from web search coverage when social and RSS sources were limited.',
      });
    });

const RSS_SEARCH_STOP_TERMS = new Set([
  'a',
  'an',
  'and',
  'are',
  'for',
  'from',
  'in',
  'latest',
  'news',
  'of',
  'on',
  'or',
  'the',
  'to',
  'update',
  'updates',
  'with',
]);

const RSS_SEARCH_FALLBACK_SOURCE_LIMIT = 14;

const RSS_TOPIC_HINTS = [
  {
    pattern: /(ทอง|ทองคำ|ตลาด|ราคา|หุ้น|การเงิน|ลงทุน|เงินบาท|ดอลลาร์|เศรษฐกิจ|gold|bullion|market|price|finance|stock|invest|dollar|fed|commodity)/i,
    topics: ['finance', 'business', 'news'],
  },
  {
    pattern: /(คริปโต|บิตคอยน์|bitcoin|crypto|ethereum|web3)/i,
    topics: ['crypto', 'finance'],
  },
  {
    pattern: /(เกม|gaming|game|playstation|xbox|nintendo|steam)/i,
    topics: ['gaming', 'tech'],
  },
  {
    pattern: /(ai|openai|chatgpt|claude|gemini|ปัญญาประดิษฐ์|เอไอ)/i,
    topics: ['ai', 'tech'],
  },
];

const RSS_SEARCH_SYNONYM_GROUPS = [
  {
    pattern: /(ทอง|ทองคำ|gold|bullion)/i,
    terms: ['ทองคำ', 'ทอง', 'gold', 'bullion', 'gold price', 'gold market'],
  },
  {
    pattern: /(ตลาด|market|ราคา|price)/i,
    terms: ['ตลาด', 'ราคา', 'market', 'price'],
  },
  {
    pattern: /(หุ้น|stock|equity)/i,
    terms: ['หุ้น', 'stock', 'stocks', 'equity'],
  },
  {
    pattern: /(เงินบาท|ดอลลาร์|dollar|fed|เงินเฟ้อ|inflation)/i,
    terms: ['เงินบาท', 'ดอลลาร์', 'dollar', 'fed', 'inflation'],
  },
];

const uniqueBySourceId = (sources: RssSourceInfo[] = []) => {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const id = String(source?.id || '').trim().toLowerCase();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const getInferredRssSources = (query: string) => {
  const matchedTopics = new Set<string>();

  RSS_TOPIC_HINTS.forEach(({ pattern, topics }) => {
    if (pattern.test(query)) {
      topics.forEach((topic) => matchedTopics.add(topic));
    }
  });

  return Array.from(matchedTopics)
    .flatMap((topic) => RSS_CATALOG[topic] || [])
    .filter((source) => source.type !== 'community');
};

const getRssSearchSources = (query: string, subscribedSources: RssSourceInfo[] = []) =>
  uniqueBySourceId([
    ...subscribedSources,
    ...getInferredRssSources(query),
  ]).slice(0, RSS_SEARCH_FALLBACK_SOURCE_LIMIT);

const buildRssQueryTerms = (query: string): string[] => {
  const normalizedQuery = normalizeSearchText(query);
  const terms = new Set<string>(
    normalizedQuery
      .split(' ')
      .map((term) => term.trim())
      .filter((term) => term.length > 1 && !RSS_SEARCH_STOP_TERMS.has(term)),
  );

  RSS_SEARCH_SYNONYM_GROUPS.forEach(({ pattern, terms: synonyms }) => {
    if (pattern.test(query) || pattern.test(normalizedQuery)) {
      synonyms.forEach((term) => terms.add(normalizeSearchText(term)));
    }
  });

  return Array.from(terms).filter(Boolean);
};

const buildRssSearchResults = async (
  query: string,
  sources: RssSourceInfo[],
  mediaType: SearchMediaType,
) => {
  if (mediaType === 'videos') return [];

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const queryTerms = buildRssQueryTerms(query);
  if (!queryTerms.length) return [];

  const rssSources = getRssSearchSources(query, sources);
  if (!rssSources.length) return [];

  const rssPosts = await fetchAllSubscribedFeeds(rssSources, 6);

  return rssPosts
    .map((post) => {
      const title = String(post?.title || '');
      const titleText = normalizeSearchText(title);
      const haystack = normalizeSearchText(
        `${title} ${post?.text || ''} ${post?.author?.name || ''} ${post?.url || ''}`,
      );
      const fullMatch = haystack.includes(normalizedQuery);
      const matchedTerms = queryTerms.filter((term) => {
        try {
          const regex = new RegExp(`(^|\\W)${term}(\\W|$)`, 'i');
          return regex.test(haystack) || (term.length > 3 && haystack.includes(term));
        } catch {
          return haystack.includes(term);
        }
      });
      const titleMatches = queryTerms.filter((term) => {
        try {
          const regex = new RegExp(`(^|\\W)${term}(\\W|$)`, 'i');
          return regex.test(titleText) || (term.length > 3 && titleText.includes(term));
        } catch {
          return titleText.includes(term);
        }
      }).length;

      const recencyHours = Math.max(
        0,
        (Date.now() - new Date(post?.created_at || 0).getTime()) / (1000 * 60 * 60),
      );

      return {
        post,
        score:
          (fullMatch ? 12 : 0) +
          matchedTerms.length * 4 +
          titleMatches * 3 +
          (matchedTerms.length > 0 ? Math.max(0, 72 - recencyHours) * 0.05 : 0),
        matchedTerms,
        titleMatches,
        fullMatch,
      };
    })
    .filter(({ score, matchedTerms, titleMatches, fullMatch }) => {
      if (matchedTerms.length === 0) return false;
      if (fullMatch) return true;
      if (titleMatches === 0 && matchedTerms.length < queryTerms.length) return false;
      return score >= 7;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ post }) => sanitizeStoredPost(post));
};

const mergeSearchCards = (xResults: any[], rssResults: any[], latestMode: boolean) => {
  if (!rssResults.length) return xResults;
  if (!xResults.length) return rssResults;

  if (latestMode) {
    return [...xResults, ...rssResults]
      .sort(
        (left, right) =>
          new Date(right?.created_at || right?.createdAt || 0).getTime() -
          new Date(left?.created_at || left?.createdAt || 0).getTime(),
      )
      .map(sanitizeStoredPost);
  }

  const merged: any[] = [];
  const xQueue = [...xResults];
  const rssQueue = [...rssResults];

  for (let i = 0; i < 4; i++) {
    if (xQueue.length) merged.push(xQueue.shift());
  }

  while (xQueue.length || rssQueue.length) {
    if (rssQueue.length) merged.push(rssQueue.shift());
    if (xQueue.length) merged.push(xQueue.shift());
    if (xQueue.length) merged.push(xQueue.shift());
    if (xQueue.length) merged.push(xQueue.shift());
  }

  return mergeUniquePostsById(merged).map(sanitizeStoredPost);
};

const buildSummaryCandidates = (
  posts: any[],
  summaryMode: SearchSummaryMode,
  latestMode: boolean,
  focusMode: SearchFocusMode | null = null,
) => {
  const normalizedPosts = mergeUniquePostsById(posts).map(sanitizeStoredPost);
  const getCandidateScore = (post: any) => {
    const focusSignals = getFocusSignals(post);
    const focusBoost = focusMode ? (focusSignals[focusMode] || 0) * 2.2 : 0;
    const impactBoost = focusSignals.impact * 1.6;
    const latestBoost = latestMode ? focusSignals.latest * 1.8 : 0;
    const searchBoost = toNumber(post?.search_score) * 2.4;
    const rssBoost =
      summaryMode === 'rss_first'
        ? String(post?.sourceType || '').toLowerCase() === 'rss'
          ? 6.5
          : 0.75
        : 0;

    return impactBoost + focusBoost + latestBoost + searchBoost + rssBoost;
  };

  const sortForSummary = (items: any[]) =>
    [...items].sort((left, right) => getCandidateScore(right) - getCandidateScore(left));

  if (summaryMode !== 'rss_first') return sortForSummary(normalizedPosts).slice(0, 16);

  const rssPosts = sortForSummary(normalizedPosts.filter((post) => post?.sourceType === 'rss'));
  const xPosts = sortForSummary(normalizedPosts.filter((post) => post?.sourceType !== 'rss'));

  if (!rssPosts.length || !xPosts.length) return sortForSummary(normalizedPosts).slice(0, 16);

  const blended: any[] = [];
  while ((rssPosts.length || xPosts.length) && blended.length < 16) {
    if (rssPosts.length) blended.push(rssPosts.shift());
    if (rssPosts.length) blended.push(rssPosts.shift());
    if (xPosts.length) blended.push(xPosts.shift());
    if (xPosts.length) blended.push(xPosts.shift());
  }

  return mergeUniquePostsById(blended).map(sanitizeStoredPost).slice(0, 16);
};

const resolveAutomaticSummaryMode = (
  posts: any[],
  mediaType: SearchMediaType,
): SearchSummaryMode => {
  if (mediaType === 'videos') return 'balanced';

  return posts.some((post) => String(post?.sourceType || '').toLowerCase() === 'rss')
    ? 'rss_first'
    : 'balanced';
};

const readNextCursor = (meta: { next_cursor?: string | null } | null | undefined) =>
  meta?.next_cursor || null;

type SearchFocusMode = 'impact' | 'latest' | 'companies' | 'research';

const SEARCH_FOCUS_LABELS: Record<SearchFocusMode, string> = {
  impact: 'ข่าวใหญ่',
  latest: 'ล่าสุด',
  companies: 'บริษัท/โปรดักต์',
  research: 'วิจัย/เทคนิค',
};

const SEARCH_CHOICE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const toNumber = (value: unknown) => {
  const normalized = String(value ?? '0').replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getHoursAgo = (value: unknown) => {
  const timestamp = value ? new Date(String(value)).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return 999;
  return Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
};

const getFocusSignals = (post: any) => {
  const text = String(post?.text || '').toLowerCase();
  const searchScore = toNumber(post?.search_score);
  const engagement =
    toNumber(post?.like_count || post?.likeCount) +
    toNumber(post?.retweet_count || post?.retweetCount) +
    toNumber(post?.reply_count || post?.replyCount) +
    toNumber(post?.quote_count || post?.quoteCount);
  const followers = toNumber(post?.author?.followers || post?.author?.fastFollowersCount);
  const views = toNumber(post?.view_count || post?.viewCount);
  const recencyHours = getHoursAgo(post?.created_at || post?.createdAt);
  const freshnessBoost = recencyHours <= 6 ? 4 : recencyHours <= 24 ? 2.8 : recencyHours <= 72 ? 1.2 : 0.2;
  const impactScore =
    searchScore * 3.2 +
    Math.log10(engagement + 1) * 2.4 +
    Math.log10(views + 1) * 0.8 +
    Math.log10(followers + 1) * 0.5 +
    (post?.author?.isVerified ? 1.1 : post?.author?.isBlueVerified ? 0.35 : 0);
  const companiesScore =
    (/(launch|release|announce|announces|acquire|acquires|funding|raises|valuation|partnership|enterprise|customer|product|feature|rollout|ships|deploy|copilot|chatgpt|claude|gemini|openai|anthropic|microsoft|google|meta|apple|amazon|nvidia|startup)/i.test(text)
      ? 3
      : 0) +
    (/(ceo|founder|company|firm|startup|business|revenue|pricing|valuation)/i.test(text) ? 1.4 : 0);
  const researchScore =
    (/(paper|research|study|benchmark|model|llm|dataset|arxiv|reasoning|multimodal|inference|training|agent|open source|weights|architecture|alignment|safety)/i.test(text)
      ? 3
      : 0) +
    (/(researchers|university|lab|labs|stanford|mit|deepmind|anthropic fellows)/i.test(text) ? 1.4 : 0);

  return {
    impact: impactScore,
    latest: freshnessBoost + searchScore * 0.35,
    companies: companiesScore + impactScore * 0.22,
    research: researchScore + impactScore * 0.18,
  };
};

const rerankPostsByFocus = (posts: any[], focus: SearchFocusMode | null) => {
  if (!focus) return posts;

  return [...posts]
    .map((post) => {
      const focusSignals = getFocusSignals(post);
      const focusBoost = focusSignals[focus] || 0;
      return {
        ...post,
        _focusBoost: focusBoost,
        _focusSignals: focusSignals,
      };
    })
    .sort((left, right) => {
      const leftBase = toNumber(left.search_score);
      const rightBase = toNumber(right.search_score);
      const leftScore = leftBase * 0.92 + toNumber(left._focusBoost) * 1.25;
      const rightScore = rightBase * 0.92 + toNumber(right._focusBoost) * 1.25;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return new Date(right.created_at || right.createdAt || 0).getTime() - new Date(left.created_at || left.createdAt || 0).getTime();
    })
    .map(({ _focusBoost, _focusSignals, ...post }) => post);
};

const summarizeFocusLandscape = (posts: any[]) => {
  const totals: Record<SearchFocusMode, number> = {
    impact: 0,
    latest: 0,
    companies: 0,
    research: 0,
  };

  posts.slice(0, 12).forEach((post) => {
    const signals = getFocusSignals(post);
    (Object.keys(totals) as SearchFocusMode[]).forEach((key) => {
      totals[key] += signals[key];
    });
  });

  return totals;
};

export const useSearchWorkspace = ({
  activeView,
  contentTab,
  originalFeed,
  readArchive,
  subscribedSources,
  setStatus,
  status,
}: UseSearchWorkspaceParams) => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = usePersistentState(STORAGE_KEYS.searchQuery, '');
  const [searchMediaType, setSearchMediaType] = usePersistentState<SearchMediaType>(
    STORAGE_KEYS.searchMediaType,
    'all',
  );
  const [searchResults, setSearchResults] = useIndexedDbState(STORAGE_KEYS.searchResults, [], {
    deserialize: deserializeStoredCollection,
  });
  const [searchSummary, setSearchSummary] = useIndexedDbState(STORAGE_KEYS.searchSummary, '');
  const [searchPresets, setSearchPresets] = usePersistentState(STORAGE_KEYS.searchPresets, [], {
    deserialize: deserializeSearchPresets,
  });
  const [searchHistory, setSearchHistory] = usePersistentState(STORAGE_KEYS.searchHistory, [], {
    deserialize: deserializeSearchHistory,
  });
  const [searchLearningProfile, setSearchLearningProfile] = usePersistentState(
    STORAGE_KEYS.searchLearningProfile,
    {
      globalFocusCounts: {},
      queryKeyFocusCounts: {},
      dismissedChoiceAt: {},
    },
  );
  const [searchWebSources, setSearchWebSources] = useIndexedDbState(STORAGE_KEYS.searchWebSources, [], {
    deserialize: deserializeStoredCollection,
  });
  const [lastSubmittedSearchQuery, setLastSubmittedSearchQuery] = useState('');
  const [searchOverflowResults, setSearchOverflowResults] = useState<any[]>([]);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [searchCursor, setSearchCursor] = useState<string | null>(null);
  const [activeSearchPlan, setActiveSearchPlan] = useState<any>(null);
  const [isLatestMode, setIsLatestMode] = useState(false);
  const [activeSearchFocus, setActiveSearchFocus] = useState<SearchFocusMode | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isLiveSearching, setIsLiveSearching] = useState(false);

  const progressivelyTranslateSearchResults = (posts: any[] = []) => {
    const translationCandidates = mergeUniquePostsById(posts)
      .filter((post) => {
        const sourceText = getPostSummarySourceText(post);
        return sourceText && !hasUsefulThaiSummary(post?.summary, sourceText);
      });

    if (!translationCandidates.length) return;

    const CHUNK_SIZE = 5;
    void (async () => {
      try {
        for (let index = 0; index < translationCandidates.length; index += CHUNK_SIZE) {
          const chunk = translationCandidates.slice(index, index + CHUNK_SIZE);
          const batchTexts = chunk.map((post) => getPostSummarySourceText(post));
          const summaries = await generateGrokBatch(batchTexts);

          setSearchResults((prev) =>
            prev.map((post) => {
              const chunkIndex = chunk.findIndex((item) => item.id === post.id);
              if (chunkIndex === -1) return post;

              const nextSummary = summaries[chunkIndex] || post.text;
              return hasUsefulThaiSummary(nextSummary, getPostSummarySourceText(post))
                ? { ...post, summary: nextSummary }
                : post;
            }),
          );
        }
      } catch (batchError) {
        console.warn('[Search] Progressive translation failed:', batchError);
      }
    })();
  };

  const recordSearchInterest = (rawQuery: string) => {
    const normalizedQuery = normalizeSearchLabel(rawQuery);
    if (!normalizedQuery) return;

    setSearchHistory((prev: any[]) => {
      const now = new Date().toISOString();
      const next = Array.isArray(prev) ? [...prev] : [];
      const existingIndex = next.findIndex(
        (item) => item.query.toLowerCase() === normalizedQuery.toLowerCase(),
      );

      if (existingIndex >= 0) {
        const existing = next[existingIndex];
        next[existingIndex] = {
          ...existing,
          query: existing.query,
          count: (existing.count || 0) + 1,
          lastUsedAt: now,
        };
      } else {
        next.unshift({ query: normalizedQuery, count: 1, lastUsedAt: now });
      }

      return next
        .sort((left, right) => {
          if ((right.count || 0) !== (left.count || 0)) return (right.count || 0) - (left.count || 0);
          return new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime();
        })
        .slice(0, 12);
    });
  };

  const addSearchPreset = (rawQuery: string) => {
    const normalizedQuery = normalizeSearchLabel(rawQuery);
    if (!normalizedQuery) return;

    setSearchPresets((prev: string[]) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      if (next.some((item) => item.toLowerCase() === normalizedQuery.toLowerCase())) return next;
      return [normalizedQuery, ...next].slice(0, MAX_SEARCH_PRESETS);
    });
  };

  const removeSearchPreset = (labelToRemove: string) => {
    setSearchPresets((prev: string[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (item) => item.toLowerCase() !== labelToRemove.toLowerCase(),
      ),
    );
  };

  const persistFocusChoice = (focus: SearchFocusMode, queryLabel: string, queryKey: string) => {
    setSearchLearningProfile((prev: any) => {
      const safePrev = prev && typeof prev === 'object' ? prev : {};
      const nextGlobal = { ...(safePrev.globalFocusCounts || {}) };
      const nextByQueryKey = { ...(safePrev.queryKeyFocusCounts || {}) };
      const nextDismissed = { ...(safePrev.dismissedChoiceAt || {}) };

      nextGlobal[focus] = toNumber(nextGlobal[focus]) + 1;
      nextByQueryKey[queryKey] = {
        ...(nextByQueryKey[queryKey] || {}),
        [focus]: toNumber(nextByQueryKey[queryKey]?.[focus]) + 1,
      };
      if (queryLabel) delete nextDismissed[queryLabel.toLowerCase()];

      return {
        ...safePrev,
        globalFocusCounts: nextGlobal,
        queryKeyFocusCounts: nextByQueryKey,
        dismissedChoiceAt: nextDismissed,
      };
    });
  };

  const generateSearchSummary = async ({
    summaryCandidates,
    requestedQuery,
    webContext,
    preferXSummary,
    focusMode,
    summaryMode,
    cacheKey = null,
    cachedWebSources = [],
  }: {
    summaryCandidates: any[];
    requestedQuery: string;
    webContext: string;
    preferXSummary: boolean;
    focusMode: SearchFocusMode | null;
    summaryMode: SearchSummaryMode;
    cacheKey?: ReturnType<typeof getSearchCacheKey> | null;
    cachedWebSources?: any[];
  }) => {
    const summaryText = await generateExecutiveSummary(
      summaryCandidates,
      requestedQuery,
      (_, fullText) => {
        setSearchSummary(fullText);
      },
      webContext,
      {
        preferXSummary,
        allowWebLead: !preferXSummary,
        focusMode,
        summaryMode,
      },
    );

    if (summaryText) {
      setSearchSummary(summaryText);

      if (cacheKey) {
        queryClient.setQueryData<SearchCacheSnapshot>(cacheKey, (prev) =>
          prev
            ? {
              ...prev,
              searchSummary: summaryText,
              searchWebSources: cachedWebSources,
            }
            : prev,
        );
      }
    }

    return summaryText;
  };

  const searchMutation = useMutation({
    mutationFn: async ({
      isMore = false,
      overrideQuery = '',
    }: {
      isMore?: boolean;
      overrideQuery?: string;
    }) => {
      const requestedQuery = overrideQuery || searchQuery;
      const effectiveRequestedQuery = buildSearchRequestQuery(requestedQuery, searchMediaType);
      const normalizedRequestedQueryLabel = normalizeSearchLabel(requestedQuery);

      if (!requestedQuery && !isMore) return;

      if (isMore && searchOverflowResults.length > 0) {
        const nextChunk = searchOverflowResults.slice(0, 10);
        setSearchResults((prev) => [...prev, ...nextChunk].map(sanitizeStoredPost));
        setSearchOverflowResults((prev) => prev.slice(10));
        return;
      }

      if (!isMore) {
        recordSearchInterest(requestedQuery);
        setLastSubmittedSearchQuery(normalizedRequestedQueryLabel);
        setIsLiveSearching(true);
      }

      const isComplexQuery = !/ฮา|ตลก|ขำ|funny|meme|lol|haha/i.test(requestedQuery);
      const normalizedRequestedQuery = normalizeSearchText(requestedQuery);
      const queryTokenCount = normalizedRequestedQuery ? normalizedRequestedQuery.split(' ').length : 0;
      const legacyBroadDiscoveryQuery =
        queryTokenCount > 0 &&
        queryTokenCount <= 3 &&
        !/ล่าสุด|วันนี้|breaking|เปิดตัว|ประกาศ|ด่วน|now|today|update|news|ข่าว|รีวิว|เทียบ|vs|หลุด/i.test(requestedQuery) &&
        !/from:|since:|until:|@|"/i.test(requestedQuery);
      const queryIntent = analyzeSearchQueryIntent(requestedQuery);
      const effectiveFocus = activeSearchFocus;
      const effectiveBroadDiscoveryQuery = queryIntent.broadDiscoveryIntent || legacyBroadDiscoveryQuery;
      const effectiveLatestMode = isLatestMode || queryIntent.forceLatestMode;
      const shouldFetchWebContext = shouldUseSearchWebContext({
        queryIntent,
        isComplexQuery,
        isLatestMode: effectiveLatestMode,
        isBroadDiscoveryQuery: effectiveBroadDiscoveryQuery,
        mediaType: searchMediaType,
      });
      const shouldExpandQuery = shouldUseSearchExpansion({
        isComplexQuery,
        isLatestMode: effectiveLatestMode,
        isBroadDiscoveryQuery: effectiveBroadDiscoveryQuery,
        mediaType: searchMediaType,
      });
      const onlyNews = searchMediaType !== 'videos' && queryIntent.queryKey !== 'viral_video' && !/video|คลิป/i.test(requestedQuery);
      const searchQueryType = effectiveLatestMode ? 'Latest' : 'Top';
      const cacheKey = getSearchCacheKey(`${requestedQuery}::${searchMediaType}`, searchQueryType);

      if (!isMore) {
        const cached = queryClient.getQueryData<SearchCacheSnapshot>(cacheKey);
        if (cached) {
          setSearchResults(cached.searchResults.map(sanitizeStoredPost));
          setSearchOverflowResults(cached.searchOverflowResults.map(sanitizeStoredPost));
          setSearchSummary(cached.searchSummary);
          setSearchWebSources(cached.searchWebSources);
          setSearchCursor(cached.searchCursor);
          setLastSubmittedSearchQuery(cached.lastSubmittedSearchQuery);
          setActiveSearchFocus(effectiveFocus);
          setIsLiveSearching(false);
          setStatus(`โหลดผลลัพธ์ที่แคชไว้สำหรับ "${requestedQuery}"`);
          return;
        }
      }

      if (!isMore) {
        setSearchSummary('');
      }
      setStatus(`AI กำลังค้นหาข้อมูลสำหรับ "${requestedQuery}"...`);

      try {
        let webContext = '';
        let searchPlan = activeSearchPlan;
        let resolvedSearchWebSources: any[] = [];
        let webFallbackResults: any[] = [];
        const broadBlueprint = effectiveBroadDiscoveryQuery
          ? getBroadQueryBlueprint(requestedQuery)
          : null;
        const broadFallbackQueries = effectiveBroadDiscoveryQuery
          ? getBroadFallbackQueries(requestedQuery)
          : [];
        const shouldUseAdaptivePlan = isComplexQuery && !effectiveBroadDiscoveryQuery;
        const rawDataChunks: any[][] = [];
        let rssSearchResults: any[] = [];
        let finalCursor: string | null = null;

        const getScopedQuery = (query: string, lane = 'default') => {
          let scopedQuery = query;

          if (effectiveLatestMode) {
            if (!query.includes('since:')) {
              const date = new Date();
              date.setHours(date.getHours() - 24);
              scopedQuery = `${query} since:${date.toISOString().split('T')[0]}`;
            }

            if (!query.includes('min_faves:')) {
              const latestMinFaves = effectiveBroadDiscoveryQuery
                ? lane === 'exact'
                  ? 10
                  : lane === 'broad'
                    ? 25
                    : 40
                : isComplexQuery
                  ? 5
                  : 2;
              scopedQuery = `${scopedQuery} min_faves:${latestMinFaves}`;
            }
          } else if (!query.includes('min_faves:')) {
            const topMinFaves = effectiveBroadDiscoveryQuery
              ? lane === 'exact'
                ? 15
                : lane === 'broad'
                  ? 40
                  : 75
              : isComplexQuery
                ? 10
                : 3;
            scopedQuery = `${scopedQuery} min_faves:${topMinFaves}`;
          }

          return scopedQuery;
        };

        if (!isMore) {
          setStatus('[Phase 2] Async Parallel Fetch: Search Context + Broad X Search...');
          const webSearchQuery = buildWebSearchQuery(requestedQuery, searchMediaType);

          const tavilyPromise =
            shouldFetchWebContext
              ? tavilySearch(webSearchQuery || requestedQuery, effectiveLatestMode)
              : Promise.resolve({ results: [], answer: '' });
          const rssSearchPromise = buildRssSearchResults(
            requestedQuery,
            subscribedSources,
            searchMediaType,
          ).catch((error) => {
            console.warn(`[Search] Failed RSS search: ${requestedQuery}`, error);
            return [];
          });
          const expandedBroadQueryPromise = shouldExpandQuery
            ? expandSearchQuery(
              effectiveRequestedQuery,
              effectiveLatestMode,
            ).catch((error) => {
              console.warn(`[Search] Failed to expand query: ${requestedQuery}`, error);
              return effectiveRequestedQuery;
            })
            : Promise.resolve(effectiveRequestedQuery);
          const exactSearchPromise = effectiveBroadDiscoveryQuery
            ? searchEverythingDeep(
              getScopedQuery(effectiveRequestedQuery, 'exact'),
              null,
              onlyNews,
              searchQueryType,
              2,
            ).catch((error) => {
              console.warn(`[Search] Failed exact query: ${requestedQuery}`, error);
              return { data: [], meta: {} };
            })
            : Promise.resolve({ data: [], meta: {} });
          const broadSearchPromise = expandedBroadQueryPromise.then((expandedBroadQuery) => {
            const broadQuery = getScopedQuery(
              expandedBroadQuery || effectiveRequestedQuery,
              'broad',
            );
            return searchEverythingDeep(
              broadQuery,
              null,
              onlyNews,
              searchQueryType,
              4,
            ).catch((error) => {
              console.warn(`[Search] Failed broad query: ${broadQuery}`, error);
              return { data: [], meta: {} };
            });
          });
          const entitySearchPromise =
            effectiveBroadDiscoveryQuery && broadBlueprint?.entityQuery
              ? searchEverythingDeep(
                getScopedQuery(
                  buildSearchRequestQuery(broadBlueprint.entityQuery, searchMediaType),
                  'entity',
                ),
                null,
                onlyNews,
                searchQueryType,
                3,
              ).catch((error) => {
                console.warn(`[Search] Failed entity query: ${broadBlueprint.entityQuery}`, error);
                return { data: [], meta: {} };
              })
              : Promise.resolve({ data: [], meta: {} });
          const viralSearchPromise =
            effectiveBroadDiscoveryQuery && broadBlueprint?.viralQuery
              ? searchEverythingDeep(
                getScopedQuery(
                  buildSearchRequestQuery(broadBlueprint.viralQuery, searchMediaType),
                  'viral',
                ),
                null,
                onlyNews,
                searchQueryType,
                3,
              ).catch((error) => {
                console.warn(`[Search] Failed viral query: ${broadBlueprint.viralQuery}`, error);
                return { data: [], meta: {} };
              })
              : Promise.resolve({ data: [], meta: {} });

          const [webData, exactResult, broadResult, entityResult, viralResult, resolvedRssSearchResults] = await Promise.all([
            tavilyPromise,
            exactSearchPromise,
            broadSearchPromise,
            entitySearchPromise,
            viralSearchPromise,
            rssSearchPromise,
          ]);
          rssSearchResults = resolvedRssSearchResults;

          if (exactResult.data?.length) rawDataChunks.push(exactResult.data);
          if (broadResult.data?.length) rawDataChunks.push(broadResult.data);
          if (entityResult.data?.length) rawDataChunks.push(entityResult.data);
          if (viralResult.data?.length) rawDataChunks.push(viralResult.data);
          if (!finalCursor && readNextCursor(broadResult.meta)) finalCursor = readNextCursor(broadResult.meta);
          if (!finalCursor && readNextCursor(exactResult.meta)) finalCursor = readNextCursor(exactResult.meta);
          if (!finalCursor && readNextCursor(entityResult.meta)) finalCursor = readNextCursor(entityResult.meta);
          if (!finalCursor && readNextCursor(viralResult.meta)) finalCursor = readNextCursor(viralResult.meta);

          const initialMergedBroadData = mergeUniquePostsById(...rawDataChunks);
          if (effectiveBroadDiscoveryQuery && initialMergedBroadData.length < 8 && broadFallbackQueries.length > 0) {
            setStatus('[Fallback] ลองขยายคำค้นหาอัตโนมัติด้วยคำที่ใกล้เคียง...');
            const fallbackResults = await Promise.all(
              broadFallbackQueries.map((fallbackQuery, index) =>
                searchEverythingDeep(
                  getScopedQuery(
                    buildSearchRequestQuery(fallbackQuery, searchMediaType),
                    index === 0 ? 'exact' : 'broad',
                  ),
                  null,
                  onlyNews,
                  searchQueryType,
                  index === 0 ? 2 : 3,
                ).catch((error) => {
                  console.warn(`[Search] Failed fallback broad query: ${fallbackQuery}`, error);
                  return { data: [], meta: {} };
                }),
              ),
            );

            fallbackResults.forEach((result) => {
              if (result.data?.length) rawDataChunks.push(result.data);
              if (!finalCursor && readNextCursor(result.meta)) finalCursor = readNextCursor(result.meta);
            });
          }

          if (webData && (webData.results?.length || webData.answer)) {
            const filteredWebResults = filterSearchWebSources(webData.results || [], requestedQuery);
            const webResultsWithCitations = filteredWebResults.map((result: any, index: number) => ({
              ...result,
              citation_id: `[W${index + 1}]`,
            }));

            webContext = [
              filteredWebResults.length > 0 && webData.answer ? `[WEB NEWS ANSWER]\n${webData.answer}` : '',
              webResultsWithCitations
                .map(
                  (result: any) =>
                    `${result.citation_id} ${result.title}: ${result.content?.slice(0, 200)}... (${result.url})`,
                )
                .join('\n'),
            ]
              .filter(Boolean)
              .join('\n\n');
            resolvedSearchWebSources = webResultsWithCitations;
            webFallbackResults = toWebSearchCards(webResultsWithCitations, effectiveLatestMode);
            setSearchWebSources(webResultsWithCitations);
          } else {
            resolvedSearchWebSources = [];
            webFallbackResults = [];
            setSearchWebSources([]);
          }

          if (shouldUseAdaptivePlan) {
            setStatus('[API] ออกแบบกลยุทธ์แสกนเชิงลึก (Precision Snipe) จาก Context...');
            searchPlan = await buildSearchPlan(requestedQuery, effectiveLatestMode, webContext, isComplexQuery);
            setActiveSearchPlan(searchPlan);

            const snipeQueryRaw = searchPlan?.queries?.find(
              (query: string) => query !== requestedQuery && query !== `${requestedQuery} -filter:replies`,
            );

            if (snipeQueryRaw) {
              setStatus('[Phase 2] Async Parallel Fetch: X Search Precision Snipe...');
              const snipeQuery = getScopedQuery(
                buildSearchRequestQuery(snipeQueryRaw, searchMediaType),
              );

              try {
                const snipeResult = await searchEverything(
                  snipeQuery,
                  null,
                  onlyNews,
                  searchQueryType,
                  true,
                );
                if (snipeResult.data?.length) rawDataChunks.push(snipeResult.data);
                if (!finalCursor && readNextCursor(snipeResult.meta)) finalCursor = readNextCursor(snipeResult.meta);
              } catch (error) {
                console.warn(`[Search] Failed snipe query: ${snipeQuery}`, error);
              }
            }
          } else {
            setActiveSearchPlan(null);
          }
        } else {
          setStatus('[API] ดึงข้อมูล X Search เพิ่มเติม...');
          const planQueries =
            searchPlan?.queries?.length > 0 ? searchPlan.queries : [effectiveRequestedQuery];

          for (const query of planQueries) {
            const scopedQuery = getScopedQuery(buildSearchRequestQuery(query, searchMediaType));
            try {
              const searchResponse = effectiveBroadDiscoveryQuery
                ? await searchEverythingDeep(scopedQuery, searchCursor, onlyNews, searchQueryType, 2)
                : await searchEverything(scopedQuery, searchCursor, onlyNews, searchQueryType, false);
              const { data: chunk, meta } = searchResponse;
              if (chunk.length > 0) rawDataChunks.push(chunk);
              if (!finalCursor) finalCursor = meta.next_cursor;
            } catch (error) {
              console.warn(`[Search] Pagination failed: ${scopedQuery}`, error);
            }
          }
        }

        const rankingQuery = shouldUseAdaptivePlan
          ? mergePlanLabelsIntoQuery(requestedQuery, searchPlan?.topicLabels || [])
          : requestedQuery;
        const data = mergeUniquePostsById(...rawDataChunks);

        if (!isMore && data.length === 0 && rssSearchResults.length > 0) {
          const mergedResults = mergeSearchCards([], rssSearchResults, effectiveLatestMode);
          const effectiveSummaryMode = resolveAutomaticSummaryMode(mergedResults, searchMediaType);

          setSearchResults(mergedResults);
          setSearchOverflowResults([]);
          setSearchCursor(finalCursor);
          setActiveSearchFocus(effectiveFocus);
          setStatus(`ค้นพบ ${mergedResults.length} ข่าวจาก RSS`);

          const snapshot: SearchCacheSnapshot = {
            lastSubmittedSearchQuery: normalizedRequestedQueryLabel,
            searchCursor: finalCursor,
            searchOverflowResults: [],
            searchResults: mergedResults,
            searchSummary: '',
            searchWebSources: resolvedSearchWebSources,
          };
          queryClient.setQueryData(cacheKey, snapshot);

          setStatus('[Agent 3/3] กำลังสังเคราะห์ข้อมูลและเขียน Executive Summary...');
          setSearchSummary('');
          void generateSearchSummary({
            summaryCandidates: buildSummaryCandidates(
              mergedResults,
              effectiveSummaryMode,
              effectiveLatestMode,
              effectiveFocus,
            ),
            requestedQuery,
            webContext,
            preferXSummary: false,
            focusMode: effectiveFocus,
            summaryMode: effectiveSummaryMode,
            cacheKey,
            cachedWebSources: resolvedSearchWebSources,
          })
            .catch((summaryError) => {
              console.warn('[Search] Executive summary failed:', summaryError);
            });

          progressivelyTranslateSearchResults(mergedResults);

          return;
        }

        if (!isMore && data.length === 0 && webFallbackResults.length > 0) {
          const effectiveSummaryMode = resolveAutomaticSummaryMode(webFallbackResults, searchMediaType);

          setSearchResults(webFallbackResults);
          setSearchOverflowResults([]);
          setSearchCursor(finalCursor);
          setActiveSearchFocus(effectiveFocus);
          setStatus(`Found ${webFallbackResults.length} web articles from search context`);

          const snapshot: SearchCacheSnapshot = {
            lastSubmittedSearchQuery: normalizedRequestedQueryLabel,
            searchCursor: finalCursor,
            searchOverflowResults: [],
            searchResults: webFallbackResults,
            searchSummary: '',
            searchWebSources: resolvedSearchWebSources,
          };
          queryClient.setQueryData(cacheKey, snapshot);

          setStatus('[Agent 3/3] Generating executive summary from web coverage...');
          setSearchSummary('');
          void generateSearchSummary({
            summaryCandidates: buildSummaryCandidates(
              webFallbackResults,
              effectiveSummaryMode,
              effectiveLatestMode,
              effectiveFocus,
            ),
            requestedQuery,
            webContext,
            preferXSummary: false,
            focusMode: effectiveFocus,
            summaryMode: effectiveSummaryMode,
            cacheKey,
            cachedWebSources: resolvedSearchWebSources,
          })
            .catch((summaryError) => {
              console.warn('[Search] Executive summary failed:', summaryError);
            });

          return;
        }

        if (data.length > 0) {
          setStatus('[Quality Gate] คัดกรองและประเมิน Engagement...');
          const curated = curateSearchResults(data, rankingQuery, {
            latestMode: effectiveLatestMode,
            preferCredibleSources: isComplexQuery && !effectiveBroadDiscoveryQuery,
          });

          setStatus('[Agent 2/3] กำลังกรองสแปมและคัดเลือกโพสต์ระดับคุณภาพจากฐานข้อมูล...');
          let cleanData: any[] = [];
          let nextOverflowResults: any[] = [];

          if (effectiveBroadDiscoveryQuery) {
            const broadCandidatePool =
              curated.length > 0 ? curated : data.slice(0, Math.min(data.length, 20));
            const rankedBroadResults = broadCandidatePool
              .slice(0, Math.min(broadCandidatePool.length, 30))
              .map((tweet, index) => ({
                ...tweet,
                ai_reasoning:
                  tweet.ai_reasoning ||
                  (curated.length > 0
                    ? 'Kept from the global-first ranked result set for this broad query.'
                    : 'Kept from the fallback broad-topic result set after the strict quality gate returned empty.'),
                temporalTag: tweet.temporalTag || (effectiveLatestMode ? 'Breaking' : 'Related'),
                citation_id: tweet.citation_id || `[F${index + 1}]`,
              }));

            if (isMore) {
              const mergedBroadResults = mergeUniquePostsById(
                searchResults,
                searchOverflowResults,
                rankedBroadResults,
              );
              cleanData = mergedBroadResults.slice(
                0,
                Math.min(mergedBroadResults.length, searchResults.length + 10),
              );
              nextOverflowResults = mergedBroadResults.slice(cleanData.length);
            } else {
              cleanData = rankedBroadResults.slice(0, Math.min(rankedBroadResults.length, 10));
              nextOverflowResults = rankedBroadResults.slice(cleanData.length);
            }
          } else {
            setStatus('[Agent 2/3] Selecting the highest-quality posts from the search pool...');
            const dedupedCurated = clusterBySimilarity(curated, 0.55);
            const validPicks = await agentFilterFeed(dedupedCurated, rankingQuery, {
              preferCredibleSources: isComplexQuery,
              webContext,
              isComplexQuery,
            });
            const pickedData = dedupedCurated
              .filter((tweet) => validPicks.some((pick) => String(pick.id) === String(tweet.id)))
              .map((tweet) => {
                const pick = validPicks.find((item) => String(item.id) === String(tweet.id));
                return {
                  ...tweet,
                  ai_reasoning: pick?.reasoning,
                  temporalTag: pick?.temporalTag,
                  citation_id: pick?.citation_id,
                };
              });
            const shouldFallbackToCurated = pickedData.length === 0;
            cleanData =
              !shouldFallbackToCurated && pickedData.length > 0
                ? pickedData
                : dedupedCurated.slice(0, Math.min(dedupedCurated.length, 12)).map((tweet, index) => ({
                  ...tweet,
                  ai_reasoning:
                    tweet.ai_reasoning ||
                    'Kept as a fallback result after passing the local quality checks.',
                  temporalTag: tweet.temporalTag || (effectiveLatestMode ? 'Breaking' : 'Related'),
                  citation_id: tweet.citation_id || `[F${index + 1}]`,
                }));
          }

          const prioritizedCleanData = rerankPostsByFocus(cleanData, effectiveFocus);
          const normalizedResults = prioritizedCleanData.map((post) =>
            sanitizeStoredPost(
              searchMediaType === 'videos'
                ? {
                  ...post,
                  sourceType: post.sourceType || 'x_video',
                  isXVideo: true,
                  supportsVideoAnalysis: true,
                }
                : post,
            ),
          );
          const xResults = effectiveBroadDiscoveryQuery
            ? normalizedResults
            : isMore
              ? mergeUniquePostsById(searchResults, normalizedResults).map(sanitizeStoredPost)
              : normalizedResults;
          const mergedResults = isMore
            ? xResults
            : mergeSearchCards(xResults, rssSearchResults, effectiveLatestMode);
          const finalResults =
            !isMore && mergedResults.length === 0 && webFallbackResults.length > 0
              ? webFallbackResults
              : mergedResults;
          const effectiveSummaryMode = resolveAutomaticSummaryMode(finalResults, searchMediaType);

          setSearchResults(finalResults);
          setSearchOverflowResults(effectiveBroadDiscoveryQuery ? nextOverflowResults : []);
          setSearchCursor(finalCursor);
          if (!isMore) {
            setActiveSearchFocus(effectiveFocus);
          }

          if (cleanData.length === 0 && finalResults === webFallbackResults && webFallbackResults.length > 0) {
            setStatus(`Found ${webFallbackResults.length} web articles after filtering low-signal social posts`);
          } else if (cleanData.length === 0) {
            setStatus(`ไม่พบเนื้อหาที่มีประโยชน์ หรือถูก AI ปฏิเสธทั้งหมด (จาก ${data.length} โพสต์ที่อ้างอิง)`);
          } else {
            setStatus(`ค้นพบ ${cleanData.length} รายการ (กลั่นกรองโดย AI จากทั้งหมด ${data.length} โพสต์)`);
          }

          const snapshot: SearchCacheSnapshot = {
            lastSubmittedSearchQuery: normalizedRequestedQueryLabel,
            searchCursor: finalCursor,
            searchOverflowResults: effectiveBroadDiscoveryQuery ? nextOverflowResults : [],
            searchResults: finalResults,
            searchSummary: '',
            searchWebSources: resolvedSearchWebSources,
          };
          queryClient.setQueryData(cacheKey, snapshot);

          if (!isMore) {
            setStatus('[Agent 3/3] กำลังสังเคราะห์ข้อมูลและเขียน Executive Summary...');
            setSearchSummary('');
            const summaryIntent = analyzeSearchQueryIntent(requestedQuery);
            const shouldPreferXSummary =
              searchMediaType === 'videos' || summaryIntent.queryKey === 'viral_video';
            const summaryCandidates = buildSummaryCandidates(
              finalResults,
              effectiveSummaryMode,
              effectiveLatestMode,
              effectiveFocus,
            );

            void generateSearchSummary({
              summaryCandidates,
              requestedQuery,
              webContext,
              preferXSummary: shouldPreferXSummary,
              focusMode: effectiveFocus,
              summaryMode: effectiveSummaryMode,
              cacheKey,
              cachedWebSources: resolvedSearchWebSources,
            })
              .catch((summaryError) => {
                console.warn('[Search] Executive summary failed:', summaryError);
              });
          }

          progressivelyTranslateSearchResults(finalResults);
        } else {
          setStatus('ไม่พบข้อมูลสำหรับคำค้นหานี้');
        }
      } catch (error) {
        console.error(error);
        setStatus('เกิดข้อผิดพลาดในการค้นหา');
      } finally {
        setIsLiveSearching(false);
      }
    },
  });

  const searchHistoryLabels = useMemo(
    () => searchHistory.map((item: any) => item.query).filter(Boolean),
    [searchHistory],
  );
  const interestSeedLabels = useMemo(() => {
    const feedInterestLabels = extractInterestTopics([
      ...originalFeed.slice(0, 12),
      ...readArchive.slice(0, 12),
    ]);
    return [...feedInterestLabels].filter(Boolean);
  }, [originalFeed, readArchive]);

  const dynamicSearchTags = useMemo(
    () =>
      buildDynamicSearchTags({
        searchPresets,
        searchHistoryLabels,
        interestSeedLabels,
        commonKeywords: COMMON_KEYWORDS,
        limit: MAX_SEARCH_PRESETS,
      }),
    [interestSeedLabels, searchHistoryLabels, searchPresets],
  );

  const searchFocusLandscape = useMemo(
    () => summarizeFocusLandscape(searchResults),
    [searchResults],
  );

  const currentQueryIntent = useMemo(
    () => analyzeSearchQueryIntent(lastSubmittedSearchQuery || searchQuery),
    [lastSubmittedSearchQuery, searchQuery],
  );

  const learnedFocusForCurrentQuery = useMemo(() => {
    const queryKeyCounts = searchLearningProfile?.queryKeyFocusCounts?.[currentQueryIntent.queryKey] || {};
    const globalCounts = searchLearningProfile?.globalFocusCounts || {};
    const ranked = (Object.keys(SEARCH_FOCUS_LABELS) as SearchFocusMode[])
      .map((focus) => ({
        focus,
        score: toNumber(queryKeyCounts[focus]) * 2 + toNumber(globalCounts[focus]),
      }))
      .sort((left, right) => right.score - left.score);
    return ranked[0]?.score >= 3 ? ranked[0].focus : null;
  }, [currentQueryIntent.queryKey, searchLearningProfile]);

  const searchChoiceOptions = useMemo(() => {
    const ranked = (Object.keys(SEARCH_FOCUS_LABELS) as SearchFocusMode[])
      .map((focus) => ({
        id: focus,
        label: SEARCH_FOCUS_LABELS[focus],
        score: searchFocusLandscape[focus] || 0,
      }))
      .sort((left, right) => right.score - left.score);

    return ranked
      .filter((item, index) => item.score > 0.8 || index < 2)
      .slice(0, 4);
  }, [searchFocusLandscape]);

  const shouldShowSearchChoices = useMemo(() => {
    if (searchResults.length < 6) return false;
    if (!currentQueryIntent.broadDiscoveryIntent) return false;
    const queryLabel = normalizeSearchLabel(lastSubmittedSearchQuery || searchQuery).toLowerCase();
    const dismissedAt = toNumber(searchLearningProfile?.dismissedChoiceAt?.[queryLabel]);
    if (dismissedAt && Date.now() - dismissedAt < SEARCH_CHOICE_COOLDOWN_MS) return false;
    if (learnedFocusForCurrentQuery) return false;

    const ranked = [...searchChoiceOptions].sort((left, right) => right.score - left.score);
    if (ranked.length < 2) return false;
    const ambiguityRatio = ranked[1].score / Math.max(1, ranked[0].score);
    return ambiguityRatio >= 0.62;
  }, [
    currentQueryIntent.broadDiscoveryIntent,
    lastSubmittedSearchQuery,
    learnedFocusForCurrentQuery,
    searchChoiceOptions,
    searchLearningProfile,
    searchQuery,
    searchResults.length,
  ]);

  const applySearchFocus = async (focus: SearchFocusMode) => {
    const normalizedLabel = normalizeSearchLabel(lastSubmittedSearchQuery || searchQuery);
    const reranked = rerankPostsByFocus(searchResults, focus).map(sanitizeStoredPost);
    setActiveSearchFocus(focus);
    setSearchResults(reranked);
    persistFocusChoice(focus, normalizedLabel, currentQueryIntent.queryKey);
    setStatus(`ปรับมุมมองผลค้นหาเป็น "${SEARCH_FOCUS_LABELS[focus]}" แล้ว`);

    if (reranked.length > 0) {
      setSearchSummary('');
      const shouldPreferXSummary =
        searchMediaType === 'videos' || currentQueryIntent.queryKey === 'viral_video';
      const webContext = buildSearchSummaryWebContext(searchWebSources || []);
      const effectiveSummaryMode = resolveAutomaticSummaryMode(reranked, searchMediaType);
      const summaryCandidates = buildSummaryCandidates(
        reranked,
        effectiveSummaryMode,
        isLatestMode,
        focus,
      );

      try {
        await generateSearchSummary({
          summaryCandidates,
          requestedQuery: normalizedLabel || searchQuery,
          webContext,
          preferXSummary: shouldPreferXSummary,
          focusMode: focus,
          summaryMode: effectiveSummaryMode,
        });
      } catch (error) {
        console.warn('[Search] Focus summary refresh failed:', error);
      }
    }
  };

  const dismissSearchChoices = () => {
    const queryLabel = normalizeSearchLabel(lastSubmittedSearchQuery || searchQuery).toLowerCase();
    if (!queryLabel) return;
    setSearchLearningProfile((prev: any) => ({
      ...(prev || {}),
      globalFocusCounts: prev?.globalFocusCounts || {},
      queryKeyFocusCounts: prev?.queryKeyFocusCounts || {},
      dismissedChoiceAt: {
        ...(prev?.dismissedChoiceAt || {}),
        [queryLabel]: Date.now(),
      },
    }));
  };

  const canSaveCurrentSearchAsPreset =
    !!normalizeSearchLabel(searchQuery) &&
    !searchPresets.some(
      (item: string) => item.toLowerCase() === normalizeSearchLabel(searchQuery).toLowerCase(),
    ) &&
    searchPresets.length < MAX_SEARCH_PRESETS;

  const searchStatusMessage = status.replace(/\[.*?\]\s*/g, '').trim();
  const isSearchSummaryPending =
    activeView === 'content' &&
    contentTab === 'search' &&
    !searchMutation.isPending &&
    searchResults.length > 0 &&
    !searchSummary;
  const shouldInlineSearchStatus =
    activeView === 'content' &&
    contentTab === 'search' &&
    (searchMutation.isPending || isSearchSummaryPending) &&
    !!searchStatusMessage;

  return {
    activeSearchFocus,
    activeSuggestionIndex,
    addSearchPreset,
    applySearchFocus,
    canSaveCurrentSearchAsPreset,
    dismissSearchChoices,
    dynamicSearchTags,
    handleSearch: (event?: FormEvent, isMore = false, overrideQuery = '') => {
      if (event) event.preventDefault();
      if (!isMore) {
        setActiveSearchFocus(null);
      }
      return searchMutation.mutateAsync({ isMore, overrideQuery });
    },
    interestSeedLabels,
    isLatestMode,
    isLiveSearching,
    isSearching: searchMutation.isPending,
    isSourcesExpanded,
    lastSubmittedSearchQuery,
    maxSearchPresets: MAX_SEARCH_PRESETS,
    removeSearchPreset,
    searchCursor,
    searchHistory,
    searchHistoryLabels,
    searchOverflowResults,
    searchPresets,
    searchMediaType,
    searchQuery,
    searchResults,
    searchChoiceOptions,
    searchStatusMessage,
    searchSummary,
    searchWebSources,
    setActiveSuggestionIndex,
    setIsLatestMode,
    setIsSourcesExpanded,
    setSearchCursor,
    setSearchMediaType,
    setSearchOverflowResults,
    setSearchQuery,
    setSearchResults,
    setSearchSummary,
    setSearchWebSources,
    setShowSuggestions,
    shouldShowSearchChoices,
    shouldInlineSearchStatus,
    showSuggestions,
  };
};
