// @ts-nocheck
import React, { Suspense, lazy, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Sparkles,
  RefreshCw,
  RefreshCcw,
  Trash2,
  Undo2,
  Eye,
  Heart,
  Activity,
  Zap,
  X,
  Plus,
  FileCode,
  Share2,
  PenTool,
  Loader2,
  Filter,
  Copy,
  ShieldCheck,
  List,
  LayoutGrid,
  BookOpen,
  ExternalLink,
  Link,
  Users,
  Cpu,
  Bot,
  BriefcaseBusiness,
  TrendingUp,
  BadgeDollarSign,
  ChartColumn,
  Bitcoin,
  HeartPulse,
  Leaf,
  Globe2,
  Landmark,
  BrainCircuit
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import HomeCanvas from './components/HomeCanvas';
import FeedCard from './components/FeedCard';
import AiFilteredBadge from './components/AiFilteredBadge';
import {
  getUserInfo,
  fetchWatchlistFeed,
  RECENT_WINDOW_HOURS,
  searchEverything,
  searchEverythingDeep,
  curateSearchResults,
  analyzeSearchQueryIntent,
  clusterBySimilarity
} from './services/TwitterService';
import { agentFilterFeed, buildSearchPlan, discoverTopExperts, expandSearchQuery, generateExecutiveSummary, generateGrokBatch, generateGrokSummary, tavilySearch } from './services/GrokService';
import { renderMarkdownToHtml } from './utils/markdown';
import './index.css';
import { STORAGE_KEYS } from './constants/storageKeys';
import useLibraryViews from './hooks/useLibraryViews';
import { usePersistentState } from './hooks/usePersistentState';
import {
  deriveVisibleFeed,
  safeParse,
  mergeUniquePostsById,
  hasUsefulThaiSummary,
  sanitizeStoredPost,
  sanitizeStoredCollection,
  sanitizeStoredSingle,
  sanitizeCollectionState,
  normalizeSearchText,
  mergePlanLabelsIntoQuery
} from './utils/appUtils';
import UserCard from './components/UserCard';
import { TOPIC_TRIGGERS } from './config/topics';

const AudienceWorkspace = lazy(() => import('./components/AudienceWorkspace'));
const BookmarksWorkspace = lazy(() => import('./components/BookmarksWorkspace'));
const ContentWorkspace = lazy(() => import('./components/ContentWorkspace'));
const ReadWorkspace = lazy(() => import('./components/ReadWorkspace'));

const deserializeWatchlist = (saved) => {
  const parsed = safeParse(saved, []);
  return Array.isArray(parsed) ? parsed.filter((user) => user && user.username) : [];
};

const deserializeStoredCollection = (saved) =>
  sanitizeStoredCollection(safeParse(saved, []));

const deserializeAttachedSource = (saved) =>
  sanitizeStoredSingle(safeParse(saved, null));

const deserializePostLists = (saved) => safeParse(saved, []);

const MAX_SEARCH_PRESETS = 4;
const READ_ARCHIVE_INITIAL_RENDER = 24;
const READ_ARCHIVE_RENDER_BATCH = 24;

const normalizeSearchLabel = (value) => (value || '').trim().replace(/\s+/g, ' ');

const deserializeSearchPresets = (saved) => {
  const parsed = safeParse(saved, []);
  if (!Array.isArray(parsed)) return [];

  return Array.from(
    new Set(
      parsed
        .map((item) => normalizeSearchLabel(typeof item === 'string' ? item : item?.label))
        .filter(Boolean),
    ),
  ).slice(0, MAX_SEARCH_PRESETS);
};

const deserializeSearchHistory = (saved) => {
  const parsed = safeParse(saved, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => ({
      query: normalizeSearchLabel(item?.query),
      count: Math.max(1, Number(item?.count) || 1),
      lastUsedAt: typeof item?.lastUsedAt === 'string' ? item.lastUsedAt : new Date(0).toISOString(),
    }))
    .filter((item) => item.query)
    .slice(0, 12);
};

const TOPIC_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'about', 'into', 'over', 'after',
  'have', 'has', 'will', 'just', 'more', 'than', 'what', 'when', 'where', 'their', 'they', 'them',
  'ข่าว', 'โพสต์', 'สรุป', 'ข้อมูล', 'ล่าสุด', 'ตอนนี้', 'ระบบ', 'ของ', 'และ', 'หรือ', 'ที่', 'ใน', 'จาก',
  'ให้', 'แล้ว', 'กับ', 'แบบ', 'มาก', 'ขึ้น', 'ตาม', 'ผ่าน', 'เพื่อ', 'ยัง', 'ไม่มี', 'อยู่',
]);

