import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  RefreshCw,
  Trash2,
  Undo2,
  Eye,
  Heart,
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
  Activity,
  BookOpen,
  ExternalLink,
  Link,
  Users
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import FeedCard from './components/FeedCard';
import CreateContent from './components/CreateContent';
import {
  getUserInfo,
  fetchWatchlistFeed,
  RECENT_WINDOW_HOURS,
  searchEverything,
  curateSearchResults
} from './services/TwitterService';
import { agentFilterFeed, buildSearchPlan, discoverTopExperts, generateExecutiveSummary, generateGrokBatch, tavilySearch } from './services/GrokService';
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
  const [searchWebSources, setSearchWebSources] = usePersistentState(STORAGE_KEYS.searchWebSources, [], {
    deserialize: deserializeStoredCollection,
  });
  const [isSearching, setIsSearching] = usePersistentState(STORAGE_KEYS.isSearching, false);
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
  const [readArchive, setReadArchive] = usePersistentState(STORAGE_KEYS.readArchive, [], {
    deserialize: deserializeStoredCollection,
  });

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

  const [audienceTab, setAudienceTab] = usePersistentState(STORAGE_KEYS.audienceTab, 'manual'); 
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearchLoading, setAiSearchLoading] = usePersistentState(STORAGE_KEYS.aiSearchLoading, false);
  const [aiSearchResults, setAiSearchResults] = usePersistentState(STORAGE_KEYS.aiSearchResults, [], {
    deserialize: deserializeStoredCollection,
  });
  const [manualQuery, setManualQuery] = useState('');
  const [manualPreview, setManualPreview] = useState(null);

  const [isFiltered, setIsFiltered] = useState(false);
  const [aiFilterSummary, setAiFilterSummary] = useState('');

  // Global Background Tasks Persistence
  const [isGeneratingContent, setIsGeneratingContent] = usePersistentState(STORAGE_KEYS.isGeneratingContent, false);
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
      setStatus('เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
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
      setStatus('เกิดข้อผิดพลาดในการโหลดข้อมูลเพิ่มเติม');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e, isMore = false, overrideQuery = '') => {
    if (e) e.preventDefault();
    const requestedQuery = overrideQuery || searchQuery;
    if (!requestedQuery && !isMore) return;
    setIsSearching(true);
    if (!isMore) setSearchSummary('');
    setStatus(`AI กำลังค้นหาข้อมูลสำหรับ "${requestedQuery}"...`);

    try {
      let searchPlan = activeSearchPlan;
      if (!isMore) {
        searchPlan = await buildSearchPlan(requestedQuery, isLatestMode);
        setActiveSearchPlan(searchPlan);
      }
      
      const planQueries = !isMore && searchPlan?.queries?.length > 0 ? searchPlan.queries : [requestedQuery];
      const rankingQuery = mergePlanLabelsIntoQuery(requestedQuery, searchPlan?.topicLabels || []);

      const rawDataChunks = [];
      let finalCursor = null;

      setStatus(`[API] กำลังระดมพลและแสกนหาข้อมูลจากมุมมองที่หลากหลาย (${planQueries.length} แหล่ง...)...`);
      
      // Parallel Web Context Fetch
      let webContext = '';
      let webQuery = requestedQuery;
      if (searchPlan && searchPlan.topicLabels && searchPlan.topicLabels.length > 0) {
        webQuery = searchPlan.topicLabels.slice(0, 3).join(' ').replace(/['"]/g, '');
      } else if (searchPlan && searchPlan.primaryQuery) {
        webQuery = searchPlan.primaryQuery.replace(/min_faves:\d+/ig, '').replace(/min_retweets:\d+/ig, '').replace(/-filter:\w+/ig, '').trim();
      }
      const webPromise = (!isMore ? tavilySearch(webQuery, isLatestMode) : Promise.resolve({ results: [], answer: '' }));
      
      for (const query of planQueries) {
        let scopedQuery = query;
        if (isLatestMode && !query.includes('since:')) {
          const date = new Date();
          date.setHours(date.getHours() - 24);
          const sinceDate = date.toISOString().split('T')[0];
          scopedQuery = `${query} since:${sinceDate}`;
        }
        
        try {
          const { data: chunk, meta } = await searchEverything(scopedQuery, isMore ? searchCursor : null, onlyNews, 'Top', !isMore);
          if (chunk.length > 0) rawDataChunks.push(chunk);
          if (!finalCursor) finalCursor = meta.next_cursor;
        } catch (err) {
          console.warn(`[Search] Failed to fetch query: ${scopedQuery}`, err);
        }
      }

      // Finalize Web Context
      const webData = await webPromise;
      if (webData && (webData.results?.length || webData.answer)) {
        webContext = [
          webData.answer ? `[WEB NEWS ANSWER]\n${webData.answer}` : '',
          (webData.results || []).map((r, i) => `${i+1}. ${r.title}: ${r.content?.slice(0, 200)}... (${r.url})`).join('\n')
        ].filter(Boolean).join('\n\n');
        
        if (!isMore) {
          setSearchWebSources(webData.results || []);
        }
      } else if (!isMore) {
        setSearchWebSources([]);
      }


      const data = mergeUniquePostsById(...rawDataChunks);
      const meta = { next_cursor: finalCursor };
      
      if (data.length > 0) {
        setStatus(`[Quality Gate] คัดกรองและประเมิน Engagement...`);
        const isFunTopic = /ฮา|ตลก|ขำ|funny|meme|lol|haha/i.test(requestedQuery);
        const curated = curateSearchResults(data, rankingQuery, { latestMode: isLatestMode, preferCredibleSources: !isFunTopic });
        
        setStatus(`[Agent 2/3] กำลังกรองสแปมและคัดเลือกโพสต์ระดับคุณภาพจากฐานข้อมูล 40 ชุด...`);
        const validIds = await agentFilterFeed(curated, rankingQuery, { preferCredibleSources: !isFunTopic, webContext });
        const cleanData = curated.filter(t => validIds.some(vid => String(vid) === String(t.id)));
        
        if (!isMore) {
          setStatus(`[Agent 3/3] กำลังสังเคราะห์ข้อมูลและเขียน Executive Summary...`);
          setSearchSummary('');
          const summaryText = await generateExecutiveSummary(cleanData.slice(0, 10), requestedQuery, (chunk, fullText) => {
            setSearchSummary(fullText);
          }, webContext);
          setSearchSummary(summaryText);
        }

        const nextResults = isMore ? mergeUniquePostsById(searchResults, cleanData) : cleanData;
        setSearchResults(nextResults);
        setSearchCursor(meta.next_cursor);
        
        // Progressive Translation for results...
        const CHUNK_SIZE = 5;
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
      }
      setStatus(`ค้นพบ ${data.length} รายการ`);
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearching(false);
      setIsLiveSearching(false);
    }
  };

  useEffect(() => {
    const isAudienceManual = activeView === 'audience' && audienceTab === 'manual';
    const query = isAudienceManual ? manualQuery : searchQuery;

    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const filteredSuggestions = commonKeywords.filter(kw => 
      kw.toLowerCase().includes(query.toLowerCase()) && kw.toLowerCase() !== query.toLowerCase()
    ).slice(0, 5);
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
  }, [searchQuery, manualQuery, activeView, audienceTab, contentTab]);

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
    if (listModal.mode === 'create') {
      const newList = { id: Date.now().toString(), name: listModal.value, color: 'var(--accent-secondary)', members: [], createdAt: new Date().toISOString() };
      setPostLists([...postLists, newList]);
      setActiveListId(newList.id);
    } else {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(listModal.value))));
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
        setStatus(`นำเข้า Post List "${newList.name}" สำเร็จ (${newMembers.length} บัญชี)`);
      } catch (err) { 
        console.error(err); 
        setStatus('นำเข้าล้มเหลว: รหัสไม่ถูกต้อง');
      }
    }
    setListModal({ show: false, mode: 'create', value: '' });
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



  const handleAiFilter = async () => {
    if (!filterModal.prompt || filterModal.isFiltering) return;
    setFilterModal(prev => ({ ...prev, isFiltering: true }));
    setStatus('AI กำลังวิเคราะห์และคัดกรองเนื้อหา...');
    
    try {
      const validIds = await agentFilterFeed(feed, filterModal.prompt);
      const filteredResult = feed.filter(t => validIds.some(vid => String(vid) === String(t.id)));
      
      setFeed(filteredResult);
      setIsFiltered(true);
      
      if (filteredResult.length > 0) {
        setStatus('กำลังวิเคราะห์บทสรุปสำหรับคุณ...');
        const summary = await generateExecutiveSummary(filteredResult.slice(0, 10), filterModal.prompt);
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
    setPostLists(prev => prev.map(l => {
      if (l.id !== listId) return l;
      const alreadyIn = l.members.some(m => m.toLowerCase() === cleanHandle);
      if (alreadyIn) {
        return { ...l, members: l.members.filter(m => m.toLowerCase() !== cleanHandle) };
      } else {
        return { ...l, members: [...l.members, cleanHandle] };
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
            <header className="dashboard-header" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                <div className="mobile-only-flex" style={{ justifyContent: 'center', width: '100%', marginBottom: '-8px', minHeight: '32px' }}>
                  <img src="logo.png" alt="FO" style={{ height: '24px', width: '48px', display: 'block' }} loading="eager" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: '500' }}>WATCHLIST FEED</div>
                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: activeListId ? (postLists.find(l => l.id === activeListId)?.color || 'inherit') : 'inherit' }}>
                      {activeListId ? postLists.find(l => l.id === activeListId)?.name : 'หน้าหลัก'}
                    </h1>
                  </div>
                  <button className="mobile-only-flex icon-btn-large" onClick={() => setIsMobilePostListOpen(true)}><List size={20} /></button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleDeleteAll} className="icon-btn-large"><Trash2 size={18} /></button>
                    <button onClick={handleUndo} className="icon-btn-large"><Undo2 size={18} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setFilterModal({ show: true, prompt: '' })} className="btn-pill">AI Filter</button>
                    <button onClick={handleSync} disabled={loading} className="btn-pill primary">
                      {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} ซิงค์ข้อมูล
                    </button>
                  </div>
                </div>
              </header>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleSort('view')} className={`btn-pill ${activeFilters.view ? 'active' : ''}`}>ยอดวิว</button>
                  <button onClick={() => handleSort('engagement')} className={`btn-pill ${activeFilters.engagement ? 'active' : ''}`}>เอนเกจเมนต์</button>
                </div>
              </div>

              {aiFilterSummary && (
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
                  <div style={{
                    position: 'absolute', top: '-20px', left: '-20px', width: '120px', height: '120px',
                    background: 'radial-gradient(circle, rgba(41, 151, 255, 0.15) 0%, transparent 70%)',
                    zIndex: 0
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
                {feed.length === 0 ? (
                  <div className="empty-state-card">
                    {watchlist.length === 0 ? 'เริ่มโดยการเพิ่มบัญชีที่ต้องการติดตาม' : 'กดปุ่มซิงค์ข้อมูลเพื่อสรุปข่าว'}
                  </div>
                ) : (
                  feed.map((item, idx) => (
                    <FeedCard key={item.id || idx} tweet={item} 
                      isBookmarked={bookmarks.some(b => b.id === item.id)}
                      onBookmark={handleBookmark}
                      onArticleGen={(it) => { setCreateContentSource(it); setActiveView('content'); setTimeout(() => setContentTab('create'), 0); }} 
                    />
                  ))
                )}
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
                  <h1 className="hero-search-title">ค้นหาคอนเทนต์</h1>
                  <p className="hero-search-subtitle">สำรวจเทรนด์และเจาะลึกข้อมูลจากทั่วโลก</p>
                  <div className="hero-search-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="hero-search-form" style={{ display: 'flex', width: '100%' }}>
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
                          {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'ค้นหา'}
                        </button>
                      </div>
                    </div>
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

                    {!searchQuery && searchResults.length === 0 && !isSearching && (
                      <div className="search-idea-tags animate-fade-in">
                        <p>ลองค้นหาคีย์เวิร์ดเหล่านี้...</p>
                        <div className="tags-row">
                          {['AI Trends 2026', 'สรุปข่าว AI', 'เทคโนโลยี', 'Web3 & Crypto', 'Social Media', 'Marketing', 'Startup Funding'].map(tag => (
                            <button key={tag} className="idea-tag" type="button" onClick={() => { setSearchQuery(tag); handleSearch(null, false, tag); }}>
                              {tag}
                            </button>
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
                          zIndex: 0
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
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>ANALYZING TOP 10 RELEVANT SIGNALS</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(searchSummary);
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
                          dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(searchSummary) }} 
                        />
                        
                        <div style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                          marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            <ShieldCheck size={12} className="text-accent" />
                            สรุปโดย AI อ้างอิงจากข้อมูลล่าสุดใน 24-48 ชั่วโมงที่ผ่านมา
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
                                  <div style={{ fontSize: '11px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                      {searchResults.map((item, idx) => <FeedCard key={item.id || idx} tweet={item} />)}
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
          <div className="reader-library-view animate-fade-in" style={{ display: activeView === 'read' ? 'block' : 'none' }}>
            <header className="reader-header">
                <h1 className="reader-title">อ่านข่าว</h1>
                <p className="reader-subtitle">บทความและข่าวสารที่คุณบันทึกไว้อ่านแบบ Deep Read</p>
                {activeListId && <div className="active-list-pills">กำลังกรองตาม: {postLists.find(l => l.id === activeListId)?.name}</div>}
              </header>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px' }}>
                {readArchive.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setReadFilters(p => ({ ...p, view: !p.view }))} className={`btn-pill ${readFilters.view ? 'active' : ''}`}>ยอดวิว</button>
                    <button onClick={() => setReadFilters(p => ({ ...p, engagement: !p.engagement }))} className={`btn-pill ${readFilters.engagement ? 'active' : ''}`}>เอนเกจเมนต์</button>
                  </div>
                )}
              </div>
              
              <div className="feed-grid">
                {readArchive
                  .filter(item => {
                    if (!activeListId) return true;
                    const activeList = postLists.find(l => l.id === activeListId);
                    if (!activeList) return true;
                    return item && item.author && activeList.members.some(m => m.toLowerCase() === item.author.username?.toLowerCase());
                  })
                  .sort((a, b) => {
                    if (!readFilters.view && !readFilters.engagement) {
                      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    }
                    const scoreA = (readFilters.view ? toNumber(a.view_count) : 0) + (readFilters.engagement ? getEngagementTotal(a) : 0);
                    const scoreB = (readFilters.view ? toNumber(b.view_count) : 0) + (readFilters.engagement ? getEngagementTotal(b) : 0);
                    return scoreB - scoreA;
                  })
                  .map((item, idx) => (
                    <FeedCard key={item.id || idx} tweet={item} isBookmarked={bookmarks.some(b => b.id === item.id)} onBookmark={handleBookmark} />
                  ))
                }
                {readArchive.length === 0 && <div className="empty-state-card">ยังไม่มีบทความในห้องสมุด</div>}
              </div>
            </div>

          {/* ===== AUDIENCE VIEW: SMART TARGET DISCOVERY ===== */}
          <div className="animate-fade-in" style={{ display: activeView === 'audience' ? 'block' : 'none' }}>
            {(() => {
              const CATEGORIES = [
                { icon: '⚙️', label: 'เทคโนโลยี' }, { icon: '🤖', label: 'AI' },
              { icon: '💼', label: 'ธุรกิจ' }, { icon: '📈', label: 'การตลาด' },
              { icon: '💹', label: 'การเงิน' }, { icon: '📊', label: 'การลงทุน' },
              { icon: '₿', label: 'คริปโต' }, { icon: '🏥', label: 'สุขภาพ' },
              { icon: '🌿', label: 'ไลฟ์สไตล์' }, { icon: '🌐', label: 'เศรษฐกิจ' },
              { icon: '🏛️', label: 'การเมือง' }, { icon: '🧠', label: 'การพัฒนาตัวเอง' },
            ];

            return (
              <div className="animate-fade-in">
                <header className="dashboard-header" style={{ marginBottom: '28px', paddingTop: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '22px' }}>⚡</span>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', margin: 0 }}>Smart Target Discovery</h1>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginLeft: '32px', margin: 0 }}>ค้นหาและเพิ่มแหล่งข้อมูลที่ตรงกับความสนใจของคุณ</p>
                </header>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', padding: '4px', background: 'var(--bg-800)', borderRadius: '10px', width: 'fit-content' }}>
                  <button onClick={() => setAudienceTab('ai')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', background: audienceTab === 'ai' ? 'var(--accent-gradient)' : 'transparent', color: audienceTab === 'ai' ? '#fff' : 'var(--text-dim)' }}>✨ แนะนำโดย AI</button>
                  <button onClick={() => setAudienceTab('manual')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', background: audienceTab === 'manual' ? 'var(--bg-700)' : 'transparent', color: audienceTab === 'manual' ? '#fff' : 'var(--text-dim)' }}>🔍 ค้นหาชื่อ</button>
                </div>

                {audienceTab === 'ai' && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', maxWidth: '680px' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-800)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 16px' }}>
                        <span style={{ fontSize: '16px' }}>🎯</span>
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
                                            onClick={() => { handleToggleMemberInList(list.id, expert.username); }}
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

                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '28px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', textAlign: 'center', marginBottom: '20px', color: 'var(--text-muted)' }}>▌ DISCOVER BY CATEGORY ▌</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                        {CATEGORIES.map(cat => (
                          <button key={cat.label} onClick={() => { setAiQuery(cat.label); handleAiSearchAudience(cat.label); }} className="category-btn">
                            <span style={{ fontSize: '22px' }}>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {audienceTab === 'manual' && (
                  <div className="animate-fade-in">
                    <div style={{ maxWidth: '640px', marginBottom: '40px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ค้นหาด้วย X Username โดยตรง</div>
                      <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
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
                <h1 style={{ fontSize: '32px', fontWeight: '800' }}>Bookmarks</h1>
                <p style={{ color: 'var(--text-muted)' }}>คลังข้อมูลที่คุณบันทึกไว้แยกตามประเภท</p>
              </header>

              <div style={{ display: 'flex', gap: '8px', margin: '24px 0', padding: '4px', background: 'var(--bg-800)', borderRadius: '10px', width: 'fit-content' }}>
                <button onClick={() => setBookmarkTab('news')} className={`btn-pill ${bookmarkTab === 'news' ? 'active' : ''}`}>📰 ข่าว</button>
                <button onClick={() => setBookmarkTab('article')} className={`btn-pill ${bookmarkTab === 'article' ? 'active' : ''}`}>📝 บทความ</button>
              </div>
              
              <div className="feed-grid">
                {bookmarks.filter(b => bookmarkTab === 'news' ? b.type !== 'article' : b.type === 'article').map((item, idx) => (
                   bookmarkTab === 'news' ? (
                     <FeedCard key={item.id || idx} tweet={item} isBookmarked={true} onBookmark={handleBookmark} />
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
        <div className="modal-overlay" onClick={() => setListModal({ ...listModal, show: false })}>
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
              <button className="modal-btn modal-btn-secondary" onClick={() => setListModal({ ...listModal, show: false })}>ยกเลิก</button>
              <button className="modal-btn modal-btn-primary" onClick={finalizeListAction}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {filterModal.show && (
        <div className="modal-overlay" onClick={() => !filterModal.isFiltering && setFilterModal({ ...filterModal, show: false })}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">🪄 AI Smart Filter</div>
            <div className="modal-subtitle">กรองเนื้อหาที่ต้องการโดยระบุเป็นภาษามนุษย์ (เช่น "หาเฉพาะเรื่องระดมทุนของส้มหยุด" หรือ "ข่าวที่เกี่ยวกับ Apple")</div>
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
        onSelectList={setActiveListId} onCreateList={() => setListModal({ show: true, mode: 'create', value: '' })}
        onImportList={() => setListModal({ show: true, mode: 'import', value: '' })}
        onRemoveList={handleRemoveList} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}
        onUpdateList={handleUpdateList} onShareList={handleShareList} onRemoveAccount={handleRemoveAccountGlobal}
        isMobileOpen={isMobilePostListOpen} onCloseMobile={() => setIsMobilePostListOpen(false)}
      />
    </div>
  );
};

export default App;
