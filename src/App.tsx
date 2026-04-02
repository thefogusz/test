// @ts-nocheck
import React, { Suspense, lazy, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import AiFilterModal from './components/AiFilterModal';
import HomeView from './components/HomeView';
import ListModal from './components/ListModal';
import Sidebar from './components/Sidebar';
import StatusToast from './components/StatusToast';
import RightSidebar from './components/RightSidebar';
import {
  getUserInfo,
  fetchWatchlistFeed,
  searchEverything,
  searchEverythingDeep,
  curateSearchResults,
  analyzeSearchQueryIntent,
  clusterBySimilarity
} from './services/TwitterService';
import { agentFilterFeed, buildSearchPlan, discoverTopExpertsStrict, expandSearchQuery, generateExecutiveSummary, generateGrokBatch, generateGrokSummary, tavilySearch } from './services/GrokService';
import { getSummaryDateLabel } from './utils/summaryDates';
import './index.css';
import { STORAGE_KEYS } from './constants/storageKeys';
import useLibraryViews from './hooks/useLibraryViews';
import { usePersistentState } from './hooks/usePersistentState';
import useSearchSuggestions from './hooks/useSearchSuggestions';
import {
  deriveVisibleFeed,
  mergeUniquePostsById,
  hasUsefulThaiSummary,
  sanitizeStoredPost,
  sanitizeCollectionState,
  sanitizeStoredSingle,
  normalizeSearchText,
  mergePlanLabelsIntoQuery
} from './utils/appUtils';
import {
  deserializeAttachedSource,
  deserializePostLists,
  deserializeStoredCollection,
  deserializeWatchlist,
} from './utils/appPersistence';
import {
  buildDynamicSearchTags,
  COMMON_KEYWORDS,
  deserializeSearchHistory,
  deserializeSearchPresets,
  extractInterestTopics,
  getBroadFallbackQueries,
  getBroadQueryBlueprint,
  MAX_SEARCH_PRESETS,
  normalizeSearchLabel,
} from './utils/searchHelpers';

const AudienceWorkspace = lazy(() => import('./components/AudienceWorkspace'));
const BookmarksWorkspace = lazy(() => import('./components/BookmarksWorkspace'));
const ContentWorkspace = lazy(() => import('./components/ContentWorkspace'));
const ReadWorkspace = lazy(() => import('./components/ReadWorkspace'));

const READ_ARCHIVE_INITIAL_RENDER = 24;
const READ_ARCHIVE_RENDER_BATCH = 24;

const shouldRemoveWhenFalsy = (value) => !value;

const App = () => {
  const [watchlist, setWatchlist] = usePersistentState(STORAGE_KEYS.watchlist, [], {
    deserialize: deserializeWatchlist,
  });
  
  const [feed, setFeed] = useState([]);
  const [originalFeed, setOriginalFeed] = usePersistentState(STORAGE_KEYS.homeFeed, [], {
    deserialize: deserializeStoredCollection,
  });
  const [deletedFeed, setDeletedFeed] = useState([]);
  const [pendingFeed, setPendingFeed] = usePersistentState(STORAGE_KEYS.pendingFeed, [], {
    deserialize: deserializeStoredCollection,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeFilters, setActiveFilters] = useState({ view: false, engagement: false });
  
  const [searchQuery, setSearchQuery] = usePersistentState(STORAGE_KEYS.searchQuery, '');
  const [searchResults, setSearchResults] = usePersistentState(STORAGE_KEYS.searchResults, [], {
    deserialize: deserializeStoredCollection,
  });
  const [searchSummary, setSearchSummary] = usePersistentState(STORAGE_KEYS.searchSummary, '');
  const [searchPresets, setSearchPresets] = usePersistentState(STORAGE_KEYS.searchPresets, [], {
    deserialize: deserializeSearchPresets,
  });
  const [searchHistory, setSearchHistory] = usePersistentState(STORAGE_KEYS.searchHistory, [], {
    deserialize: deserializeSearchHistory,
  });
  const [searchWebSources, setSearchWebSources] = usePersistentState(STORAGE_KEYS.searchWebSources, [], {
    deserialize: deserializeStoredCollection,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [lastSubmittedSearchQuery, setLastSubmittedSearchQuery] = useState('');
  const [searchOverflowResults, setSearchOverflowResults] = useState([]);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [searchCursor, setSearchCursor] = useState(null);
  const [activeSearchPlan, setActiveSearchPlan] = useState(null);
  const onlyNews = true;
  const [nextCursor, setNextCursor] = useState(null);
  const [isLatestMode, setIsLatestMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isLiveSearching, setIsLiveSearching] = useState(false);

  const [bookmarks, setBookmarks] = usePersistentState(STORAGE_KEYS.bookmarks, [], {
    deserialize: deserializeStoredCollection,
  });
  const [bookmarkTab, setBookmarkTab] = useState('news');
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  const [isMobilePostListOpen, setIsMobilePostListOpen] = useState(false);
  const [reopenMobilePostListAfterModal, setReopenMobilePostListAfterModal] = useState(false);

  // Lock body scroll when mobile bottom sheet is open (prevents tap→scroll bug)
  useEffect(() => {
    document.body.style.overflow = isMobilePostListOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobilePostListOpen]);
  const [readArchive, setReadArchive] = usePersistentState(STORAGE_KEYS.readArchive, [], {
    deserialize: deserializeStoredCollection,
  });
  const [readSearchQuery, setReadSearchQuery] = usePersistentState(STORAGE_KEYS.readSearchQuery, '');
  const deferredReadSearchQuery = useDeferredValue(readSearchQuery);
  const [visibleReadCount, setVisibleReadCount] = useState(READ_ARCHIVE_INITIAL_RENDER);

  const [createContentSource, setCreateContentSource] = usePersistentState(STORAGE_KEYS.attachedSource, null, {
    deserialize: deserializeAttachedSource,
    shouldRemove: shouldRemoveWhenFalsy,
  });

  const [postLists, setPostLists] = usePersistentState(STORAGE_KEYS.postLists, [], {
    deserialize: deserializePostLists,
  });
  const [activeListId, setActiveListId] = usePersistentState(STORAGE_KEYS.activeListId, null);
  const [activeView, setActiveView] = usePersistentState(STORAGE_KEYS.activeView, 'home');
  const [contentTab, setContentTab] = usePersistentState(STORAGE_KEYS.contentTab, 'search');
  const [listModal, setListModal] = useState({ show: false, mode: 'create', value: '' });
  const [filterModal, setFilterModal] = useState({ show: false, prompt: '' });
  const DEFAULT_QUICK_PRESETS = ['สรุป', 'หาโพสต์เด่น', 'โพสต์ไหนน่าทำคอนเทนต์'];
  const [quickFilterPresets, setQuickFilterPresets] = usePersistentState(STORAGE_KEYS.quickFilterPresets, DEFAULT_QUICK_PRESETS);
  const [quickFilterVisiblePresets, setQuickFilterVisiblePresets] = usePersistentState(
    STORAGE_KEYS.quickFilterVisiblePresets,
    DEFAULT_QUICK_PRESETS.slice(0, 3),
  );
  const [readFilters, setReadFilters] = useState({ view: false, engagement: false });

  const [audienceTab, setAudienceTab] = usePersistentState(STORAGE_KEYS.audienceTab, 'ai');
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [manualQuery, setManualQuery] = useState('');
  const [manualPreview, setManualPreview] = useState(null);

  const [isFiltered, setIsFiltered] = useState(false);
  const [aiFilterSummary, setAiFilterSummary] = useState('');
  const aiFilterSummaryDateLabel = getSummaryDateLabel(feed, 8);

  // Global Background Tasks Persistence
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [genPhase, setGenPhase] = useState('idle');
  const isSummarizingRef = useRef(false);
  const isBackfillingThaiRef = useRef(false);
  const failedThaiSummaryIdsRef = useRef(new Set());

  useEffect(() => {
    if (status) {
      const shouldKeepStatusVisible =
        isSearching ||
        (
          activeView === 'content' &&
          contentTab === 'search' &&
          searchResults.length > 0 &&
          !searchSummary
        );

      if (shouldKeepStatusVisible) return undefined;

      const timer = setTimeout(() => setStatus(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeView, contentTab, isSearching, searchResults.length, searchSummary, status]);

  useEffect(() => {
    setOriginalFeed(prev => sanitizeCollectionState(prev));
    setPendingFeed(prev => sanitizeCollectionState(prev));
    setReadArchive(prev => sanitizeCollectionState(prev));
    setBookmarks(prev => sanitizeCollectionState(prev));
    setCreateContentSource(prev => sanitizeStoredSingle(prev));
  }, [
    setBookmarks,
    setCreateContentSource,
    setOriginalFeed,
    setPendingFeed,
    setReadArchive,
  ]);

  useEffect(() => {
    setNextCursor(null);
    setPendingFeed([]);
  }, [activeListId, activeView, setPendingFeed]);

  useEffect(() => {
    if (activeView === 'search' || isFiltered) return; 

    setFeed(deriveVisibleFeed({
      activeFilters,
      activeListId,
      activeView,
      originalFeed,
      postLists,
      watchlist,
    }));
  }, [activeListId, originalFeed, activeView, postLists, watchlist, isFiltered, activeFilters]);

  const translatePostsToThai = async (posts = []) => {
    if (!posts.length) return [];

    const batchSummaries = await generateGrokBatch(posts.map((post) => post.text));

    return Promise.all(
      posts.map(async (post, idx) => {
        const batchSummary = batchSummaries[idx] || '';
        if (hasUsefulThaiSummary(batchSummary, post.text)) {
          failedThaiSummaryIdsRef.current.delete(post.id);
          return { ...post, summary: batchSummary };
        }

        try {
          const retrySummary = await generateGrokSummary(post.text);
          if (hasUsefulThaiSummary(retrySummary, post.text)) {
            failedThaiSummaryIdsRef.current.delete(post.id);
            return { ...post, summary: retrySummary };
          }
        } catch (retryError) {
          console.warn('[Thai Summary Retry Failed]', retryError);
        }

        failedThaiSummaryIdsRef.current.add(post.id);
        return post;
      }),
    );
  };

  useEffect(() => {
    const candidates = originalFeed
      .filter((post) => post?.id && !hasUsefulThaiSummary(post.summary, post.text) && !failedThaiSummaryIdsRef.current.has(post.id))
      .slice(0, 6);

    if (!candidates.length || isSummarizingRef.current || isBackfillingThaiRef.current) return undefined;

    const timer = setTimeout(async () => {
      isBackfillingThaiRef.current = true;
      try {
        const translatedPosts = await translatePostsToThai(candidates);
        const translatedSummaryMap = new Map(
          translatedPosts
            .filter((post) => hasUsefulThaiSummary(post.summary, post.text))
            .map((post) => [post.id, post.summary]),
        );

        if (!translatedSummaryMap.size) return;

        setOriginalFeed((prev) =>
          prev.map((post) => (
            translatedSummaryMap.has(post.id)
              ? { ...post, summary: translatedSummaryMap.get(post.id) }
              : post
          )),
        );
        setReadArchive((prev) =>
          prev.map((post) => (
            translatedSummaryMap.has(post.id)
              ? { ...post, summary: translatedSummaryMap.get(post.id) }
              : post
          )),
        );
      } finally {
        isBackfillingThaiRef.current = false;
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [originalFeed, setOriginalFeed, setReadArchive]);

  const processAndSummarizeFeed = async (newBatch, statusPrefix = 'พบ') => {
    if (newBatch.length === 0) return;
    if (isSummarizingRef.current) return;
    isSummarizingRef.current = true;

    const CHUNK_SIZE = 10;
    const totalChunks = Math.ceil(newBatch.length / CHUNK_SIZE);
    let runningFeed = [...originalFeed];

    try {
    for (let i = 0; i < newBatch.length; i += CHUNK_SIZE) {
      const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
      setStatus(`${statusPrefix} ${newBatch.length} โพสต์ — กำลังสรุป ${chunkIndex}/${totalChunks}...`);

      const chunk = newBatch.slice(i, i + CHUNK_SIZE);
      const toSummarize = chunk.filter(t => {
        const existing = runningFeed.find(p => p.id === t.id);
        return !hasUsefulThaiSummary(existing?.summary || t.summary, existing?.text || t.text);
      });

      if (toSummarize.length > 0) {
        const translatedPosts = await translatePostsToThai(toSummarize);
        const translatedSummaryMap = new Map(
          translatedPosts
            .filter((post) => hasUsefulThaiSummary(post.summary, post.text))
            .map((post) => [post.id, post.summary]),
        );

        toSummarize.forEach((post) => {
          if (translatedSummaryMap.has(post.id)) {
            post.summary = translatedSummaryMap.get(post.id);
          }
        });
      }

      setOriginalFeed(prev => {
        const postMap = new Map(prev.map(p => [p.id, p]));
        chunk.forEach(newPost => {
          const normalizedNewPost = sanitizeStoredPost(newPost);
          if (postMap.has(newPost.id)) {
            postMap.set(newPost.id, { ...sanitizeStoredPost(postMap.get(newPost.id)), ...normalizedNewPost });
          } else {
            postMap.set(newPost.id, normalizedNewPost);
          }
        });
        const nextList = Array.from(postMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        runningFeed = nextList;
        return nextList;
      });

      setReadArchive(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = chunk.filter(p => !existingIds.has(p.id));
        if (newItems.length > 0) return [...newItems, ...prev];
        return prev;
      });
    }
    } finally {
      isSummarizingRef.current = false;
    }
  };

  const handleSync = async () => {
    if (watchlist.length === 0) {
      setStatus('กรุณาเพิ่มบัญชีที่ต้องการติดตามก่อนซิงค์ข้อมูล');
      return;
    }
    setLoading(true);
    setStatus('กำลังเชื่อมต่อฐานข้อมูล... ดึงฟีดข่าวล่าสุด');

    try {
      const activeList = activeListId ? postLists.find(l => l.id === activeListId) : null;
      const rawAccounts = activeList ? activeList.members : watchlist;
      const targetAccounts = Array.isArray(rawAccounts) 
        ? rawAccounts.map(u => typeof u === 'string' ? u : u.username).filter(Boolean)
        : [];

      if (targetAccounts.length === 0) {
        setStatus(activeList ? 'Post List นี้ยังไม่มีสมาชิกให้ซิงค์' : 'กรุณาเพิ่มบัญชีที่ต้องการติดตามก่อนซิงค์ข้อมูล');
        return;
      }
      
      const { data, meta } = await fetchWatchlistFeed(targetAccounts, '', 'Latest');
      setNextCursor(meta.next_cursor);
      
      const MAX_SYNC = 20;
      const displayData = data.slice(0, MAX_SYNC);
      const remainingData = data.slice(MAX_SYNC);
      
      setPendingFeed(remainingData);
      
      if (displayData.length > 0) {
        await processAndSummarizeFeed(displayData, `ดึงข้อมูลสำเร็จ! ได้มา ${data.length} โพสต์ กำลังแปลและแสดงผล`);
      }
      setStatus('อัปเดตข้อมูลเรียบร้อย');
    } catch (err) {
      console.error(err);
      if (err.message?.includes('401')) {
        setStatus('❌ ผิดพลาด (401): กุญแจ API ไม่ถูกต้อง กรุณาเช็ค Railway Environment Variables');
      } else {
        setStatus('เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = (tweet, isSaving) => {
    if (isSaving) {
      setBookmarks(prev => {
        if (prev.find(p => p.id === tweet.id)) return prev;
        return [tweet, ...prev];
      });
    } else {
      setBookmarks(prev => prev.filter(p => p.id !== tweet.id));
    }
  };

  const handleLoadMore = async () => {
    if ((!nextCursor && pendingFeed.length === 0) || loading) return;
    setLoading(true);
    try {
      let nextBatch = [];
      const MAX_SYNC = 20;

      if (pendingFeed.length > 0) {
        nextBatch = pendingFeed.slice(0, MAX_SYNC);
        setPendingFeed(pendingFeed.slice(MAX_SYNC));
      } else {
        const activeList = activeListId ? postLists.find(l => l.id === activeListId) : null;
        const targetAccounts = activeList ? activeList.members : watchlist;
        const { data, meta } = await fetchWatchlistFeed(targetAccounts, nextCursor, 'Latest');
        setNextCursor(meta.next_cursor);
        
        nextBatch = data.slice(0, MAX_SYNC);
        setPendingFeed(data.slice(MAX_SYNC));
      }

      if (nextBatch.length > 0) {
        await processAndSummarizeFeed(nextBatch, `กำลังดึงข้อมูลเพิ่มอีก`);
        setStatus('อัปเดตข้อมูลเพิ่มเติมเรียบร้อย');
      } else {
        setStatus('ไม่มีข้อมูลเพิ่มเติม');
      }
    } catch (err) {
      console.error(err);
      if (err.message?.includes('401')) {
        setStatus('❌ ผิดพลาด (401): กุญแจ API ไม่ถูกต้อง กรุณาเช็ค Railway Environment Variables');
      } else {
        setStatus('เกิดข้อผิดพลาดในการโหลดข้อมูลเพิ่มเติม');
      }
    } finally {
      setLoading(false);
    }
  };

  const recordSearchInterest = (rawQuery) => {
    const normalizedQuery = normalizeSearchLabel(rawQuery);
    if (!normalizedQuery) return;

    setSearchHistory((prev) => {
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

  const addSearchPreset = (rawQuery) => {
    const normalizedQuery = normalizeSearchLabel(rawQuery);
    if (!normalizedQuery) return;

    setSearchPresets((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      if (next.some((item) => item.toLowerCase() === normalizedQuery.toLowerCase())) return next;
      return [normalizedQuery, ...next].slice(0, MAX_SEARCH_PRESETS);
    });
  };

  const removeSearchPreset = (labelToRemove) => {
    setSearchPresets((prev) =>
      (Array.isArray(prev) ? prev : []).filter(
        (item) => item.toLowerCase() !== labelToRemove.toLowerCase(),
      ),
    );
  };

  const handleSearch = async (e, isMore = false, overrideQuery = '') => {
    if (e) e.preventDefault();
    const requestedQuery = overrideQuery || searchQuery;
    const normalizedRequestedQueryLabel = normalizeSearchLabel(requestedQuery);
    if (!requestedQuery && !isMore) return;
    if (isMore && searchOverflowResults.length > 0) {
      const nextChunk = searchOverflowResults.slice(0, 10);
      setSearchResults((prev) => [...prev, ...nextChunk]);
      setSearchOverflowResults((prev) => prev.slice(10));
      return;
    }
    if (!isMore) {
      recordSearchInterest(requestedQuery);
      setLastSubmittedSearchQuery(normalizedRequestedQueryLabel);
    }
    setIsSearching(true);
    if (!isMore) setSearchSummary('');
    setStatus(`AI กำลังค้นหาข้อมูลสำหรับ "${requestedQuery}"...`);

    try {
      let webContext = '';
      let searchPlan = activeSearchPlan;
      const isComplexQuery = !/ฮา|ตลก|ขำ|funny|meme|lol|haha/i.test(requestedQuery);
      const normalizedRequestedQuery = normalizeSearchText(requestedQuery);
      const queryTokenCount = normalizedRequestedQuery ? normalizedRequestedQuery.split(' ').length : 0;
      const legacyBroadDiscoveryQuery =
        queryTokenCount > 0 &&
        queryTokenCount <= 3 &&
        !/ล่าสุด|วันนี้|breaking|เปิดตัว|ประกาศ|ด่วน|now|today|update|news|ข่าว|รีวิว|เทียบ|vs|หลุด/i.test(requestedQuery) &&
        !/from:|since:|until:|@|"/i.test(requestedQuery);
      const queryIntent = analyzeSearchQueryIntent(requestedQuery);
      const effectiveBroadDiscoveryQuery = queryIntent.broadDiscoveryIntent || legacyBroadDiscoveryQuery;
      // Auto-enable Latest mode for price/event queries that need freshness
      const searchQueryType = (isLatestMode || queryIntent.forceLatestMode) ? 'Latest' : 'Top';
      const broadBlueprint = effectiveBroadDiscoveryQuery ? getBroadQueryBlueprint(requestedQuery) : null;
      const broadFallbackQueries = effectiveBroadDiscoveryQuery ? getBroadFallbackQueries(requestedQuery) : [];
      const shouldUseAdaptivePlan = isComplexQuery && !effectiveBroadDiscoveryQuery;
      const preferStrictSources = isComplexQuery && !effectiveBroadDiscoveryQuery;
      const rawDataChunks = [];
      let finalCursor = null;
      const getScopedQuery = (q, lane = 'default') => {
        let sq = q;
        if (isLatestMode) {
          if (!q.includes('since:')) {
            const date = new Date();
            date.setHours(date.getHours() - 24);
            sq = `${q} since:${date.toISOString().split('T')[0]}`;
          }
          // Avoid 0-engagement noise even in Latest mode
          if (!q.includes('min_faves:')) {
            const latestMinFaves = effectiveBroadDiscoveryQuery
              ? (lane === 'exact' ? 10 : lane === 'broad' ? 25 : 40)
              : (isComplexQuery ? 5 : 2);
            sq = `${sq} min_faves:${latestMinFaves}`;
          }
        } else {
          // For Top mode, ensure at least some baseline viral signal
          if (!q.includes('min_faves:')) {
            const topMinFaves = effectiveBroadDiscoveryQuery
              ? (lane === 'exact' ? 15 : lane === 'broad' ? 40 : 75)
              : (isComplexQuery ? 10 : 3);
            sq = `${sq} min_faves:${topMinFaves}`;
          }
        }
        return sq;
      };
      
      if (!isMore) {
        setStatus(`[Phase 2] Async Parallel Fetch: Tavily + Broad X Search...`);
        
        // 1. Fire Tavily AND X Search (Broad) concurrently!
        const tavilyPromise =
          shouldUseAdaptivePlan || effectiveBroadDiscoveryQuery
            ? tavilySearch(requestedQuery, isLatestMode)
            : Promise.resolve({ results: [], answer: '' });
        const expandedBroadQueryPromise = expandSearchQuery(requestedQuery, isLatestMode).catch((err) => {
          console.warn(`[Search] Failed to expand query: ${requestedQuery}`, err);
          return requestedQuery;
        });
        const exactSearchPromise = effectiveBroadDiscoveryQuery
          ? searchEverythingDeep(getScopedQuery(requestedQuery, 'exact'), null, onlyNews, searchQueryType, 2).catch((err) => {
              console.warn(`[Search] Failed exact query: ${requestedQuery}`, err);
              return { data: [], meta: {} };
            })
          : Promise.resolve({ data: [], meta: {} });
        const broadSearchPromise = expandedBroadQueryPromise.then((expandedBroadQuery) => {
          const broadQuery = getScopedQuery(expandedBroadQuery || requestedQuery, 'broad');
          return searchEverythingDeep(broadQuery, null, onlyNews, searchQueryType, 4).catch(err => {
            console.warn(`[Search] Failed broad query: ${broadQuery}`, err);
            return { data: [], meta: {} };
          });
        });
        const entitySearchPromise = effectiveBroadDiscoveryQuery && broadBlueprint?.entityQuery
          ? searchEverythingDeep(getScopedQuery(broadBlueprint.entityQuery, 'entity'), null, onlyNews, searchQueryType, 3).catch((err) => {
              console.warn(`[Search] Failed entity query: ${broadBlueprint.entityQuery}`, err);
              return { data: [], meta: {} };
            })
          : Promise.resolve({ data: [], meta: {} });
        const viralSearchPromise = effectiveBroadDiscoveryQuery && broadBlueprint?.viralQuery
          ? searchEverythingDeep(getScopedQuery(broadBlueprint.viralQuery, 'viral'), null, onlyNews, searchQueryType, 3).catch((err) => {
              console.warn(`[Search] Failed viral query: ${broadBlueprint.viralQuery}`, err);
              return { data: [], meta: {} };
            })
          : Promise.resolve({ data: [], meta: {} });

        const [webData, exactResult, broadResult, entityResult, viralResult] = await Promise.all([
          tavilyPromise,
          exactSearchPromise,
          broadSearchPromise,
          entitySearchPromise,
          viralSearchPromise,
        ]);

        // Extract YouTube cards from Tavily results (zero YouTube search quota — Tavily already ran)
        // Run in background while X results are being processed below
        if (exactResult.data && exactResult.data.length > 0) rawDataChunks.push(exactResult.data);
        if (broadResult.data && broadResult.data.length > 0) rawDataChunks.push(broadResult.data);
        if (entityResult.data && entityResult.data.length > 0) rawDataChunks.push(entityResult.data);
        if (viralResult.data && viralResult.data.length > 0) rawDataChunks.push(viralResult.data);
        if (!finalCursor && broadResult.meta?.next_cursor) finalCursor = broadResult.meta.next_cursor;
        if (!finalCursor && exactResult.meta?.next_cursor) finalCursor = exactResult.meta.next_cursor;
        if (!finalCursor && entityResult.meta?.next_cursor) finalCursor = entityResult.meta.next_cursor;
        if (!finalCursor && viralResult.meta?.next_cursor) finalCursor = viralResult.meta.next_cursor;

        const initialMergedBroadData = mergeUniquePostsById(...rawDataChunks);
        if (effectiveBroadDiscoveryQuery && initialMergedBroadData.length < 8 && broadFallbackQueries.length > 0) {
          setStatus('[Fallback] ลองขยายคำค้นหาอัตโนมัติด้วยคำที่ใกล้เคียง...');
          const fallbackResults = await Promise.all(
            broadFallbackQueries.map((fallbackQuery, index) =>
              searchEverythingDeep(
                getScopedQuery(fallbackQuery, index === 0 ? 'exact' : 'broad'),
                null,
                onlyNews,
                searchQueryType,
                index === 0 ? 2 : 3,
              ).catch((err) => {
                console.warn(`[Search] Failed fallback broad query: ${fallbackQuery}`, err);
                return { data: [], meta: {} };
              }),
            ),
          );

          fallbackResults.forEach((result) => {
            if (result.data && result.data.length > 0) rawDataChunks.push(result.data);
            if (!finalCursor && result.meta?.next_cursor) finalCursor = result.meta.next_cursor;
          });
        }

        if (webData && (webData.results?.length || webData.answer)) {
          const webResultsWithCitations = (webData.results || []).map((result, index) => ({
            ...result,
            citation_id: `[W${index + 1}]`,
          }));
          webContext = [
            webData.answer ? `[WEB NEWS ANSWER]\n${webData.answer}` : '',
            webResultsWithCitations
              .map((r) => `${r.citation_id} ${r.title}: ${r.content?.slice(0, 200)}... (${r.url})`)
              .join('\n')
          ].filter(Boolean).join('\n\n');
          setSearchWebSources(webResultsWithCitations);
        } else {
          setSearchWebSources([]);
        }

        if (shouldUseAdaptivePlan) {
          setStatus(`[API] ออกแบบกลยุทธ์แสกนเชิงลึก (Precision Snipe) จาก Context...`);
          searchPlan = await buildSearchPlan(requestedQuery, isLatestMode, webContext, isComplexQuery);
          setActiveSearchPlan(searchPlan);

          // 2. Fire Precision Snipe query from Planner
          const snipeQueryRaw = searchPlan?.queries?.find(q => q !== requestedQuery && q !== `${requestedQuery} -filter:replies`);
          if (snipeQueryRaw) {
            setStatus(`[Phase 2] Async Parallel Fetch: X Search Precision Snipe...`);
            const snipeQuery = getScopedQuery(snipeQueryRaw);
            try {
               const snipeResult = await searchEverything(snipeQuery, null, onlyNews, searchQueryType, true);
               if (snipeResult.data && snipeResult.data.length > 0) rawDataChunks.push(snipeResult.data);
               if (!finalCursor && snipeResult.meta?.next_cursor) finalCursor = snipeResult.meta.next_cursor;
            } catch(err) {
               console.warn(`[Search] Failed snipe query: ${snipeQuery}`, err);
            }
          }
        } else {
          setActiveSearchPlan(null);
        }
      } else {
         setStatus(`[API] ดึงข้อมูล X Search เพิ่มเติม...`);
         const planQueries = searchPlan?.queries?.length > 0 ? searchPlan.queries : [requestedQuery];
         for (const query of planQueries) {
            const scopedQuery = getScopedQuery(query);
            try {
              const searchResponse = effectiveBroadDiscoveryQuery
                ? await searchEverythingDeep(scopedQuery, searchCursor, onlyNews, searchQueryType, 2)
                : await searchEverything(scopedQuery, searchCursor, onlyNews, searchQueryType, false);
              const { data: chunk, meta } = searchResponse;
              if (chunk.length > 0) rawDataChunks.push(chunk);
              if (!finalCursor) finalCursor = meta.next_cursor;
            } catch (err) {
              console.warn(`[Search] Pagination failed: ${scopedQuery}`, err);
            }
         }
      }
      
      const rankingQuery = shouldUseAdaptivePlan
        ? mergePlanLabelsIntoQuery(requestedQuery, searchPlan?.topicLabels || [])
        : requestedQuery;


      const data = mergeUniquePostsById(...rawDataChunks);
      const meta = { next_cursor: finalCursor };
      
      if (data.length > 0) {
        setStatus(`[Quality Gate] คัดกรองและประเมิน Engagement...`);
        const isComplexQuery = !/ฮา|ตลก|ขำ|funny|meme|lol|haha/i.test(requestedQuery);
        const curated = curateSearchResults(data, rankingQuery, { latestMode: isLatestMode, preferCredibleSources: preferStrictSources });
        
        setStatus(`[Agent 2/3] กำลังกรองสแปมและคัดเลือกโพสต์ระดับคุณภาพจากฐานข้อมูล...`);
        let cleanData = [];
        let nextOverflowResults = [];

        if (effectiveBroadDiscoveryQuery) {
          const broadCandidatePool = curated.length > 0
            ? curated
            : data.slice(0, Math.min(data.length, 20));
          const rankedBroadResults = broadCandidatePool.slice(0, Math.min(broadCandidatePool.length, 30)).map((tweet, index) => ({
            ...tweet,
            ai_reasoning: tweet.ai_reasoning || (
              curated.length > 0
                ? 'Kept from the global-first ranked result set for this broad query.'
                : 'Kept from the fallback broad-topic result set after the strict quality gate returned empty.'
            ),
            temporalTag: tweet.temporalTag || (isLatestMode ? 'Breaking' : 'Related'),
            citation_id: tweet.citation_id || `[F${index + 1}]`,
          }));

          if (isMore) {
            const mergedBroadResults = mergeUniquePostsById(searchResults, searchOverflowResults, rankedBroadResults);
            cleanData = mergedBroadResults.slice(0, Math.min(mergedBroadResults.length, searchResults.length + 10));
            nextOverflowResults = mergedBroadResults.slice(cleanData.length);
          } else {
            cleanData = rankedBroadResults.slice(0, Math.min(rankedBroadResults.length, 10));
            nextOverflowResults = rankedBroadResults.slice(cleanData.length);
          }
        } else {
          setStatus(`[Agent 2/3] Selecting the highest-quality posts from the search pool...`);
          const dedupedCurated = clusterBySimilarity(curated, 0.55);
          const validPicks = await agentFilterFeed(dedupedCurated, rankingQuery, { preferCredibleSources: preferStrictSources, webContext, isComplexQuery });
          const pickedData = dedupedCurated
            .filter(t => validPicks.some(pick => String(pick.id) === String(t.id)))
            .map(t => {
              const pick = validPicks.find(p => String(p.id) === String(t.id));
              return {
                ...t,
                ai_reasoning: pick?.reasoning,
                temporalTag: pick?.temporalTag,
                citation_id: pick?.citation_id
              };
            });
          const shouldFallbackToCurated = pickedData.length === 0;
          cleanData = !shouldFallbackToCurated && pickedData.length > 0
            ? pickedData
            : dedupedCurated.slice(0, Math.min(dedupedCurated.length, 12)).map((tweet, index) => ({
                ...tweet,
                ai_reasoning: tweet.ai_reasoning || 'Kept as a fallback result after passing the local quality checks.',
                temporalTag: tweet.temporalTag || (isLatestMode ? 'Breaking' : 'Related'),
                citation_id: tweet.citation_id || `[F${index + 1}]`,
              }));
        }
        const xResults = effectiveBroadDiscoveryQuery
          ? cleanData
          : isMore
            ? mergeUniquePostsById(searchResults, cleanData)
            : cleanData;

        // Await YouTube cards (ran in background during X processing) — interleave if any
        setSearchResults(xResults);
        setSearchOverflowResults(effectiveBroadDiscoveryQuery ? nextOverflowResults : []);
        setSearchCursor(meta.next_cursor);
        
        if (cleanData.length === 0) {
           setStatus(`ไม่พบเนื้อหาที่มีประโยชน์ หรือถูก AI ปฏิเสธทั้งหมด (จาก ${data.length} โพสต์ที่อ้างอิง)`);
        } else {
           setStatus(`ค้นพบ ${cleanData.length} รายการ (กลั่นกรองโดย AI จากทั้งหมด ${data.length} โพสต์)`);
        }

        if (!isMore) {
          setStatus(`[Agent 3/3] กำลังสังเคราะห์ข้อมูลและเขียน Executive Summary...`);
          setSearchSummary('');
          generateExecutiveSummary(cleanData.slice(0, 10), requestedQuery, (chunk, fullText) => {
            setSearchSummary(fullText);
          }, webContext)
            .then((summaryText) => {
              if (summaryText) setSearchSummary(summaryText);
            })
            .catch((summaryError) => {
              console.warn('[Search] Executive summary failed:', summaryError);
            });
        }

        // Progressive Translation for results...
        const CHUNK_SIZE = 5;
        (async () => {
          try {
            for (let i = 0; i < cleanData.length; i += CHUNK_SIZE) {
              const chunk = cleanData.slice(i, i + CHUNK_SIZE);
              const batchTexts = chunk.map(t => t.text);
              const summaries = await generateGrokBatch(batchTexts);
              
              setSearchResults(prev => prev.map(p => {
                const idx = chunk.findIndex(c => c.id === p.id);
                if (idx !== -1) return { ...p, summary: summaries[idx] || p.text };
                return p;
              }));
            }
          } catch (batchError) {
            console.warn('[Search] Progressive translation failed:', batchError);
          }
        })();
      } else {
        setStatus('ไม่พบข้อมูลสำหรับคำค้นหานี้');
      }
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearching(false);
      setIsLiveSearching(false);
    }
  };

  const searchHistoryLabels = searchHistory.map((item) => item.query).filter(Boolean);
  const feedInterestLabels = extractInterestTopics([
    ...originalFeed.slice(0, 12),
    ...readArchive.slice(0, 12),
  ]);
  const interestSeedLabels = [...feedInterestLabels].filter(Boolean);
  const dynamicSearchTags = buildDynamicSearchTags({
    searchPresets,
    searchHistoryLabels,
    interestSeedLabels,
    commonKeywords: COMMON_KEYWORDS,
    limit: MAX_SEARCH_PRESETS,
  });

  const canSaveCurrentSearchAsPreset =
    !!normalizeSearchLabel(searchQuery) &&
    !searchPresets.some((item) => item.toLowerCase() === normalizeSearchLabel(searchQuery).toLowerCase()) &&
    searchPresets.length < MAX_SEARCH_PRESETS;

  const watchlistHandleSet = useMemo(
    () => new Set((watchlist || []).map((user) => (user?.username || '').toLowerCase()).filter(Boolean)),
    [watchlist],
  );
  const searchStatusMessage = status.replace(/\[.*?\]\s*/g, '').trim();
  const isSearchSummaryPending =
    activeView === 'content' &&
    contentTab === 'search' &&
    !isSearching &&
    searchResults.length > 0 &&
    !searchSummary;
  const shouldInlineSearchStatus =
    activeView === 'content' &&
    contentTab === 'search' &&
    (isSearching || isSearchSummaryPending) &&
    !!searchStatusMessage;

  const currentActiveList = useMemo(
    () => (activeListId ? postLists.find((list) => list.id === activeListId) ?? null : null),
    [activeListId, postLists],
  );
  const {
    filteredBookmarks,
    bookmarkIds,
    readSearchSuggestions,
    filteredReadArchive,
    visibleReadArchive,
  } = useLibraryViews({
    activeListId,
    postLists,
    bookmarkTab,
    bookmarks,
    deferredReadSearchQuery,
    readArchive,
    readFilters,
    visibleReadCount,
    setVisibleReadCount,
    readArchiveInitialRender: READ_ARCHIVE_INITIAL_RENDER,
    activeView,
  });
  const suggestions = useSearchSuggestions({
    activeView,
    audienceTab,
    manualQuery,
    searchQuery,
    searchPresets,
    searchHistoryLabels,
    interestSeedLabels,
  });

  const resolvePlaceholders = async (nodes) => {
    for (const placeholder of nodes) {
      if (!placeholder.username) continue;
      try {
        const realData = await getUserInfo(placeholder.username);
        if (realData) {
          setWatchlist(current => current.map(u => 
            (u.username || '').toLowerCase() === (placeholder.username || '').toLowerCase() ? { ...realData, isPlaceholder: false } : u
          ));
        }
      } catch (err) { console.error(err); }
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const finalizeListAction = async () => {
    if (!listModal.value) return;
    let shouldReopenMobileSheet = reopenMobilePostListAfterModal;
    if (listModal.mode === 'create') {
      const newList = { id: Date.now().toString(), name: listModal.value, color: 'var(--accent-secondary)', members: [], createdAt: new Date().toISOString() };
      setPostLists([...postLists, newList]);
      setActiveListId(newList.id);
    } else {
      try {
        const raw = JSON.parse(decodeURIComponent(escape(atob(listModal.value))));

        // Validate decoded payload — reject or sanitize unexpected values
        const safeName = String(raw.name || '').slice(0, 60).trim() || 'Imported List';
        const safeColor = /^(var\(--[a-z-]+\)|#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))$/.test(raw.color)
          ? raw.color
          : 'var(--accent-secondary)';
        const safeMembers = (Array.isArray(raw.members) ? raw.members : [])
          .filter((m) => typeof m === 'string' && /^[a-zA-Z0-9_]{1,50}$/.test(m.trim()));

        const decoded = { name: safeName, color: safeColor, members: safeMembers };
        const newList = { ...decoded, id: Date.now().toString(), createdAt: new Date().toISOString() };
        
        // Sync members with watchlist
        const newMembers = (newList.members || []).map(m => m.trim().replace(/^@/, '').toLowerCase());
        const existingHandles = new Set(watchlist.map(u => (u.username || '').toLowerCase()));
        
        const placeholdersToAdd = [];
        newMembers.forEach(handle => {
          if (!existingHandles.has(handle)) {
            const newUser = { id: handle, username: handle, name: handle, profile_image_url: '', isPlaceholder: true };
            placeholdersToAdd.push(newUser);
          }
        });
        
        if (placeholdersToAdd.length > 0) {
          setWatchlist(prev => [...prev, ...placeholdersToAdd]);
          resolvePlaceholders(placeholdersToAdd);
        }

        setPostLists([...postLists, newList]);
        setActiveListId(newList.id);
        setStatus(`นำเข้า Post List "${newList.name}" สำเร็จ (${newMembers.length} บัญชี)`);
      } catch (err) { 
        console.error(err); 
        setStatus('นำเข้าล้มเหลว: รหัสไม่ถูกต้อง');
        shouldReopenMobileSheet = false;
      }
    }
    setListModal({ show: false, mode: 'create', value: '' });
    if (shouldReopenMobileSheet) {
      setIsMobilePostListOpen(true);
    }
    setReopenMobilePostListAfterModal(false);
  };

  const handleRemoveAccountGlobal = (id) => {
    const target = watchlist.find(u => u.id === id);
    if (!target) return;
    setWatchlist(prev => prev.filter(w => w.id !== id));
    setPostLists(prev => prev.map(l => ({ ...l, members: l.members.filter(m => m.toLowerCase() !== target.username.toLowerCase()) })));
  };

  const handleDeleteAll = () => {
    setDeletedFeed([...originalFeed]);
    setOriginalFeed([]);
    setFeed([]);
  };

  const handleUndo = () => {
    if (deletedFeed.length > 0) {
      setOriginalFeed([...deletedFeed]);
      setDeletedFeed([]);
    }
  };

  const handleRemoveList = (id) => {
    setPostLists(prev => prev.filter(l => l.id !== id));
    if (activeListId === id) setActiveListId(null);
  };

  const handleUpdateList = (id, updates) => setPostLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

  const handleAddMember = (listId, handle) => {
    const cleanHandle = handle.trim().replace(/^@/, '');
    setPostLists(prev => prev.map(l => l.id === listId ? { ...l, members: [...new Set([...l.members, cleanHandle.toLowerCase()])] } : l));
    if (!watchlist.find(u => u.username.toLowerCase() === cleanHandle.toLowerCase())) {
      const newUser = { id: cleanHandle, username: cleanHandle, name: cleanHandle, profile_image_url: '', isPlaceholder: true };
      setWatchlist(prev => [...prev, newUser]);
      resolvePlaceholders([newUser]);
    }
  };

  const handleRemoveMember = (handle, listId) => setPostLists(prev => prev.map(l => l.id === listId ? { ...l, members: l.members.filter(m => m.toLowerCase() !== handle.toLowerCase()) } : l));

  const handleShareList = (list) => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify({ name: list.name, members: list.members, color: list.color }))));
    navigator.clipboard.writeText(code).then(() => setStatus('คัดลอกรหัสแชร์แล้ว'));
  };

  const handleSort = (type) => {
    setActiveFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const aiFilterPresets = ['โพสต์ไหนน่าทำคอนเทนต์ต่อ', 'กำลัง viral อยู่ตอนนี้', 'เรื่องที่คนถกเถียงมากที่สุด', 'ข่าวสำคัญที่ควรติดตาม'];



  const handleAiFilter = async (promptOverride) => {
    const prompt = promptOverride ?? filterModal.prompt;
    if (!prompt || filterModal.isFiltering) return;
    setFilterModal(prev => ({ ...prev, isFiltering: true, show: false }));
    setStatus('AI กำลังวิเคราะห์และคัดกรองเนื้อหา...');
    
    try {
      const sourceFeed = deriveVisibleFeed({
        activeFilters,
        activeListId,
        activeView: 'home',
        originalFeed,
        postLists,
        watchlist,
      });

      if (sourceFeed.length === 0) {
        setFilterModal(prev => ({ ...prev, show: false, isFiltering: false }));
        setStatus('ยังไม่มีโพสต์ใน Watchlist Feed ให้ AI กรอง');
        return;
      }

      const validPicks = await agentFilterFeed(sourceFeed, prompt);
      const filteredResult = sourceFeed
        .filter(t => validPicks.some(pick => String(pick.id) === String(t.id)))
        .map(t => {
          const matchingPick = validPicks.find(pick => String(pick.id) === String(t.id));
          return {
            ...t,
            ai_reasoning: matchingPick?.reasoning,
            temporalTag: matchingPick?.temporalTag,
            citation_id: matchingPick?.citation_id,
          };
        });
      
      setFeed(filteredResult);
      setIsFiltered(true);
      
      if (filteredResult.length > 0) {
        setStatus('กำลังวิเคราะห์บทสรุปสำหรับคุณ...');
        const summary = await generateExecutiveSummary(filteredResult.slice(0, 8), prompt);
        setAiFilterSummary(summary);
      }
      
      setFilterModal(prev => ({ ...prev, show: false, isFiltering: false }));
      
      if (filteredResult.length > 0) {
        setStatus(`กรองสำเร็จ! พบ ${filteredResult.length} โพสต์ที่ตรงตามเจตนาของคุณ`);
      } else {
        setStatus('ไม่พบโพสต์ที่ตรงตามเงื่อนไข ลองปรับคำสั่งกรองใหม่');
      }
    } catch (err) {
      console.error(err);
      setStatus('การกรองข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง');
      setFilterModal(prev => ({ ...prev, isFiltering: false }));
    }
  };

  const removeQuickPreset = (preset) => {
    setQuickFilterPresets(prev => prev.filter(p => p !== preset));
    setQuickFilterVisiblePresets(prev => prev.filter(p => p !== preset));
  };

  const addQuickPreset = (preset) => {
    const trimmed = preset.trim();
    if (!trimmed) return;
    setQuickFilterPresets(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
  };

  const toggleVisibleQuickPreset = (preset) => {
    setQuickFilterVisiblePresets((prev) => {
      if (prev.includes(preset)) {
        return prev.filter((item) => item !== preset);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, preset];
    });
  };

  const visibleQuickPresets = useMemo(
    () => quickFilterVisiblePresets.filter((preset) => quickFilterPresets.includes(preset)).slice(0, 3),
    [quickFilterPresets, quickFilterVisiblePresets],
  );

  useEffect(() => {
    setQuickFilterVisiblePresets((prev) => {
      const next = prev.filter((preset) => quickFilterPresets.includes(preset)).slice(0, 3);
      if (next.length === prev.length && next.every((preset, index) => preset === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [quickFilterPresets, setQuickFilterVisiblePresets]);

  const clearAiFilter = () => {
    setIsFiltered(false);
    setAiFilterSummary('');
    // This will trigger the useEffect to restore the feed from originalFeed
    setActiveListId(activeListId);
    setOriginalFeed([...originalFeed]);
    setStatus('ล้างตัวกรองแล้ว');
  };

  const handleAiSearchAudience = async (q, isMore = false) => {
    const query = q || aiQuery;
    setAiSearchLoading(true);
    try {
      const excludes = [
        ...watchlist.map(u => u.username),
        ...(isMore ? aiSearchResults.map(u => u.username) : [])
      ];
      const experts = await discoverTopExpertsStrict(query, excludes);
      setAiSearchResults(prev => isMore ? [...prev, ...experts] : experts);
    } catch (err) {
      console.error(err);
    } finally {
      setAiSearchLoading(false);
    }
  };

  const handleAddExpert = async (expert) => {
    const full = await getUserInfo(expert.username);
    if (full) setWatchlist(prev => [full, ...prev]);
  };

  const handleToggleMemberInList = async (listId, contributor) => {
    const handle = typeof contributor === 'string' ? contributor : (contributor?.username || '');
    const cleanHandle = handle.trim().replace(/^@/, '').toLowerCase();
    if (!cleanHandle) return;

    // 1. Ensure user is in global watchlist first
    if (!watchlist.find(u => (u.username || '').toLowerCase() === cleanHandle)) {
      try {
        let full = typeof contributor === 'object' && contributor.name ? contributor : null;
        if (!full) full = await getUserInfo(cleanHandle);
        
        const newUser = full || { id: cleanHandle, username: cleanHandle, name: cleanHandle, profile_image_url: '', isPlaceholder: true };
        setWatchlist(prev => [newUser, ...prev]);
        if (!full) resolvePlaceholders([newUser]);
      } catch (err) {
        console.error(err);
      }
    }

    // 2. Toggle in list
    setPostLists(prev => (prev || []).map(l => {
      if (l.id !== listId) return l;
      const members = Array.isArray(l.members) ? l.members : [];
      const alreadyIn = members.some(m => m.toLowerCase() === cleanHandle);
      if (alreadyIn) {
        return { ...l, members: members.filter(m => m.toLowerCase() !== cleanHandle) };
      } else {
        return { ...l, members: [...members, cleanHandle] };
      }
    }));
  };

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    const data = await getUserInfo(manualQuery);
    setManualPreview(data);
  };

  const handleAddUser = (user) => {
    setWatchlist(prev => [user, ...prev]);
    setManualPreview(null);
    setManualQuery('');
  };

  const handleAddSearchAuthorToWatchlist = async (post) => {
    const username = (post?.author?.username || '').trim().replace(/^@/, '').toLowerCase();
    if (!username) return;

    const existingUser = watchlist.find((user) => (user.username || '').toLowerCase() === username);
    if (existingUser) {
      setStatus(`@${username} อยู่ใน Watchlist แล้ว`);
      return;
    }

    try {
      const fullUser = await getUserInfo(username);
      const fallbackUser = {
        id: post?.author?.id || username,
        username,
        name: post?.author?.name || username,
        profile_image_url: post?.author?.profile_image_url || '',
        isPlaceholder: !fullUser,
      };
      const nextUser = fullUser || fallbackUser;

      setWatchlist((prev) => {
        if (prev.some((user) => (user.username || '').toLowerCase() === username)) return prev;
        return [nextUser, ...prev];
      });

      if (!fullUser) resolvePlaceholders([fallbackUser]);
      setStatus(`เพิ่ม @${username} เข้า Watchlist แล้ว`);
    } catch (error) {
      console.error(error);
      const fallbackUser = {
        id: post?.author?.id || username,
        username,
        name: post?.author?.name || username,
        profile_image_url: post?.author?.profile_image_url || '',
        isPlaceholder: true,
      };
      setWatchlist((prev) => {
        if (prev.some((user) => (user.username || '').toLowerCase() === username)) return prev;
        return [fallbackUser, ...prev];
      });
      resolvePlaceholders([fallbackUser]);
      setStatus(`เพิ่ม @${username} เข้า Watchlist แล้ว`);
    }
  };

  const handleSaveGeneratedArticle = (title, content, meta) => {
    const newArt = {
      id: Date.now().toString(),
      type: 'article',
      title: title || '\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21 AI',
      summary: content,
      created_at: new Date().toISOString(),
      attachedSource: meta?.attachedSource || null,
      sources: meta?.sources || [],
    };
    setBookmarks((prev) => [newArt, ...prev]);
  };

  const openContentComposerFromPost = (item) => {
    setCreateContentSource(item);
    setActiveView('content');
    setTimeout(() => setContentTab('create'), 0);
  };

  const closeListModal = () => {
    setListModal((prev) => ({ ...prev, show: false }));
    if (reopenMobilePostListAfterModal) {
      setIsMobilePostListOpen(true);
      setReopenMobilePostListAfterModal(false);
    }
  };

  const openListModal = (mode) => {
    if (isMobilePostListOpen) {
      setReopenMobilePostListAfterModal(true);
      setIsMobilePostListOpen(false);
    }

    setListModal({ show: true, mode, value: '' });
  };

  const closeFilterModal = () => {
    setFilterModal((prev) => ({ ...prev, show: false }));
  };

  const workspaceLoadingFallback = (
    <div className="animate-fade-in" style={{ padding: '56px 0', display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: '700' }}>
        <Loader2 size={16} className="animate-spin" />
        <span>Loading workspace...</span>
      </div>
    </div>
  );

  return (
    <div className="foro-layout">
      <Sidebar 
        activeView={activeView}
        onNavClick={(view) => {
          startTransition(() => {
            setActiveView(view);
          });
          if (view === 'home') { 
            setActiveListId(null);
          }
        }}
        backgroundTasks={{
          syncing: loading,
          generating: isGeneratingContent,
          searching: isSearching,
          filtering: filterModal.isFiltering,
          audienceSearch: aiSearchLoading
        }}
      />

      {isMobilePostListOpen && (
        <div className="mobile-backdrop" onClick={() => setIsMobilePostListOpen(false)} />
      )}

      <main className="foro-main">
        <div className="foro-main-scroll">

          <HomeView
            isVisible={activeView === 'home'}
            currentActiveList={currentActiveList}
            activeListId={activeListId}
            originalFeedLength={originalFeed.length}
            deletedFeedLength={deletedFeed.length}
            feed={feed}
            isFiltered={isFiltered}
            activeFilters={activeFilters}
            visibleQuickPresets={visibleQuickPresets}
            quickFilterPresets={quickFilterPresets}
            isFiltering={filterModal.isFiltering}
            loading={loading}
            pendingFeed={pendingFeed}
            nextCursor={nextCursor}
            aiFilterSummary={aiFilterSummary}
            aiFilterSummaryDateLabel={aiFilterSummaryDateLabel}
            bookmarks={bookmarks}
            onOpenMobileList={() => setIsMobilePostListOpen(true)}
            onDeleteAll={handleDeleteAll}
            onUndo={handleUndo}
            onSort={handleSort}
            onQuickFilter={handleAiFilter}
            onOpenFilterModal={() => setFilterModal({ show: true, prompt: '' })}
            onSync={handleSync}
            onLoadMore={handleLoadMore}
            onClearAiFilter={clearAiFilter}
            onBookmark={handleBookmark}
            onArticleGen={openContentComposerFromPost}
            onSummaryCopied={() => setStatus('คัดลอกบทสรุปแล้ว')}
          />
          {/* ===== UNIFIED CONTENT VIEW ===== */}
          <Suspense fallback={workspaceLoadingFallback}>
            <ContentWorkspace
              isVisible={activeView === 'content'}
              contentTab={contentTab}
              setContentTab={setContentTab}
              createContentSource={createContentSource}
              onRemoveSource={() => setCreateContentSource(null)}
              onSaveGeneratedArticle={handleSaveGeneratedArticle}
              isGeneratingContent={isGeneratingContent}
              setIsGeneratingContent={setIsGeneratingContent}
              genPhase={genPhase}
              setGenPhase={setGenPhase}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              activeSuggestionIndex={activeSuggestionIndex}
              setActiveSuggestionIndex={setActiveSuggestionIndex}
              handleSearch={handleSearch}
              isLatestMode={isLatestMode}
              setIsLatestMode={setIsLatestMode}
              isSearching={isSearching}
              searchResults={searchResults}
              setSearchResults={setSearchResults}
              setSearchOverflowResults={setSearchOverflowResults}
              setSearchSummary={setSearchSummary}
              setSearchWebSources={setSearchWebSources}
              setSearchCursor={setSearchCursor}
              setStatus={setStatus}
              shouldInlineSearchStatus={shouldInlineSearchStatus}
              searchStatusMessage={searchStatusMessage}
              lastSubmittedSearchQuery={lastSubmittedSearchQuery}
              searchPresets={searchPresets}
              canSaveCurrentSearchAsPreset={canSaveCurrentSearchAsPreset}
              maxSearchPresets={MAX_SEARCH_PRESETS}
              addSearchPreset={addSearchPreset}
              isLiveSearching={isLiveSearching}
              dynamicSearchTags={dynamicSearchTags}
              watchlistHandleSet={watchlistHandleSet}
              postLists={postLists}
              onAddAuthorToWatchlist={handleAddSearchAuthorToWatchlist}
              onToggleAuthorInPostList={handleToggleMemberInList}
              searchHistory={searchHistory}
              interestSeedLabels={interestSeedLabels}
              removeSearchPreset={removeSearchPreset}
              searchOverflowResults={searchOverflowResults}
              searchCursor={searchCursor}
              searchSummary={searchSummary}
              searchWebSources={searchWebSources}
              isSourcesExpanded={isSourcesExpanded}
              setIsSourcesExpanded={setIsSourcesExpanded}
              onArticleGen={openContentComposerFromPost}
            />
          </Suspense>

          {/* ===== READ VIEW ===== */}
          <Suspense fallback={workspaceLoadingFallback}>
            <ReadWorkspace
              isVisible={activeView === 'read'}
              activeListId={activeListId}
              currentActiveList={currentActiveList}
              setIsMobilePostListOpen={setIsMobilePostListOpen}
              readArchive={readArchive}
              readSearchQuery={readSearchQuery}
              setReadSearchQuery={setReadSearchQuery}
              readSearchSuggestions={readSearchSuggestions}
              filteredReadArchive={filteredReadArchive}
              readFilters={readFilters}
              setReadFilters={setReadFilters}
              visibleReadArchive={visibleReadArchive}
              setVisibleReadCount={setVisibleReadCount}
              readArchiveRenderBatch={READ_ARCHIVE_RENDER_BATCH}
              bookmarkIds={bookmarkIds}
              handleBookmark={handleBookmark}
              onArticleGen={openContentComposerFromPost}
              selectedArticle={selectedArticle}
              setSelectedArticle={setSelectedArticle}
            />
          </Suspense>

          {/* ===== AUDIENCE VIEW: SMART TARGET DISCOVERY ===== */}
          <Suspense fallback={workspaceLoadingFallback}>
            <AudienceWorkspace
              isVisible={activeView === 'audience'}
              audienceTab={audienceTab}
              setAudienceTab={setAudienceTab}
              aiQuery={aiQuery}
              setAiQuery={setAiQuery}
              handleAiSearchAudience={handleAiSearchAudience}
              aiSearchLoading={aiSearchLoading}
              aiSearchResults={aiSearchResults}
              watchlist={watchlist}
              postLists={postLists}
              handleToggleMemberInList={handleToggleMemberInList}
              handleAddExpert={handleAddExpert}
              manualQuery={manualQuery}
              setManualQuery={setManualQuery}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              activeSuggestionIndex={activeSuggestionIndex}
              setActiveSuggestionIndex={setActiveSuggestionIndex}
              suggestions={suggestions}
              handleManualSearch={handleManualSearch}
              manualPreview={manualPreview}
              handleAddUser={handleAddUser}
              handleRemoveAccountGlobal={handleRemoveAccountGlobal}
            />
          </Suspense>

          {/* ===== BOOKMARKS VIEW ===== */}
          <Suspense fallback={workspaceLoadingFallback}>
            <BookmarksWorkspace
              isVisible={activeView === 'bookmarks'}
              currentActiveList={currentActiveList}
              activeListId={activeListId}
              setIsMobilePostListOpen={setIsMobilePostListOpen}
              bookmarkTab={bookmarkTab}
              setBookmarkTab={setBookmarkTab}
              filteredBookmarks={filteredBookmarks}
              handleBookmark={handleBookmark}
              onArticleGen={openContentComposerFromPost}
              setSelectedArticle={setSelectedArticle}
              setBookmarks={setBookmarks}
            />
          </Suspense>
        </div>
        </main>

      <ListModal
        listModal={listModal}
        onChange={(value) => setListModal((prev) => ({ ...prev, value }))}
        onClose={closeListModal}
        onConfirm={finalizeListAction}
      />

      <AiFilterModal
        filterModal={filterModal}
        quickFilterPresets={quickFilterPresets}
        quickFilterVisiblePresets={quickFilterVisiblePresets}
        visibleQuickPresets={visibleQuickPresets}
        onClose={closeFilterModal}
        onPromptChange={(value) => setFilterModal((prev) => ({ ...prev, prompt: value }))}
        onSelectPreset={(preset) => setFilterModal((prev) => ({ ...prev, prompt: preset }))}
        onRemovePreset={removeQuickPreset}
        onToggleVisiblePreset={toggleVisibleQuickPreset}
        onAddPreset={addQuickPreset}
        onSubmit={() => handleAiFilter()}
      />

      <StatusToast
        status={status}
        message={searchStatusMessage}
        hidden={shouldInlineSearchStatus}
      />
      <RightSidebar 
        watchlist={watchlist} postLists={postLists} activeListId={activeListId}
        onSelectList={setActiveListId}
        onCreateList={() => openListModal('create')}
        onImportList={() => openListModal('import')}
        onRemoveList={handleRemoveList} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}
        onUpdateList={handleUpdateList} onShareList={handleShareList} onRemoveAccount={handleRemoveAccountGlobal}
        isMobileOpen={isMobilePostListOpen} onCloseMobile={() => setIsMobilePostListOpen(false)}
      />
    </div>
  );
};

export default App;