const TOPIC_ALLOWLIST = new Set([
  'AI', 'Web3', 'Crypto', 'Esport', 'Esports', 'Gaming', 'Marketing', 'Startup', 'Netflix', 'YouTube',
  'Epic Games', 'Epic Games Store', 'Dune', 'Steam', 'Xbox', 'PS5', 'OpenAI', 'Bitcoin', 'Ethereum',
]);

const extractInterestTopics = (items = []) => {
  const topicScores = new Map();

  const pushTopic = (rawLabel, weight = 1) => {
    const label = normalizeSearchLabel(rawLabel);
    if (!label) return;
    const normalized = normalizeSearchText(label);
    if (!normalized || TOPIC_STOPWORDS.has(normalized)) return;

    if (!TOPIC_ALLOWLIST.has(label)) {
      if (label.startsWith('@')) return;
      if (label.length < 3 || label.length > 32) return;
      if (/^[a-z0-9_]+$/i.test(label) && !/[A-Z]/.test(label) && !/[ก-ฮ]/.test(label)) return;
      if (label.split(' ').length > 3) return;
    }

    topicScores.set(label, (topicScores.get(label) || 0) + weight);
  };

  items.forEach((item) => {
    const text = [item?.summary, item?.text].filter(Boolean).join(' ');
    const authorName = normalizeSearchText(item?.author?.name);
    const authorUsername = normalizeSearchText(item?.author?.username);

    const hashtags = text.match(/#([\p{L}\p{N}_]{3,30})/gu) || [];
    hashtags.forEach((hashtag) => pushTopic(hashtag.replace(/^#/, ''), 3));

    const uppercasePhrases = text.match(/\b(?:AI|Web3|Crypto|Gaming|Esports?|Netflix|YouTube|Steam|Xbox|PS5|OpenAI|Bitcoin|Ethereum|Dune|Epic Games(?: Store)?)\b/gi) || [];
    uppercasePhrases.forEach((phrase) => pushTopic(phrase, 3));

    const properNouns = text.match(/\b[A-Z][a-zA-Z0-9+.-]{2,}(?:\s+[A-Z][a-zA-Z0-9+.-]{2,}){0,2}\b/g) || [];
    properNouns.forEach((phrase) => {
      const normalizedPhrase = normalizeSearchText(phrase);
      if (normalizedPhrase === authorName || normalizedPhrase === authorUsername) return;
      pushTopic(phrase, 2);
    });
  });

  return Array.from(topicScores.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([label]) => label)
    .slice(0, 6);
};

const shouldRemoveWhenFalsy = (value) => !value;

const BROAD_QUERY_BLUEPRINTS = [
  {
    triggers: TOPIC_TRIGGERS.gaming,
    entityQuery: '(Nintendo OR PlayStation OR Xbox OR Steam OR "Switch 2" OR GTA OR Pokemon OR Zelda OR Mario OR "Monster Hunter" OR "Game Awards")',
    viralQuery: '(gaming OR videogames OR Nintendo OR PlayStation OR Xbox OR Steam OR "Switch 2" OR GTA) min_faves:500',
  },
  {
    triggers: TOPIC_TRIGGERS.football,
    entityQuery: '(Premier League OR Champions League OR FIFA OR UEFA OR Arsenal OR Liverpool OR Real Madrid OR Barcelona)',
    viralQuery: '(football OR soccer OR Premier League OR Champions League OR FIFA OR UEFA) min_faves:500',
  },
  {
    triggers: TOPIC_TRIGGERS.crypto,
    entityQuery: '(Bitcoin OR BTC OR Ethereum OR ETH OR Solana OR Binance OR Coinbase OR ETF)',
    viralQuery: '(crypto OR bitcoin OR btc OR ethereum OR eth OR solana) min_faves:500',
  },
];

const getBroadQueryBlueprint = (query = '') => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return null;

  return BROAD_QUERY_BLUEPRINTS.find((blueprint) =>
    blueprint.triggers.some((trigger) => normalized.includes(normalizeSearchText(trigger))),
  ) || null;
};

const getBroadFallbackQueries = (query = '') => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const fallbackGroups = [
    {
      triggers: TOPIC_TRIGGERS.gaming,
      queries: [
        '(game OR gaming OR videogame OR videogames OR เกม OR วงการเกม)',
        '(Nintendo OR PlayStation OR Xbox OR Steam OR PS5 OR GTA OR Pokemon OR Zelda OR Mario OR "Monster Hunter" OR "Game Awards")',
        '(esports OR gamedev OR "game dev" OR studio OR trailer OR launch)',
      ],
    },
    {
      triggers: TOPIC_TRIGGERS.football,
      queries: [
        '(football OR soccer OR ฟุตบอล)',
        '(Premier League OR Champions League OR FIFA OR UEFA OR Arsenal OR Liverpool OR Real Madrid OR Barcelona)',
      ],
    },
    {
      triggers: TOPIC_TRIGGERS.crypto,
      queries: [
        '(crypto OR bitcoin OR btc OR ethereum OR eth OR คริปโต)',
        '(Solana OR Binance OR Coinbase OR ETF OR blockchain OR web3)',
      ],
    },
  ];

  const match = fallbackGroups.find((group) =>
    group.triggers.some((trigger) => normalized.includes(normalizeSearchText(trigger))),
  );

  return match ? match.queries : [];
};

const isBroadTopicSearchQuery = (query = '') => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return false;

  const stripped = normalized
    .replace(/\b(latest|breaking|today|now|update|news)\b/g, ' ')
    .replace(/ข่าว|ล่าสุด|วันนี้|ด่วน|อัปเดต|อัพเดต/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokenCount = stripped ? stripped.split(' ').length : 0;

  if (tokenCount === 0 || tokenCount > 4) return false;
  if (/from:|since:|until:|@|"/i.test(query)) return false;

  return Boolean(getBroadQueryBlueprint(query));
};

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
  const [aiReport, setAiReport] = useState('');
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
  const [searchOverflowResults, setSearchOverflowResults] = useState([]);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [searchCursor, setSearchCursor] = useState(null);
  const [activeSearchPlan, setActiveSearchPlan] = useState(null);
  const onlyNews = true;
  const [nextCursor, setNextCursor] = useState(null);
  const [isLatestMode, setIsLatestMode] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isLiveSearching, setIsLiveSearching] = useState(false);

  const commonKeywords = [
  'AI', 'Artificial Intelligence', 'Elon Musk', 'Tesla', 'SpaceX', 'Bitcoin', 'Ethereum', 'Crypto', 'Vitalik Buterin',
  'Technology', 'Future', 'Innovation', 'Machine Learning', 'GPT-4', 'OpenAI',
  'Market Analysis', 'Web3', 'Blockchain', 'Social Media', 'Marketing Strategy'
];

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
  const [audienceKey, setAudienceKey] = useState(0);
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [manualQuery, setManualQuery] = useState('');
  const [manualPreview, setManualPreview] = useState(null);

  const [isFiltered, setIsFiltered] = useState(false);
  const [aiFilterSummary, setAiFilterSummary] = useState('');

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
    if (aiReport) {
      const timer = setTimeout(() => setAiReport(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [aiReport]);

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
    if (activeView === 'audience') {
      setAudienceKey(k => k + 1);
      setAiSearchResults([]);
    }
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
    if (!requestedQuery && !isMore) return;
    if (isMore && searchOverflowResults.length > 0) {
      const nextChunk = searchOverflowResults.slice(0, 10);
      setSearchResults((prev) => [...prev, ...nextChunk]);
      setSearchOverflowResults((prev) => prev.slice(10));
      return;
    }
    if (!isMore) recordSearchInterest(requestedQuery);
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
              : 1;
            sq = `${sq} min_faves:${latestMinFaves}`;
          }
        } else {
          // For Top mode, ensure at least some baseline viral signal
          if (!q.includes('min_faves:')) {
            const topMinFaves = effectiveBroadDiscoveryQuery
              ? (lane === 'exact' ? 15 : lane === 'broad' ? 40 : 75)
              : 2;
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
          webContext = [
            webData.answer ? `[WEB NEWS ANSWER]\n${webData.answer}` : '',
            (webData.results || []).map((r, i) => `${i+1}. ${r.title}: ${r.content?.slice(0, 200)}... (${r.url})`).join('\n')
          ].filter(Boolean).join('\n\n');
          setSearchWebSources(webData.results || []);
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
            temporalTag: tweet.temporalTag || (isLatestMode ? 'Breaking' : 'Background'),
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
                temporalTag: tweet.temporalTag || (isLatestMode ? 'Breaking' : 'Background'),
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
  const dynamicSearchTags = [
    ...searchPresets.map((label) => ({ label, source: 'preset' })),
    ...searchHistoryLabels
      .filter((label) => !searchPresets.some((preset) => preset.toLowerCase() === label.toLowerCase()))
      .map((label) => ({ label, source: 'history' })),
    ...interestSeedLabels
      .filter(
        (label) =>
          !searchPresets.some((preset) => preset.toLowerCase() === label.toLowerCase()) &&
          !searchHistoryLabels.some((historyItem) => historyItem.toLowerCase() === label.toLowerCase()),
      )
      .map((label) => ({ label, source: 'interest' })),
    ...commonKeywords
      .filter(
        (label) =>
          !searchPresets.some((preset) => preset.toLowerCase() === label.toLowerCase()) &&
          !searchHistoryLabels.some((historyItem) => historyItem.toLowerCase() === label.toLowerCase()) &&
          !interestSeedLabels.some((interestItem) => interestItem.toLowerCase() === label.toLowerCase()),
      )
      .map((label) => ({ label, source: 'fallback' })),
  ].slice(0, MAX_SEARCH_PRESETS);

  const canSaveCurrentSearchAsPreset =
    !!normalizeSearchLabel(searchQuery) &&
    !searchPresets.some((item) => item.toLowerCase() === normalizeSearchLabel(searchQuery).toLowerCase()) &&
    searchPresets.length < MAX_SEARCH_PRESETS;

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
    activeReadListMemberSet,
    filteredBookmarks,
    bookmarkIds,
    normalizedReadSearchQuery,
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

  useEffect(() => {
    const isAudienceManual = activeView === 'audience' && audienceTab === 'manual';
    const query = isAudienceManual ? manualQuery : searchQuery;

    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const suggestionPool = Array.from(
      new Set([...searchPresets, ...searchHistoryLabels, ...interestSeedLabels, ...commonKeywords]),
    );

    const filteredSuggestions = suggestionPool
      .filter((kw) => kw.toLowerCase().includes(query.toLowerCase()) && kw.toLowerCase() !== query.toLowerCase())
      .slice(0, 5);
    setSuggestions(filteredSuggestions);

    // Removed automatic debounced search as requested by user (Bug fix)
    /*
    if (!isAudienceManual) {
      const timer = setTimeout(() => {
        if (searchQuery.trim().length >= 1) {
          setIsLiveSearching(true);
          handleSearch(null, false, searchQuery);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, manualQuery, activeView, audienceTab, contentTab, searchPresets, searchHistory, postLists, watchlist]);

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

  const hasHomeSecondaryActions = originalFeed.length > 0 || deletedFeed.length > 0;
  const showHomeFeedToolbar = feed.length > 0 || isFiltered;

  const handleAiSearchAudience = async (q, isMore = false) => {
    const query = q || aiQuery;
    setAiSearchLoading(true);
    try {
      const excludes = [
        ...watchlist.map(u => u.username),
        ...(isMore ? aiSearchResults.map(u => u.username) : [])
      ];
      const experts = await discoverTopExperts(query, excludes);
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

          {/* ===== HOME VIEW ===== */}
          <div className="animate-fade-in" style={{ display: activeView === 'home' ? 'block' : 'none' }}>
            <header className="dashboard-header dashboard-header-home dashboard-header-home-layout">
                <div className="dashboard-header-top dashboard-header-top-layout">
                  <div className="mobile-only-flex home-mobile-logo home-mobile-logo-layout">
                    <img src="logo.png" alt="FO" className="home-mobile-logo-img" loading="eager" />
                  </div>
                  <div className="dashboard-header-title-block dashboard-header-title-stack">
                    <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: '500' }}>WATCHLIST FEED</div>
                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', lineHeight: '1.4', color: currentActiveList?.color || 'inherit' }}>
                      {currentActiveList?.name || '\u0e2b\u0e19\u0e49\u0e32\u0e2b\u0e25\u0e31\u0e01'}
                    </h1>
                  </div>
                  <button className="mobile-only-flex icon-btn-large" onClick={() => setIsMobilePostListOpen(true)}><List size={20} /></button>
                </div>
                
                <div className={`dashboard-header-actions home-control-panel ${hasHomeSecondaryActions ? '' : 'home-control-panel-compact'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                  <div className="dashboard-header-actions-group" style={{ display: 'flex', gap: '8px' }}>
                    {originalFeed.length > 0 && (
                      <button onClick={handleDeleteAll} className="icon-btn-large header-secondary-action"><Trash2 size={16} /></button>
                    )}
                    {deletedFeed.length > 0 && (
                      <button onClick={handleUndo} className="icon-btn-large header-secondary-action undo-reveal"><Undo2 size={16} /></button>
                    )}
                  </div>
                  <div className="mobile-only-flex home-mobile-feed-inline" style={{ alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
                    <div className="feed-section-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="section-title">โพสต์ล่าสุด</div>
                      {isFiltered && <AiFilteredBadge onClear={clearAiFilter} clearTitle="\u0e25\u0e49\u0e32\u0e07\u0e15\u0e31\u0e27\u0e01\u0e23\u0e2d\u0e07" />}
                    </div>
                    <div className="feed-section-filters" style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleSort('view')} className={`btn-pill ${activeFilters.view ? 'active' : ''}`}>ยอดวิว</button>
                      <button onClick={() => handleSort('engagement')} className={`btn-pill ${activeFilters.engagement ? 'active' : ''}`}>เอนเกจเมนต์</button>
                    </div>
                  </div>
                  <div className="home-ai-filter-cluster">
                    {feed.length > 0 && !isFiltered && visibleQuickPresets.length > 0 && (
                      <div className="home-ai-quick-presets">
                        {visibleQuickPresets.map(preset => (
                          <div key={preset} className="home-ai-quick-chip">
                            <button
                              onClick={() => handleAiFilter(preset)}
                              disabled={filterModal.isFiltering}
                              className="home-ai-quick-preset-btn"
                            >
                              {preset}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {feed.length > 0 && !isFiltered && quickFilterPresets.length > 0 && (
                      <div className="home-ai-connector">
                        <div className="home-ai-connector-line" />
                      </div>
                    )}
                    <button
                      onClick={() => setFilterModal({ show: true, prompt: '' })}
                      className={`btn-pill ${activeView === 'home' && feed.length > 0 ? 'home-ai-filter-ready' : ''}`}
                    >
                      AI Filter
                    </button>
                    <button
                      onClick={handleSync}
                      disabled={loading || originalFeed.length > 0}
                      className="btn-pill primary"
                      title={originalFeed.length > 0 ? 'ล้างฟีดทั้งหมดก่อนแล้วค่อยหาฟีดใหม่' : undefined}
                    >
                      {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} ฟีดข้อมูล
                    </button>
                  </div>
                </div>
              </header>

              {showHomeFeedToolbar && <div className="feed-section-header home-desktop-feed-header home-feed-toolbar reader-toolbar-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="feed-section-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="section-title">โพสต์ล่าสุด</div>
                  {activeListId && <div className="active-list-pills">กำลังกรองตาม: {currentActiveList?.name}</div>}
                  {isFiltered && <AiFilteredBadge onClear={clearAiFilter} clearTitle="\u0e25\u0e49\u0e32\u0e07\u0e15\u0e31\u0e27\u0e01\u0e23\u0e2d\u0e07" />}
                </div>
                <div className="feed-section-filters reader-toolbar-actions-group" style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleSort('view')} className={`btn-pill ${activeFilters.view ? 'active' : ''}`}>ยอดวิว</button>
                  <button onClick={() => handleSort('engagement')} className={`btn-pill ${activeFilters.engagement ? 'active' : ''}`}>เอนเกจเมนต์</button>
                </div>
              </div>}

              {aiFilterSummary && (
                <div className="search-summary-card animate-fade-in">
                  <div style={{
                    position: 'absolute', top: '-20px', left: '-20px', width: '120px', height: '120px',
                    background: 'radial-gradient(circle, rgba(41, 151, 255, 0.15) 0%, transparent 70%)',
                    zIndex: 0,
                    pointerEvents: 'none'
                  }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ 
                        background: 'var(--accent-gradient)', padding: '8px', borderRadius: '12px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                      }}>
                        <Sparkles size={18} fill="currentColor" />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--accent-secondary)' }}>NEWS FILTER SUMMARY</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>SYNTHESIZING {feed.length} FILTERED RESULTS</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(aiFilterSummary);
                        setStatus('คัดลอกบทสรุปแล้ว');
                      }}
                      className="btn-mini-ghost" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      <Copy size={14} /> ก๊อปปี้สรุป
                    </button>
                  </div>

                  <div 
                    className="markdown-body search-summary-content" 
                    style={{ fontSize: '15px', lineHeight: '1.8', color: 'rgba(255,255,255,0.9)', position: 'relative', zIndex: 1 }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(aiFilterSummary) }} 
                  />
                  
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', 
                    marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600'
                  }}>
                    <ShieldCheck size={12} className="text-accent" />
                    สรุปโดย AI อ้างอิงจากบทสนทนาและเงื่อนไขการกรองของคุณ
                  </div>
                </div>
              )}
              <div className="feed-grid">
                {feed.length === 0 && (
                  <div
                    className="home-splash"
                    onMouseMove={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
                      e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
                    }}
                  >
                    <HomeCanvas />
                    <div className="home-splash-inner">
                      <h2 className="home-splash-title no-select-ui">
                        FORO ติดตามทุกเรื่องที่คุณสนใจ
                      </h2>
                    </div>
                  </div>
                )}
                {feed.length > 0 && feed.map((item, idx) => (
                  <FeedCard key={item.id || idx} tweet={item}
                    isBookmarked={bookmarks.some(b => b.id === item.id)}
                    onBookmark={handleBookmark}
                    onArticleGen={openContentComposerFromPost}
                  />
                ))}
              </div>
              {(pendingFeed.length > 0 || nextCursor) && !loading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <button onClick={handleLoadMore} className="btn-pill">โหลดเพิ่มเติม</button>
                </div>
              )}
            </div>

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
              setSuggestions={setSuggestions}
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
              searchPresets={searchPresets}
              canSaveCurrentSearchAsPreset={canSaveCurrentSearchAsPreset}
              maxSearchPresets={MAX_SEARCH_PRESETS}
              addSearchPreset={addSearchPreset}
              isLiveSearching={isLiveSearching}
              dynamicSearchTags={dynamicSearchTags}
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
              audienceKey={audienceKey}
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

      {listModal.show && (
        <div className="modal-overlay" onClick={() => {
          setListModal({ ...listModal, show: false });
          if (reopenMobilePostListAfterModal) {
            setIsMobilePostListOpen(true);
            setReopenMobilePostListAfterModal(false);
          }
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {listModal.mode === 'create' ? 'สร้าง Post List ใหม่' : 
               listModal.mode === 'edit' ? 'แก้ไข Post List' : 'นำเข้า Post List'}
            </div>
            <div className="modal-subtitle">
              {listModal.mode === 'create' ? 'ตั้งชื่อให้ลิสต์ของคุณเพื่อเริ่มจัดกลุ่มแหล่งข้อมูล และรับการสรุปข่าวจากกลุ่มเป้าหมายที่เลือกไว้โดยเฉพาะ' : 
               listModal.mode === 'edit' ? 'ปรับปรุงชื่อหรือการตั้งค่าสำหรับลิสต์นี้' : 'วางรหัสแชร์เพื่อนำเข้า Post List พร้อมรายชื่อสมาชิกทั้งหมด'}
            </div>
            <input 
              className="modal-input"
              autoFocus
              placeholder={listModal.mode === 'import' ? "https://..." : "เช่น DeFi Experts, Crypto News..."}
              value={listModal.value} 
              onChange={e => setListModal({ ...listModal, value: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && finalizeListAction()}
            />
            <div className="modal-actions">
              <button className="modal-btn modal-btn-secondary" onClick={() => {
                setListModal({ ...listModal, show: false });
                if (reopenMobilePostListAfterModal) {
                  setIsMobilePostListOpen(true);
                  setReopenMobilePostListAfterModal(false);
                }
              }}>ยกเลิก</button>
              <button className="modal-btn modal-btn-primary" onClick={finalizeListAction}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {filterModal.show && (
        <div className="modal-overlay" onClick={() => !filterModal.isFiltering && setFilterModal({ ...filterModal, show: false })}>
            <div className="modal-content ai-filter-modal animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="ai-filter-modal-header">
                <div className="ai-filter-modal-icon"><Sparkles size={16} /></div>
                <div>
                  <div className="modal-title">AI Smart Filter</div>
                  <div className="ai-filter-modal-hint">บอก AI ว่าอยากหาอะไรในฟีดนี้</div>
                </div>
              </div>
              {quickFilterPresets.length > 0 && (
                <div className="ai-filter-presets">
                  {quickFilterPresets.map((preset) => (
                    <div key={preset} className="ai-filter-modal-preset-chip">
                      <button
                        type="button"
                        className={`ai-filter-preset-btn ${filterModal.prompt === preset ? 'active' : ''}`}
                        disabled={filterModal.isFiltering}
                        onClick={() => setFilterModal({ ...filterModal, prompt: preset })}
                      >
                        {preset}
                      </button>
                      <button
                        type="button"
                        className="ai-filter-preset-remove-btn"
                        disabled={filterModal.isFiltering}
                        onClick={() => removeQuickPreset(preset)}
                        title="ลบ preset"
                      >
                        <X size={12} />
                      </button>
                      <button
                        type="button"
                        className={`ai-filter-preset-visibility-btn ${quickFilterVisiblePresets.includes(preset) ? 'active' : ''}`}
                        disabled={filterModal.isFiltering || (!quickFilterVisiblePresets.includes(preset) && visibleQuickPresets.length >= 3)}
                        onClick={() => toggleVisibleQuickPreset(preset)}
                        title={quickFilterVisiblePresets.includes(preset) ? 'ซ่อนจากหน้าข่าววันนี้' : 'แสดงบนหน้าข่าววันนี้'}
                      >
                        {quickFilterVisiblePresets.includes(preset) ? 'ซ่อน' : 'โชว์'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="ai-filter-visible-hint">เลือก preset ไปโชว์บนหน้าข่าววันนี้ได้สูงสุด 3 อัน</div>
              <textarea
                className="modal-input ai-filter-input"
                autoFocus
                disabled={filterModal.isFiltering}
                placeholder="เช่น AI ที่มี engagement สูง"
                value={filterModal.prompt}
                onChange={e => setFilterModal({ ...filterModal, prompt: e.target.value })}
              />
              {filterModal.prompt.trim() && !quickFilterPresets.includes(filterModal.prompt.trim()) && (
                <button
                  type="button"
                  className="ai-filter-save-preset-btn"
                  onClick={() => addQuickPreset(filterModal.prompt)}
                >
                  <Plus size={12} /> บันทึกเป็น Preset
                </button>
              )}
              <div className="modal-actions">
                <button
                  className="modal-btn modal-btn-secondary"
                  disabled={filterModal.isFiltering}
                  onClick={() => setFilterModal({ ...filterModal, show: false })}
                >
                  ยกเลิก
                </button>
                <button
                  className="modal-btn modal-btn-primary"
                  onClick={() => handleAiFilter()}
                  disabled={filterModal.isFiltering || !filterModal.prompt.trim()}
                  style={{ position: 'relative', overflow: 'hidden' }}
                >
                  {filterModal.isFiltering ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>กำลังวิเคราะห์...</span>
                    </>
                  ) : (
                    <>กรองฟีด</>
                  )}
                </button>
              </div>
          </div>
        </div>
      )}
      
      {status && !shouldInlineSearchStatus && (
        <div className="status-toast" style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: '#fff', color: '#000', padding: '12px 24px', borderRadius: '100px', fontSize: '12px', fontWeight: '900', letterSpacing: '0.02em', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 9999, maxWidth: 'min(720px, calc(100vw - 24px))', lineHeight: '1.4', textAlign: 'center' }}>
          {searchStatusMessage || status}
        </div>
      )}

      <RightSidebar 
        watchlist={watchlist} postLists={postLists} activeListId={activeListId}
        onSelectList={setActiveListId}
        onCreateList={() => {
          if (isMobilePostListOpen) {
            setReopenMobilePostListAfterModal(true);
            setIsMobilePostListOpen(false);
          }
          setListModal({ show: true, mode: 'create', value: '' });
        }}
        onImportList={() => {
          if (isMobilePostListOpen) {
            setReopenMobilePostListAfterModal(true);
            setIsMobilePostListOpen(false);
          }
          setListModal({ show: true, mode: 'import', value: '' });
        }}
        onRemoveList={handleRemoveList} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}
        onUpdateList={handleUpdateList} onShareList={handleShareList} onRemoveAccount={handleRemoveAccountGlobal}
        isMobileOpen={isMobilePostListOpen} onCloseMobile={() => setIsMobilePostListOpen(false)}
      />
    </div>
  );
};

export default App;
