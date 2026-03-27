import React, { useState, useEffect, useMemo } from 'react';
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
import CreateContent from './components/CreateContent';
import {
  getUserInfo,
  fetchWatchlistFeed,
  RECENT_WINDOW_HOURS,
  searchEverything,
  curateSearchResults
} from './services/TwitterService';
import { agentFilterFeed, buildSearchPlan, discoverTopExperts, expandSearchQuery, generateExecutiveSummary, generateGrokBatch, tavilySearch } from './services/GrokService';
import { renderMarkdownToHtml } from './utils/markdown';
import './index.css';
import { STORAGE_KEYS } from './constants/storageKeys';
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
  getEngagementTotal,
  normalizeSearchText,
  scoreFuzzyTextMatch,
  toNumber,
  mergePlanLabelsIntoQuery
} from './utils/appUtils';
import UserCard from './components/UserCard';
import ContentErrorBoundary from './components/ContentErrorBoundary';

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
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [searchCursor, setSearchCursor] = useState(null);
  const [activeSearchPlan, setActiveSearchPlan] = useState(null);
  const [onlyNews] = useState(true);
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

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

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

  const processAndSummarizeFeed = async (newBatch, statusPrefix = 'พบ') => {
    if (newBatch.length === 0) return;
    setStatus(`${statusPrefix} ${newBatch.length} โพสต์! กำลังทยอยแปลและสรุปเป็นภาษาไทย...`);
    const CHUNK_SIZE = 10;
    let runningFeed = [...originalFeed]; 
    
    for (let i = 0; i < newBatch.length; i += CHUNK_SIZE) {
      const chunk = newBatch.slice(i, i + CHUNK_SIZE);
      const toSummarize = chunk.filter(t => {
        const existing = runningFeed.find(p => p.id === t.id);
        return !hasUsefulThaiSummary(existing?.summary || t.summary, existing?.text || t.text);
      });

      if (toSummarize.length > 0) {
        const batchTexts = toSummarize.map(t => t.text);
        const summaries = await generateGrokBatch(batchTexts);
        toSummarize.forEach((post, idx) => {
          post.summary = summaries[idx] || post.text;
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
    if (!isMore) recordSearchInterest(requestedQuery);
    setIsSearching(true);
    if (!isMore) setSearchSummary('');
    setStatus(`AI กำลังค้นหาข้อมูลสำหรับ "${requestedQuery}"...`);

    try {
      let webContext = '';
      let searchPlan = activeSearchPlan;
      const searchQueryType = isLatestMode ? 'Latest' : 'Top';
      
      const isComplexQuery = !/ฮา|ตลก|ขำ|funny|meme|lol|haha/i.test(requestedQuery);
      const normalizedRequestedQuery = normalizeSearchText(requestedQuery);
      const queryTokenCount = normalizedRequestedQuery ? normalizedRequestedQuery.split(' ').length : 0;
      const isBroadDiscoveryQuery =
        queryTokenCount > 0 &&
        queryTokenCount <= 3 &&
        !/ล่าสุด|วันนี้|breaking|เปิดตัว|ประกาศ|ด่วน|now|today|update|news|ข่าว|รีวิว|เทียบ|vs|หลุด/i.test(requestedQuery) &&
        !/from:|since:|until:|@|"/i.test(requestedQuery);
      const shouldUseAdaptivePlan = isComplexQuery && !isBroadDiscoveryQuery;
      const preferStrictSources = isComplexQuery && !isBroadDiscoveryQuery;
      const rawDataChunks = [];
      let finalCursor = null;

      const getScopedQuery = (q) => {
        let sq = q;
        if (isLatestMode) {
          if (!q.includes('since:')) {
            const date = new Date();
            date.setHours(date.getHours() - 24);
            sq = `${q} since:${date.toISOString().split('T')[0]}`;
          }
          // Avoid 0-engagement noise even in Latest mode
          if (!q.includes('min_faves:')) sq = `${sq} min_faves:1`;
        } else {
          // For Top mode, ensure at least some baseline viral signal
          if (!q.includes('min_faves:')) sq = `${sq} min_faves:2`;
        }
        return sq;
      };
      
      if (!isMore) {
        setStatus(`[Phase 2] Async Parallel Fetch: Tavily + Broad X Search...`);
        
        // 1. Fire Tavily AND X Search (Broad) concurrently!
        const tavilyPromise = shouldUseAdaptivePlan ? tavilySearch(requestedQuery, isLatestMode) : Promise.resolve({ results: [], answer: '' });
        const expandedBroadQueryPromise = expandSearchQuery(requestedQuery, isLatestMode).catch((err) => {
          console.warn(`[Search] Failed to expand query: ${requestedQuery}`, err);
          return requestedQuery;
        });
        const exactSearchPromise = isBroadDiscoveryQuery
          ? searchEverything(getScopedQuery(requestedQuery), null, onlyNews, searchQueryType, true).catch((err) => {
              console.warn(`[Search] Failed exact query: ${requestedQuery}`, err);
              return { data: [], meta: {} };
            })
          : Promise.resolve({ data: [], meta: {} });
        const broadSearchPromise = expandedBroadQueryPromise.then((expandedBroadQuery) => {
          const broadQuery = getScopedQuery(expandedBroadQuery || requestedQuery);
          return searchEverything(broadQuery, null, onlyNews, searchQueryType, true).catch(err => {
            console.warn(`[Search] Failed broad query: ${broadQuery}`, err);
            return { data: [], meta: {} };
          });
        });

        const [webData, exactResult, broadResult] = await Promise.all([tavilyPromise, exactSearchPromise, broadSearchPromise]);
        
        if (exactResult.data && exactResult.data.length > 0) rawDataChunks.push(exactResult.data);
        if (broadResult.data && broadResult.data.length > 0) rawDataChunks.push(broadResult.data);
        if (!finalCursor && broadResult.meta?.next_cursor) finalCursor = broadResult.meta.next_cursor;
        if (!finalCursor && exactResult.meta?.next_cursor) finalCursor = exactResult.meta.next_cursor;

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
              const { data: chunk, meta } = await searchEverything(scopedQuery, searchCursor, onlyNews, searchQueryType, false);
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
        const validPicks = await agentFilterFeed(curated, rankingQuery, { preferCredibleSources: preferStrictSources, webContext, isComplexQuery });
        const pickedData = curated
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
        const minimumBroadResultFloor = isBroadDiscoveryQuery ? Math.min(curated.length, 10) : 1;
        const shouldFallbackToCurated = pickedData.length < minimumBroadResultFloor;
        const cleanData = !shouldFallbackToCurated && pickedData.length > 0
          ? pickedData
          : curated.slice(0, Math.min(curated.length, 12)).map((tweet, index) => ({
              ...tweet,
              ai_reasoning: tweet.ai_reasoning || 'คงโพสต์นี้ไว้เป็นผลลัพธ์สำรอง เพราะตรงคำค้นและผ่านการคัดกรองเบื้องต้นแล้ว',
              temporalTag: tweet.temporalTag || (isLatestMode ? 'Breaking' : 'Background'),
              citation_id: tweet.citation_id || `[F${index + 1}]`,
            }));
        
        const nextResults = isMore ? mergeUniquePostsById(searchResults, cleanData) : cleanData;
        setSearchResults(nextResults);
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
  const interestSeedLabels = [
    ...postLists.map((list) => normalizeSearchLabel(list?.name)),
    ...feedInterestLabels,
  ].filter(Boolean);
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

  const activeReadListMemberSet = useMemo(() => {
    if (!activeListId) return null;
    const activeList = postLists.find((list) => list.id === activeListId);
    if (!activeList) return null;
    return new Set(
      (Array.isArray(activeList.members) ? activeList.members : [])
        .map((member) => member?.toLowerCase())
        .filter(Boolean),
    );
  }, [activeListId, postLists]);

  const bookmarkIds = useMemo(
    () => new Set(bookmarks.map((item) => item?.id).filter(Boolean)),
    [bookmarks],
  );

  const normalizedReadSearchQuery = useMemo(
    () => normalizeSearchText(readSearchQuery),
    [readSearchQuery],
  );

  const { readSearchSuggestions, filteredReadArchive } = useMemo(() => {
    const suggestions = Array.from(
      new Set(
        readArchive
          .flatMap((item) => [
            item?.author?.name,
            item?.author?.username ? `@${item.author.username}` : '',
            item?.summary,
            item?.text,
          ])
          .filter(Boolean)
          .flatMap((value) =>
            String(value)
              .split(/[\n,]/)
              .map((part) => part.trim()),
          )
          .filter((value) => {
            const normalizedValue = normalizeSearchText(value);
            return (
              normalizedReadSearchQuery &&
              normalizedValue &&
              normalizedValue !== normalizedReadSearchQuery &&
              normalizedValue.includes(normalizedReadSearchQuery)
            );
          }),
      ),
    ).slice(0, 4);

    const filtered = readArchive
      .filter((item) => {
        if (!activeReadListMemberSet) return true;
        return item?.author?.username && activeReadListMemberSet.has(item.author.username.toLowerCase());
      })
      .map((item) => ({
        item,
        searchScore: normalizedReadSearchQuery
          ? scoreFuzzyTextMatch(
              normalizedReadSearchQuery,
              item?.author?.name,
              item?.author?.username,
              item?.summary,
              item?.text,
            )
          : 1,
      }))
      .filter(({ searchScore }) => searchScore > 0)
      .sort((left, right) => {
        if (normalizedReadSearchQuery && right.searchScore !== left.searchScore) {
          return right.searchScore - left.searchScore;
        }

        if (!readFilters.view && !readFilters.engagement) {
          return new Date(right.item.created_at || 0) - new Date(left.item.created_at || 0);
        }

        const scoreA =
          (readFilters.view ? toNumber(left.item.view_count) : 0) +
          (readFilters.engagement ? getEngagementTotal(left.item) : 0);
        const scoreB =
          (readFilters.view ? toNumber(right.item.view_count) : 0) +
          (readFilters.engagement ? getEngagementTotal(right.item) : 0);

        return scoreB - scoreA;
      })
      .map(({ item }) => item);

    return {
      readSearchSuggestions: suggestions,
      filteredReadArchive: filtered,
    };
  }, [activeReadListMemberSet, normalizedReadSearchQuery, readArchive, readFilters]);

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

  const aiFilterPresets = ['สรุปทั้งหมด', 'หาโพสต์เด่น', 'หาโพสต์ฮาๆ', 'หาโพสต์ที่คนพูดถึงมาก'];



  const handleAiFilter = async () => {
    if (!filterModal.prompt || filterModal.isFiltering) return;
    setFilterModal(prev => ({ ...prev, isFiltering: true }));
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
        setStatus('à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¹‚à¸žà¸ªà¸•à¹Œà¹ƒà¸™ Watchlist Feed à¹ƒà¸«à¹‰ AI à¸à¸£à¸­à¸‡');
        return;
      }

      const validPicks = await agentFilterFeed(sourceFeed, filterModal.prompt);
      const filteredResult = sourceFeed
        .filter(t => validPicks.some(pick => String(pick.id) === String(t.id)))
        .map(t => {
          const matchingPick = validPicks.find(pick => String(pick.id) === String(t.id));
          return { ...t, ai_reasoning: matchingPick?.reasoning };
        });
      
      setFeed(filteredResult);
      setIsFiltered(true);
      
      if (filteredResult.length > 0) {
        setStatus('กำลังวิเคราะห์บทสรุปสำหรับคุณ...');
        const summary = await generateExecutiveSummary(filteredResult.slice(0, 8), filterModal.prompt);
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

  return (
    <div className="foro-layout">
      <Sidebar 
        activeView={activeView}
        onNavClick={(view) => {
          setActiveView(view);
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
            <header className="dashboard-header dashboard-header-home" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                <div className="dashboard-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
                  <div className="mobile-only-flex home-mobile-logo" style={{ justifyContent: 'center', width: 'auto', minHeight: '32px' }}>
                    <img src="logo.png" alt="FO" className="home-mobile-logo-img" style={{ height: '24px', width: 'auto', display: 'block' }} loading="eager" />
                  </div>
                  <div className="dashboard-header-title-block" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: '500' }}>WATCHLIST FEED</div>
                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', lineHeight: '1.4', color: activeListId ? (postLists.find(l => l.id === activeListId)?.color || 'inherit') : 'inherit' }}>
                      {activeListId ? postLists.find(l => l.id === activeListId)?.name : 'หน้าหลัก'}
                    </h1>
                  </div>
                  <button className="mobile-only-flex icon-btn-large" onClick={() => setIsMobilePostListOpen(true)}><List size={20} /></button>
                </div>
                
                <div className={`dashboard-header-actions home-control-panel ${hasHomeSecondaryActions ? '' : 'home-control-panel-compact'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: hasHomeSecondaryActions ? 'space-between' : 'flex-end', width: '100%', gap: '12px' }}>
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
                      <div className="section-title">à¹‚à¸žà¸ªà¸•à¹Œà¸¥à¹ˆà¸²à¸ªà¸¸à¸”</div>
                      {isFiltered && (
                        <div className="ai-filtered-badge">
                          <Sparkles size={12} className="text-accent" />
                          <span>AI FILTERED</span>
                          <button onClick={clearAiFilter} className="ai-filtered-clear-btn" title="à¸¥à¹‰à¸²à¸‡à¸•à¸±à¸§à¸à¸£à¸­à¸‡">
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="feed-section-filters" style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleSort('view')} className={`btn-pill ${activeFilters.view ? 'active' : ''}`}>à¸¢à¸­à¸”à¸§à¸´à¸§</button>
                      <button onClick={() => handleSort('engagement')} className={`btn-pill ${activeFilters.engagement ? 'active' : ''}`}>à¹€à¸­à¸™à¹€à¸à¸ˆà¹€à¸¡à¸™à¸•à¹Œ</button>
                    </div>
                  </div>
                  <div className="dashboard-header-actions-group dashboard-header-actions-group-primary" style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setFilterModal({ show: true, prompt: '' })}
                      className={`btn-pill ${activeView === 'home' && feed.length > 0 ? 'home-ai-filter-ready' : ''}`}
                    >
                      AI Filter
                    </button>
                    <button onClick={handleSync} disabled={loading} className="btn-pill primary">
                      {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} ฟีดข้อมูล
                    </button>
                  </div>
                </div>
              </header>

              {showHomeFeedToolbar && <div className="feed-section-header home-desktop-feed-header home-feed-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="feed-section-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="section-title">โพสต์ล่าสุด</div>
                  {isFiltered && (
                    <div className="ai-filtered-badge">
                      <Sparkles size={12} className="text-accent" />
                      <span>AI FILTERED</span>
                      <button onClick={clearAiFilter} className="ai-filtered-clear-btn" title="ล้างตัวกรอง">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="feed-section-filters" style={{ display: 'flex', gap: '8px' }}>
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
                        <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--accent-secondary)' }}>AI FILTER SUMMARY</div>
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
                    onArticleGen={(it) => { setCreateContentSource(it); setActiveView('content'); setTimeout(() => setContentTab('create'), 0); }}
                  />
                ))}
              </div>
              {nextCursor && !loading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <button onClick={handleLoadMore} className="btn-pill">โหลดเพิ่มเติม</button>
                </div>
              )}
            </div>

          {/* ===== UNIFIED CONTENT VIEW ===== */}
          <div className="unified-content-view animate-fade-in" style={{ display: activeView === 'content' ? 'block' : 'none' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
              <button className={`btn-pill ${contentTab === 'search' ? 'primary' : ''}`} onClick={() => setContentTab('search')}>
                <Search size={16} /> ค้นหา
              </button>
              <button className={`btn-pill ${contentTab === 'create' ? 'primary' : ''}`} onClick={() => setContentTab('create')}>
                <Sparkles size={16} /> สร้างคอนเทนต์
              </button>
            </div>

            <div style={{ display: contentTab === 'create' ? 'block' : 'none' }}>
              <div className="animate-fade-in">
                <ContentErrorBoundary key={createContentSource?.id}>
                  <CreateContent 
                    sourceNode={createContentSource} 
                    onRemoveSource={() => setCreateContentSource(null)}
                    onSaveArticle={(title, content) => {
                      const newArt = { id: Date.now().toString(), type: 'article', title: title || 'บทความ AI', summary: content, created_at: new Date().toISOString() };
                      setBookmarks(prev => [newArt, ...prev]);
                    }}
                    isGenerating={isGeneratingContent}
                    setIsGenerating={setIsGeneratingContent}
                    phase={genPhase}
                    setPhase={setGenPhase}
                  />
                </ContentErrorBoundary>
              </div>
            </div>

            <div style={{ display: contentTab === 'search' ? 'block' : 'none' }}>
              <div className="search-discovery-view animate-fade-in">
                <div className="hero-search-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h1 className="hero-search-title">ค้นหาคอนเทนต์</h1>
                      <p className="hero-search-subtitle">สำรวจเทรนด์และเจาะลึกข้อมูลจากทั่วโลก</p>
                    </div>
                  </div>
                  <div className="hero-search-wrapper">
                    <div className="hero-search-form" style={{ width: '100%' }}>
                      <Search size={20} className="hero-search-icon" />
                      <input
                        type="text"
                        className="hero-search-input"
                        placeholder="พิมพ์คีย์เวิร์ดที่สนใจ..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); setActiveSuggestionIndex(-1); }}
                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') setActiveSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                          else if (e.key === 'ArrowUp') setActiveSuggestionIndex(prev => Math.max(prev - 1, -1));
                          else if (e.key === 'Enter') {
                            if (activeSuggestionIndex >= 0) {
                              const sel = suggestions[activeSuggestionIndex];
                              setSearchQuery(sel); handleSearch(null, false, sel); setShowSuggestions(false);
                            } else if (!e.nativeEvent.isComposing) {
                              handleSearch(e); setShowSuggestions(false);
                            }
                          }
                        }}
                      />
                      <div className="hero-search-actions">
                        <button 
                          type="button" 
                          onClick={() => setIsLatestMode(!isLatestMode)} 
                          className={`zap-toggle-btn ${isLatestMode ? 'active' : ''}`}
                          title="คอนเทนต์ใหม่"
                        >
                          <Zap size={18} fill={isLatestMode ? "currentColor" : "none"} />
                        </button>
                        {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSuggestions([]); }} className="hero-clear-btn"><X size={16} /></button>}
                        <button 
                          type="button" 
                          className="hero-submit-btn" 
                          onClick={(e) => { handleSearch(e); setShowSuggestions(false); }} 
                          disabled={isSearching}
                        >
                          {isSearching ? <Loader2 size={18} className="animate-spin" /> : <span className="btn-text">ค้นหา</span>}
                        </button>
                      </div>
                    </div>
                    {searchResults.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                        <button 
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            setSearchSummary('');
                            setSearchWebSources([]);
                            setSearchCursor(null);
                            setStatus('');
                          }}
                          className="btn-mini-ghost"
                          style={{ color: 'var(--text-dim)', background: 'transparent' }}
                        >
                          <RefreshCcw size={14} /> ล้างผลลัพธ์
                        </button>
                      </div>
                    )}
                    {(canSaveCurrentSearchAsPreset || searchPresets.length > 0) && (
                      <div className="search-preset-toolbar">
                        <div className="search-preset-toolbar-copy">
                          {searchPresets.length > 0 ? `Preset ของคุณ ${searchPresets.length}/${MAX_SEARCH_PRESETS}` : 'บันทึกคำค้นไว้ใช้ซ้ำได้สูงสุด 4 ปุ่ม'}
                        </div>
                        {canSaveCurrentSearchAsPreset && (
                          <button
                            type="button"
                            className="search-preset-save-btn"
                            onClick={() => addSearchPreset(searchQuery)}
                          >
                            <Plus size={14} /> บันทึกเป็น Preset
                          </button>
                        )}
                      </div>
                    )}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="search-suggestions-dropdown">
                        {suggestions.map((item, idx) => (
                          <div key={item} className={`suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`} onClick={() => { setSearchQuery(item); handleSearch(null, false, item); setShowSuggestions(false); }}>
                            <Search size={14} className="suggestion-icon" /><span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {isLiveSearching && !isSearching && <div className="searching-indicator" style={{ marginTop: '16px' }}><RefreshCw size={12} className="animate-spin" /> กำลังเตรียมข้อมูล...</div>}
                    
                    {isSearching && (
                      <div className="search-loading-state animate-fade-in" style={{ padding: '40px 0', width: '100%' }}>
                        <div className="neural-nexus">
                          <div className="nexus-ring"></div>
                          <div className="nexus-ring-inner"></div>
                          <div className="nexus-core">
                            <Sparkles size={32} />
                          </div>
                        </div>
                        <div className="nexus-text">Intelligence Engine Active</div>
                        <div className="search-narrative">
                          <div className="narrative-item" key={status} style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
                            {status.replace(/\[.*?\]/g, '⚡')}
                          </div>
                        </div>
                      </div>
                    )}

                    {searchQuery && searchResults.length === 0 && !isSearching && (
                      <div className="search-idea-tags animate-fade-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ marginBottom: '16px', opacity: 0.5 }}>
                          <Search size={48} style={{ margin: '0 auto' }} />
                        </div>
                        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-dim)', lineHeight: '1.4' }}>ไม่พบข้อมูลสำหรับ "{searchQuery}"</h3>
                        <p style={{ color: 'var(--text-muted)' }}>ลองปรับคำค้นหา หรือใช้คำที่กว้างขึ้น เช่น ภาษาอังกฤษ</p>
                      </div>
                    )}

                    {!searchQuery && searchResults.length === 0 && !isSearching && (
                      <div className="search-idea-tags search-preset-hub animate-fade-in">
                        <div className="search-preset-hub-header">
                          <p>{searchPresets.length > 0 ? 'Preset ของคุณ' : searchHistory.length > 0 ? 'ต่อจากสิ่งที่คุณสนใจ' : interestSeedLabels.length > 0 ? 'ตามสิ่งที่คุณกำลังติดตาม' : 'เริ่มจากหัวข้อยอดนิยม'}</p>
                          <span>{searchPresets.length > 0 ? 'กดเพื่อค้นหาทันที หรือลบปุ่มที่ไม่ใช้แล้ว' : searchHistory.length > 0 ? 'ระบบจะดันคำค้นที่คุณใช้จริงขึ้นมาก่อน แล้วค่อยเติมหัวข้อที่เกี่ยวข้องให้' : interestSeedLabels.length > 0 ? 'ระบบหยิบจากลิสต์และบัญชีที่คุณติดตามมาเป็นจุดเริ่มต้นให้' : 'เมื่อคุณเริ่มค้นหา ระบบจะเรียนรู้และเปลี่ยนปุ่มชุดนี้ให้เหมาะกับคุณมากขึ้น'}</span>
                        </div>
                        <div className="tags-row">
                          {dynamicSearchTags.map((tag) => (
                            <div key={`${tag.source}-${tag.label}`} className={`idea-tag search-preset-pill ${tag.source === 'preset' ? 'is-preset' : ''}`}>
                              <button
                                type="button"
                                className="search-preset-pill-button"
                                onClick={() => { setSearchQuery(tag.label); handleSearch(null, false, tag.label); }}
                              >
                                {tag.label}
                              </button>
                              {tag.source === 'preset' && (
                                <button
                                  type="button"
                                  className="search-preset-remove-btn"
                                  aria-label={`ลบ preset ${tag.label}`}
                                  onClick={() => removeSearchPreset(tag.label)}
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {searchResults.length > 0 && (
                  <div className="search-results-container">
                    {searchSummary && (
                      <div className="search-summary-card animate-fade-in" style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '24px',
                        border: '1px solid var(--glass-border)',
                        padding: '24px',
                        marginBottom: '32px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                      }}>
                        {/* Shimmer effect behind icon */}
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
                              <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--accent-secondary)' }}>AI EXECUTIVE SUMMARY</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>ANALYZING {Math.min(searchResults.length, 10)} KEY SIGNALS</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(searchSummary);
                              setStatus('คัดลอกบทสรุปแล้ว');
                            }}
                            className="icon-btn-large" 
                            style={{ width: '32px', height: '32px' }}
                            title="คัดลอกบทสรุป"
                          >
                            <Copy size={14} />
                          </button>
                        </div>

                        {(() => {
                          const confMatch = searchSummary.match(/\[CONFIDENCE_SCORE:\s*([^\]]+)\]/i);
                          const confidenceScore = confMatch ? confMatch[1] : null;
                          const cleanSummary = searchSummary.replace(/\[CONFIDENCE_SCORE:\s*([^\]]+)\]/gi, '').trim();
                          
                          return (
                            <>
                              <div 
                                className="markdown-body search-summary-content" 
                                style={{ fontSize: '15px', lineHeight: '1.8', color: 'rgba(255,255,255,0.9)', position: 'relative', zIndex: 1 }}
                                dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(cleanSummary) }} 
                              />
                              
                              <div style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)',
                                flexWrap: 'wrap', gap: '12px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', flexWrap: 'wrap' }}>
                                  <ShieldCheck size={12} className="text-accent" />
                                  สรุปโดย AI อ้างอิงจากข้อมูลล่าสุดใน 24-48 ชั่วโมงที่ผ่านมา
                                  {confidenceScore && (
                                    <span style={{ 
                                      marginLeft: '4px', padding: '2px 8px', borderRadius: '100px', 
                                      background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', 
                                      border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px',
                                      letterSpacing: '0.02em'
                                    }}>
                                      <Activity size={10} /> อัตราความแม่นยำ (Confidence) {confidenceScore}
                                    </span>
                                  )}
                                </div>
                          
                                {searchWebSources.length > 0 && (
                                  <button 
                                    onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
                                    style={{ 
                                      background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', 
                                      color: 'var(--text-dim)', fontSize: '11px', padding: '4px 10px', 
                                      borderRadius: '100px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' 
                                    }}
                                    className="action-hover-btn"
                                  >
                                    <Link size={12} /> {isSourcesExpanded ? 'ซ่อนแหล่งอ้างอิง' : `อ้างอิงจาก ${searchWebSources.length} เว็บไซต์`}
                                  </button>
                                )}
                              </div>
                            </>
                          );
                        })()}

                        {/* Collapsible Source List */}
                        {isSourcesExpanded && searchWebSources.length > 0 && (
                          <div className="animate-fade-in" style={{ 
                            marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.3)', 
                            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' 
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-dim)', marginBottom: '12px', letterSpacing: '0.05em' }}>WEB SOURCES</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {searchWebSources.map((src, i) => (
                                <a key={i} href={src.url} target="_blank" rel="noreferrer" style={{ 
                                  display: 'flex', flexDirection: 'column', gap: '4px', textDecoration: 'none',
                                  padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                                  transition: 'background 0.2s'
                                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                                  <div style={{ fontSize: '13px', color: '#fff', fontWeight: '600', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {src.title}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <ExternalLink size={10} /> เปิดอ่านต้นฉบับเว็บไซต์
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="feed-grid">
                      {searchResults.map((item, idx) => <FeedCard key={item.id || idx} tweet={item} onArticleGen={(it) => { setCreateContentSource(it); setActiveView('content'); setTimeout(() => setContentTab('create'), 0); }} />)}
                    </div>
                    {searchCursor && !isSearching && (
                      <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '40px' }}>
                        <button onClick={(e) => handleSearch(e, true)} className="btn-pill">โหลดเพิ่มเติม</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== READ VIEW ===== */}
          {activeView === 'read' && (
          <div className="reader-library-view animate-fade-in">
            <header className="reader-header">
                <h1 className="reader-title">อ่านข่าว</h1>
                <p className="reader-subtitle">บทความและข่าวสารที่คุณบันทึกไว้อ่านแบบ Deep Read</p>
                {activeListId && <div className="active-list-pills">กำลังกรองตาม: {postLists.find(l => l.id === activeListId)?.name}</div>}
              </header>

              {readArchive.length > 0 && (
                <div className="reader-toolbar">
                  <div className="reader-search-shell">
                    <div className="reader-search-input-wrap">
                      <Search size={18} className="reader-search-icon" />
                      <input
                        type="text"
                        className="reader-search-input"
                        placeholder="ค้นหาจากชื่อบัญชี เนื้อหา หรือคำใกล้เคียง..."
                        value={readSearchQuery}
                        onChange={(e) => setReadSearchQuery(e.target.value)}
                      />
                      {readSearchQuery && (
                        <button
                          type="button"
                          className="reader-search-clear"
                          onClick={() => setReadSearchQuery('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {readSearchSuggestions.length > 0 && (
                      <div className="reader-search-suggestions">
                        {readSearchSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="reader-search-suggestion-pill"
                            onClick={() => setReadSearchQuery(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="reader-toolbar-actions">
                    <span className="reader-toolbar-count">{filteredReadArchive.length} รายการ</span>
                    <button onClick={() => setReadFilters(p => ({ ...p, view: !p.view }))} className={`btn-pill ${readFilters.view ? 'active' : ''}`}>ยอดวิว</button>
                    <button onClick={() => setReadFilters(p => ({ ...p, engagement: !p.engagement }))} className={`btn-pill ${readFilters.engagement ? 'active' : ''}`}>เอนเกจเมนต์</button>
                  </div>
                </div>
              )}
              
              <div className="feed-grid">
                {filteredReadArchive
                  .map((item, idx) => (
                    <FeedCard key={item.id || idx} tweet={item} isBookmarked={bookmarkIds.has(item.id)} onBookmark={handleBookmark} onArticleGen={(it) => { setCreateContentSource(it); setActiveView('content'); setTimeout(() => setContentTab('create'), 0); }} />
                  ))
                }
                {readArchive.length === 0 && <div className="empty-state-card">ยังไม่มีบทความในห้องสมุด</div>}
                {readArchive.length > 0 && filteredReadArchive.length === 0 && (
                  <div className="reader-empty-search-state">
                    <div className="reader-empty-search-icon"><Search size={20} /></div>
                    <div className="reader-empty-search-title">ไม่พบข่าวที่ใกล้เคียงกับ "{readSearchQuery}"</div>
                    <div className="reader-empty-search-copy">ลองใช้คำที่กว้างขึ้น ชื่อบัญชี หรือคำสำคัญที่สะกดใกล้เคียงกัน ระบบจะจับคู่แบบ dynamic ให้เอง</div>
                    <button type="button" className="btn-pill" onClick={() => setReadSearchQuery('')}>ล้างคำค้น</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== AUDIENCE VIEW: SMART TARGET DISCOVERY ===== */}
          <div style={{ display: activeView === 'audience' ? 'block' : 'none' }}>
            {(() => {
              const CATEGORIES = [
                { icon: '⚙️', label: 'เทคโนโลยี' }, { icon: '🤖', label: 'AI' },
              { icon: '💼', label: 'ธุรกิจ' }, { icon: '📈', label: 'การตลาด' },
              { icon: '💹', label: 'การเงิน' }, { icon: '📊', label: 'การลงทุน' },
              { icon: '₿', label: 'คริปโต' }, { icon: '🏥', label: 'สุขภาพ' },
              { icon: '🌿', label: 'ไลฟ์สไตล์' }, { icon: '🌐', label: 'เศรษฐกิจ' },
              { icon: '🏛️', label: 'การเมือง' }, { icon: '🧠', label: 'การพัฒนาตัวเอง' },
            ];

              CATEGORIES.splice(0, CATEGORIES.length,
                { icon: Cpu, label: 'เทคโนโลยี', tone: 'blue' },
                { icon: Bot, label: 'AI', tone: 'violet' },
                { icon: BriefcaseBusiness, label: 'ธุรกิจ', tone: 'amber' },
                { icon: TrendingUp, label: 'การตลาด', tone: 'rose' },
                { icon: BadgeDollarSign, label: 'การเงิน', tone: 'emerald' },
                { icon: ChartColumn, label: 'การลงทุน', tone: 'cyan' },
                { icon: Bitcoin, label: 'คริปโต', tone: 'orange' },
                { icon: HeartPulse, label: 'สุขภาพ', tone: 'red' },
                { icon: Leaf, label: 'ไลฟ์สไตล์', tone: 'green' },
                { icon: Globe2, label: 'เศรษฐกิจ', tone: 'sky' },
                { icon: Landmark, label: 'การเมือง', tone: 'slate' },
                { icon: BrainCircuit, label: 'การพัฒนาตัวเอง', tone: 'pink' },
              );

            return (
              <div key={audienceKey} className="animate-fade-in">
                <header className="dashboard-header audience-hero-header" style={{ marginBottom: '28px', paddingTop: '0' }}>
                  <div className="audience-hero-copy">
                    <div className="audience-hero-text">
                      <h1 className="audience-hero-title">
                        <span className="audience-hero-title-mark">
                          <Activity size={17} strokeWidth={2.2} />
                        </span>
                        <span>Smart Target Discovery</span>
                      </h1>
                    </div>
                  </div>
                  <p className="audience-hero-subtitle">ค้นหาและเพิ่มแหล่งข้อมูลที่ตรงกับความสนใจของคุณ</p>
                </header>

                <div className="audience-tabs">
                  <button onClick={() => setAudienceTab('ai')} className={`audience-tab-btn ${audienceTab === 'ai' ? 'active-ai' : ''}`}>
                    <Sparkles size={14} strokeWidth={2.1} />
                    แนะนำโดย AI
                  </button>
                  <button onClick={() => setAudienceTab('manual')} className={`audience-tab-btn ${audienceTab === 'manual' ? 'active-manual' : ''}`}>
                    <Search size={14} strokeWidth={2.1} />
                    ค้นหาชื่อ
                  </button>
                </div>

                {audienceTab === 'ai' && (
                  <div className="animate-fade-in">
                    <div className="audience-ai-searchbar audience-command-row" style={{ display: 'flex', gap: '12px', marginBottom: '32px', maxWidth: '680px' }}>
                      <div className="audience-ai-search-input">
                        <input type="text" placeholder="ฉันอยากติดตามเรื่องเทคโนโลยี AI..." value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiSearchAudience()} style={{ background: 'transparent', border: 'none', color: '#fff', flex: 1, fontSize: '14px', outline: 'none' }} />
                      </div>
                      <button onClick={() => handleAiSearchAudience()} disabled={aiSearchLoading} className="btn-sync-premium" style={{ height: '48px', padding: '0 24px' }}>
                        {aiSearchLoading ? <RefreshCw size={15} className="animate-spin" /> : 'SEARCH →'}
                      </button>
                    </div>

                    {aiSearchLoading && aiSearchResults.length === 0 && (
                      <div style={{ padding: '60px 0', textAlign: 'center' }}>
                        <div className="ai-loader-ring" style={{ margin: '0 auto 20px' }}></div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent-secondary)' }} className="animate-pulse">AI ANALYST IS SCANNING...</div>
                      </div>
                    )}

                    {!aiSearchLoading && aiSearchResults.length > 0 && (
                      <div style={{ marginBottom: '32px' }}>
                        <div className="expert-grid" style={{ marginBottom: '24px' }}>
                          {aiSearchResults.map((expert, i) => {
                            const isAdded = watchlist.find(w => w.username.toLowerCase() === expert.username.toLowerCase());
                            return (
                              <div key={expert.username} className="expert-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                  <div className="ai-pick-pill"><Sparkles size={10} /> AI PICK</div>
                                  <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => {
                                        const btn = e.currentTarget;
                                        const menu = btn.nextElementSibling;
                                        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                                      }}
                                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                                    >
                                      <Plus size={12} />
                                    </button>
                                    <div className="discovery-menu" style={{ display: 'none', position: 'absolute', right: 0, top: '100%', marginTop: '8px', zIndex: 100, width: '180px' }}>
                                      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-border)', fontSize: '10px', fontWeight: '800', color: 'var(--accent-secondary)' }}>ADD TO LIST</div>
                                      {postLists.map(list => {
                                        const isMember = list.members.some(m => m.toLowerCase() === expert.username.toLowerCase());
                                        return (
                                          <button
                                            key={list.id}
                                            onClick={(e) => { handleToggleMemberInList(list.id, expert.username); e.currentTarget.closest('.discovery-menu').style.display = 'none'; }}
                                            className={`discovery-menu-item ${isMember ? 'active' : ''}`}
                                          >
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>{list.name}</span>
                                            {isMember && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-secondary)' }} />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                                <img 
                                  src={`https://unavatar.io/twitter/${expert.username}`} 
                                  style={{ width: '42px', height: '42px', borderRadius: '50%', marginBottom: '10px', border: '2px solid var(--bg-700)', objectFit: 'cover' }} 
                                  onError={e => {
                                    if (e.target.src.includes('unavatar.io')) {
                                      // Try GitHub as a secondary fallback (common for tech types)
                                      e.target.src = `https://unavatar.io/github/${expert.username}`;
                                    } else if (e.target.src.includes('github')) {
                                       // Final try: Google favicon (not an user photo but consistent)
                                       e.target.src = `https://www.google.com/s2/favicons?domain=x.com&sz=128`;
                                    } else {
                                      // Absolute final: Initials
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=random&color=fff&bold=true`;
                                      e.target.onerror = null;
                                    }
                                  }}
                                />
                                <a 
                                  href={`https://x.com/${expert.username}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '8px', width: 'fit-content' }}
                                >
                                  <div className="expert-name" style={{ fontSize: '14px', color: '#fff', fontWeight: '800' }}>{expert.name}</div>
                                  <div className="expert-username" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>@{expert.username}</div>
                                </a>
                                <div className="expert-reasoning" style={{ fontSize: '13px', marginBottom: '16px', flex: 1, color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>“{expert.reasoning}”</div>
                                <button onClick={() => handleAddExpert(expert)} disabled={isAdded} className={`expert-follow-btn ${isAdded ? 'added' : ''}`} style={{ padding: '6px', fontSize: '11px' }}>{isAdded ? '✓ เพิ่มแล้ว' : '+ เพิ่มเข้า Watchlist'}</button>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => handleAiSearchAudience(null, true)} 
                            disabled={aiSearchLoading}
                            className="btn-pill"
                          >
                            {aiSearchLoading ? <RefreshCw size={14} className="animate-spin" /> : 'ค้นหาเพิ่มเติม'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="audience-category-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '28px' }}>
                      <div className="audience-category-heading">Discover By Category</div>
                      <div className="audience-category-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                        {CATEGORIES.map(cat => {
                          const Icon = cat.icon;
                          return (
                            <button key={cat.label} onClick={() => { setAiQuery(cat.label); handleAiSearchAudience(cat.label); }} className={`category-btn category-btn-${cat.tone}`}>
                              <span className="category-btn-icon-wrap">
                                <Icon size={18} strokeWidth={2.1} />
                              </span>
                              <span className="category-btn-label">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {audienceTab === 'manual' && (
                  <div className="animate-fade-in">
                    <div style={{ maxWidth: '640px', marginBottom: '40px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ค้นหาด้วย X Username โดยตรง</div>
                      <form onSubmit={handleManualSearch} className="manual-search-form audience-command-row" style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                        <div className="custom-input-wrapper">
                          <Search size={16} />
                          <input 
                            placeholder="กรอก X Username (เช่น elonmusk)..." 
                            value={manualQuery} 
                            onChange={e => { setManualQuery(e.target.value); setShowSuggestions(true); setActiveSuggestionIndex(-1); }} 
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') setActiveSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                              else if (e.key === 'ArrowUp') setActiveSuggestionIndex(prev => Math.max(prev - 1, -1));
                              else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                                const sel = suggestions[activeSuggestionIndex];
                                setManualQuery(sel); setShowSuggestions(false);
                              }
                            }}
                          />
                        </div>
                        <button type="submit" className="btn-sync-premium" style={{ height: '44px', padding: '0 28px' }}>ค้นหา</button>
                        
                        {showSuggestions && suggestions.length > 0 && activeView === 'audience' && (
                          <div className="search-suggestions-dropdown" style={{ top: '100%', left: 0, right: 0, marginTop: '8px', zIndex: 1000 }}>
                            {suggestions.map((item, idx) => (
                              <div key={item} className={`suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`} onClick={() => { setManualQuery(item); setShowSuggestions(false); }}>
                                <Search size={14} className="suggestion-icon" /><span>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </form>
                      {manualPreview && (
                        <div className="preview-card" style={{ padding: '20px', borderRadius: '16px', marginTop: '24px' }}>
                          <img 
                            src={manualPreview.profile_image_url} 
                            style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-700)' }} 
                            onError={e => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(manualPreview.name)}&background=random&color=fff`;
                              e.target.onerror = null;
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '800', fontSize: '16px' }}>{manualPreview.name}</div>
                            <div style={{ color: 'var(--accent-secondary)', fontWeight: '700' }}>@{manualPreview.username}</div>
                          </div>
                          <button onClick={() => handleAddUser(manualPreview)} className="btn-pill primary" style={{ height: '40px', padding: '0 24px' }}>+ เพิ่มเข้า Watchlist</button>
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '32px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '16px' }}>▌ บัญชีที่ติดตามอยู่ ({watchlist.length})</div>
                      <div className="watchlist-grid">
                        {watchlist.map(user => (
                          <UserCard 
                            key={user.id} 
                            user={user} 
                            postLists={postLists}
                            onToggleList={handleToggleMemberInList}
                            onRemove={handleRemoveAccountGlobal} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
            })()}
          </div>

          {/* ===== BOOKMARKS VIEW ===== */}
          <div className="animate-fade-in" style={{ display: activeView === 'bookmarks' ? 'block' : 'none' }}>
            <header className="dashboard-header">
                <h1 style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.4' }}>Bookmarks</h1>
                <p style={{ color: 'var(--text-muted)' }}>คลังข้อมูลที่คุณบันทึกไว้แยกตามประเภท</p>
              </header>

              <div className="bookmark-tabs">
                <button onClick={() => setBookmarkTab('news')} className={`bookmark-tab-btn ${bookmarkTab === 'news' ? 'active' : ''}`}>📰 ข่าว</button>
                <button onClick={() => setBookmarkTab('article')} className={`bookmark-tab-btn ${bookmarkTab === 'article' ? 'active' : ''}`}>📝 บทความ</button>
              </div>
              
              <div className="feed-grid">
                {bookmarks.filter(b => bookmarkTab === 'news' ? b.type !== 'article' : b.type === 'article').map((item, idx) => (
                   bookmarkTab === 'news' ? (
                     <FeedCard key={item.id || idx} tweet={item} isBookmarked={true} onBookmark={handleBookmark} onArticleGen={(it) => { setCreateContentSource(it); setActiveView('content'); setTimeout(() => setContentTab('create'), 0); }} />
                   ) : (
                     <div key={item.id} className="article-card" onClick={() => setSelectedArticle(item)}>
                       <div className="article-card-header">
                         {item.title && item.title.startsWith('http') ? (
                           <a 
                             href={item.title} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             onClick={(e) => e.stopPropagation()}
                             style={{ color: 'var(--accent-secondary)', textDecoration: 'none', display: 'block', maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                           >
                             {item.title}
                           </a>
                         ) : (
                           <h3 title={item.title}>{item.title}</h3>
                         )}
                         <button 
                           onClick={(e) => { 
                              e.stopPropagation(); 
                              if (window.confirm('คุณต้องการลบบทความนี้ใช่หรือไม่?')) {
                                setBookmarks(prev => prev.filter(p => p.id !== item.id)); 
                              }
                            }} 
                           className="btn-mini-ghost text-red"
                           style={{ padding: '4px 8px' }}
                         >
                           <Trash2 size={12} />
                         </button>
                       </div>
                       <div className="article-preview">
                         {(item.summary || '').replace(/[#*`]/g, '').slice(0, 300)}
                       </div>
                       <div className="article-card-footer">
                         <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH') : ''}</span>
                         <span>อ่านเพิ่มเติม →</span>
                       </div>
                     </div>
                   )
                ))}
              </div>
            </div>
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
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">AI Smart Filter</div>
            <div className="modal-subtitle">กรองเนื้อหาที่ต้องการโดยระบุเป็นภาษามนุษย์ (เช่น "หาเฉพาะเรื่องระดมทุนของส้มหยุด" หรือ "ข่าวที่เกี่ยวกับ Apple")</div>
            <div className="ai-filter-presets">
              {aiFilterPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`ai-filter-preset-btn ${filterModal.prompt === preset ? 'active' : ''}`}
                  disabled={filterModal.isFiltering}
                  onClick={() => setFilterModal((prev) => ({ ...prev, prompt: preset }))}
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea 
              className="modal-input"
              style={{ minHeight: '120px', resize: 'none', padding: '16px' }}
              autoFocus
              disabled={filterModal.isFiltering}
              placeholder="ระบุสิ่งที่ต้องการกรองที่นี่..."
              value={filterModal.prompt}
              onChange={e => setFilterModal({ ...filterModal, prompt: e.target.value })}
            />
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
                onClick={handleAiFilter}
                disabled={filterModal.isFiltering || !filterModal.prompt.trim()}
                style={{ position: 'relative', overflow: 'hidden' }}
              >
                {filterModal.isFiltering ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>กำลังประมวลผล...</span>
                  </>
                ) : (
                  'กรองข้อมูล'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {selectedArticle && (
        <div className="modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedArticle(null)}><X size={20} /></button>
            <div className="modal-title" style={{ fontSize: '24px', marginBottom: '20px' }}>
              {selectedArticle.title && selectedArticle.title.startsWith('http') ? (
                <a href={selectedArticle.title} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)' }}>
                  {selectedArticle.title}
                </a>
              ) : selectedArticle.title}
            </div>
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(selectedArticle.summary) }} />
            <div className="modal-actions" style={{ marginTop: '32px', justifyContent: 'flex-end' }}>
              <button className="modal-btn modal-btn-secondary" onClick={() => setSelectedArticle(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="status-toast" style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: '#fff', color: '#000', padding: '12px 24px', borderRadius: '100px', fontSize: '12px', fontWeight: '900', letterSpacing: '0.05em', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 9999 }}>
          {status.toUpperCase()}
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
