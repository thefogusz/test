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
  List,
  LayoutGrid,
  Activity,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import FeedCard from './components/FeedCard';
import CreateContent from './components/CreateContent';
import {
  curateSearchResults,
  filterTweetsWithinHours,
  getUserInfo,
  fetchWatchlistFeed,
  RECENT_WINDOW_HOURS,
  searchEverything,
} from './services/TwitterService';
import { agentFilterFeed, buildSearchPlan, discoverTopExperts, generateExecutiveSummary, generateGrokBatch } from './services/GrokService';
import { renderMarkdownToHtml } from './utils/markdown';
import './index.css';
import {
  safeParse,
  mergeUniquePostsById,
  hasThaiCharacters,
  hasUsefulThaiSummary,
  sanitizeStoredPost,
  sanitizeStoredCollection,
  sanitizeStoredSingle,
  sanitizeCollectionState,
  getEngagementTotal,
  mergePlanLabelsIntoQuery
} from './utils/appUtils';
import UserCard from './components/UserCard';
import ContentErrorBoundary from './components/ContentErrorBoundary';

const getSearchFallbackResults = (tweets, requestedQuery, isLatestMode) =>
  curateSearchResults(tweets, requestedQuery, {
    latestMode: isLatestMode,
    preferCredibleSources: true,
  });



const App = () => {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('foro_watchlist_v2');
    const parsed = safeParse(saved, []);
    return Array.isArray(parsed) ? parsed.filter(u => u && u.username) : [];
  });
  
  const [feed, setFeed] = useState([]);
  const [originalFeed, setOriginalFeed] = useState(() => {
    const saved = localStorage.getItem('foro_home_feed_v1');
    return sanitizeStoredCollection(safeParse(saved, []));
  });
  const [deletedFeed, setDeletedFeed] = useState([]);
  const [pendingFeed, setPendingFeed] = useState(() => {
    const saved = localStorage.getItem('foro_pending_feed_v1');
    return sanitizeStoredCollection(safeParse(saved, []));
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [aiReport, setAiReport] = useState('');
  const [activeFilters, setActiveFilters] = useState({ view: false, like: false });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [originalSearchResults, setOriginalSearchResults] = useState([]);
  const [searchSummary, setSearchSummary] = useState('');
  const [searchFilters, setSearchFilters] = useState({ view: false, engagement: false });
  const [isSearching, setIsSearching] = useState(false);
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

  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('foro_bookmarks_v1');
    return sanitizeStoredCollection(safeParse(saved, []));
  });
  const [bookmarkTab, setBookmarkTab] = useState('news');
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  const [isMobilePostListOpen, setIsMobilePostListOpen] = useState(false);
  const [readArchive, setReadArchive] = useState(() => {
    const saved = localStorage.getItem('foro_read_archive_v1');
    return sanitizeStoredCollection(safeParse(saved, []));
  });

  const [createContentSource, setCreateContentSource] = useState(() => {
    const saved = localStorage.getItem('foro_attached_source_v1');
    return sanitizeStoredSingle(safeParse(saved, null));
  });

  const [postLists, setPostLists] = useState(() => {
    const saved = localStorage.getItem('foro_postlists_v2');
    return safeParse(saved, []);
  });
  const [activeListId, setActiveListId] = useState(null);
  const [activeView, setActiveView] = useState('home');
  const [contentTab, setContentTab] = useState('search');
  const [listModal, setListModal] = useState({ show: false, mode: 'create', value: '' });
  const [filterModal, setFilterModal] = useState({ show: false, prompt: '' });
  const [readFilters, setReadFilters] = useState({ view: false, engagement: false });

  const [audienceTab, setAudienceTab] = useState('manual'); 
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [manualQuery, setManualQuery] = useState('');
  const [manualPreview, setManualPreview] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('foro_watchlist_v2', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('foro_postlists_v2', JSON.stringify(postLists));
  }, [postLists]);

   useEffect(() => {
     localStorage.setItem('foro_bookmarks_v1', JSON.stringify(bookmarks));
   }, [bookmarks]);

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
    localStorage.setItem('foro_read_archive_v1', JSON.stringify(readArchive));
  }, [readArchive]);

  useEffect(() => {
    localStorage.setItem('foro_home_feed_v1', JSON.stringify(originalFeed));
  }, [originalFeed]);

  useEffect(() => {
    localStorage.setItem('foro_pending_feed_v1', JSON.stringify(pendingFeed));
  }, [pendingFeed]);

  useEffect(() => {
    if (createContentSource) {
      localStorage.setItem('foro_attached_source_v1', JSON.stringify(createContentSource));
    } else {
      localStorage.removeItem('foro_attached_source_v1');
    }
  }, [createContentSource]);

  useEffect(() => {
    setOriginalFeed(prev => sanitizeCollectionState(prev));
    setPendingFeed(prev => sanitizeCollectionState(prev));
    setReadArchive(prev => sanitizeCollectionState(prev));
    setBookmarks(prev => sanitizeCollectionState(prev));
    setCreateContentSource(prev => sanitizeStoredSingle(prev));
  }, []);

  useEffect(() => {
    if (activeView === 'search') return; 
    
    if (activeListId) {
      const activeList = postLists.find(l => l.id === activeListId);
      if (activeList) {
        const filtered = originalFeed.filter(post => 
          post && post.author && activeList.members.some(m => (m || '').toLowerCase() === (post.author.username || '').toLowerCase())
        );
        setFeed(filtered);
      }
    } else if (activeView === 'home') {
      const watchlistHandles = watchlist.map(w => (w.username || '').toLowerCase()).filter(Boolean);
      const filtered = originalFeed.filter(post => 
        post && post.author && (post.author.username || '').toLowerCase() && 
        watchlistHandles.includes((post.author.username || '').toLowerCase())
      );
      setFeed(filtered);
    }
  }, [activeListId, originalFeed, activeView, postLists, watchlist]);

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
    const startTime = Date.now();
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

      let data = [];
      let meta = { next_cursor: null };

      if (isLatestMode) {
        const response = await searchEverything(planQueries[0], isMore ? searchCursor : null, onlyNews, 'Latest');
        data = filterTweetsWithinHours(response.data, RECENT_WINDOW_HOURS);
        meta = response.meta;
      } else {
        const response = await searchEverything(planQueries[0], isMore ? searchCursor : null, onlyNews, 'Top');
        data = response.data;
        meta = response.meta;
      }

      if (data.length > 0) {
        const validIds = await agentFilterFeed(data, rankingQuery);
        const cleanData = data.filter(t => validIds.includes(t.id));
        
        if (!isMore) {
          const summaryText = await generateExecutiveSummary(cleanData.slice(0, 5), requestedQuery);
          setSearchSummary(summaryText);
        }

        const nextResults = isMore ? mergeUniquePostsById(searchResults, cleanData) : cleanData;
        setSearchResults(nextResults);
        setOriginalSearchResults(nextResults);
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

    if (!isAudienceManual) {
      const timer = setTimeout(() => {
        if (searchQuery.trim().length >= 1) {
          setIsLiveSearching(true);
          handleSearch(null, false, searchQuery);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
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
        setPostLists([...postLists, newList]);
      } catch (err) { console.error(err); }
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
    setActiveFilters(prev => {
      const next = { ...prev, [type]: !prev[type] };
      const sorted = [...feed].sort((a, b) => {
        const scoreA = (next.view ? (parseInt(a.view_count) || 0) : 0) + (next.engagement ? getEngagementTotal(a) : 0);
        const scoreB = (next.view ? (parseInt(b.view_count) || 0) : 0) + (next.engagement ? getEngagementTotal(b) : 0);
        return scoreB - scoreA;
      });
      setFeed(sorted);
      return next;
    });
  };

  const handleSearchSort = (type) => {
    setSearchFilters(prev => {
      const next = { ...prev, [type]: !prev[type] };
      const sorted = [...searchResults].sort((a, b) => {
        const scoreA = (next.view ? (parseInt(a.view_count) || 0) : 0) + (next.engagement ? getEngagementTotal(a) : 0);
        const scoreB = (next.view ? (parseInt(b.view_count) || 0) : 0) + (next.engagement ? getEngagementTotal(b) : 0);
        return scoreB - scoreA;
      });
      setSearchResults(sorted);
      return next;
    });
  };

  const handleAiFilter = async () => {
    if (!filterModal.prompt) return;
    setLoading(true);
    const validIds = await agentFilterFeed(feed, filterModal.prompt);
    setFeed(feed.filter(t => validIds.includes(t.id)));
    setFilterModal({ show: false, prompt: '' });
    setLoading(false);
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
    setManualLoading(true);
    const data = await getUserInfo(manualQuery);
    setManualPreview(data);
    setManualLoading(false);
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
          setActiveListId(null);
          if (view === 'home') { setSearchQuery(''); setSearchResults([]); }
        }}
      />

      {isMobilePostListOpen && (
        <div className="mobile-backdrop" onClick={() => setIsMobilePostListOpen(false)} />
      )}

      <main className="foro-main">
        <div className="foro-main-scroll">

          {/* ===== HOME VIEW ===== */}
          {activeView === 'home' && (
            <div className="animate-fade-in">
              <header className="dashboard-header" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                <div className="mobile-only-flex" style={{ justifyContent: 'center', width: '100%', marginBottom: '-8px' }}>
                  <img src="logo.png" alt="FO" style={{ height: '24px', width: 'auto' }} />
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

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div className="section-title">โพสต์ล่าสุด</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleSort('view')} className={`btn-pill ${activeFilters.view ? 'active' : ''}`}>ยอดวิว</button>
                  <button onClick={() => handleSort('engagement')} className={`btn-pill ${activeFilters.engagement ? 'active' : ''}`}>เอนเกจเมนต์</button>
                </div>
              </div>
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
          )}

          {/* ===== UNIFIED CONTENT VIEW ===== */}
          {activeView === 'content' && (
            <div className="unified-content-view animate-fade-in">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                <button className={`btn-pill ${contentTab === 'search' ? 'primary' : ''}`} onClick={() => setContentTab('search')}>
                  <Search size={16} /> ค้นหา
                </button>
                <button className={`btn-pill ${contentTab === 'create' ? 'primary' : ''}`} onClick={() => setContentTab('create')}>
                  <Sparkles size={16} /> สร้างคอนเทนต์
                </button>
              </div>

              {contentTab === 'create' && (
                <div className="animate-fade-in">
                  <ContentErrorBoundary key={createContentSource?.id}>
                    <CreateContent 
                      sourceNode={createContentSource} 
                      onRemoveSource={() => setCreateContentSource(null)}
                      onSaveArticle={(title, content) => {
                        const newArt = { id: Date.now().toString(), type: 'article', title: title || 'บทความ AI', summary: content, created_at: new Date().toISOString() };
                        setBookmarks(prev => [newArt, ...prev]);
                      }}
                    />
                  </ContentErrorBoundary>
                </div>
              )}

              {contentTab === 'search' && (
                <div className="search-discovery-view animate-fade-in">
                  <div className="hero-search-container">
                    <h1 className="hero-search-title">ค้นหาคอนเทนต์</h1>
                    <p className="hero-search-subtitle">สำรวจเทรนด์และเจาะลึกข้อมูลจากทั่วโลก</p>
                    <div className="hero-search-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <form onSubmit={(e) => { e.preventDefault(); handleSearch(e); setShowSuggestions(false); }} className="hero-search-form">
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
                            else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                              const sel = suggestions[activeSuggestionIndex];
                              setSearchQuery(sel); handleSearch(null, false, sel); setShowSuggestions(false);
                            }
                          }}
                        />
                        <div className="hero-search-actions">
                          {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSuggestions([]); }} className="hero-clear-btn"><X size={16} /></button>}
                          <button type="submit" className="hero-submit-btn" disabled={isSearching}>
                            {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'ค้นหา'}
                          </button>
                        </div>
                      </form>
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="search-suggestions-dropdown">
                          {suggestions.map((item, idx) => (
                            <div key={item} className={`suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`} onClick={() => { setSearchQuery(item); handleSearch(null, false, item); setShowSuggestions(false); }}>
                              <Search size={14} className="suggestion-icon" /><span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isLiveSearching && !isSearching && <div className="searching-indicator" style={{ marginTop: '16px' }}><RefreshCw size={12} className="animate-spin" /> กำลังประมวลผลการค้นหา...</div>}
                      
                      {!searchQuery && searchResults.length === 0 && (
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
                      {searchSummary && <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(searchSummary) }} />}
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
              )}
            </div>
          )}

          {/* ===== READ VIEW ===== */}
          {activeView === 'read' && (
            <div className="reader-library-view animate-fade-in">
              <header className="reader-header">
                <h1 className="reader-title">อ่านข่าว</h1>
                <p className="reader-subtitle">บทความและข่าวสารที่คุณบันทึกไว้อ่านแบบ Deep Read</p>
                {activeListId && <div className="active-list-pills">กำลังกรองตาม: {postLists.find(l => l.id === activeListId)?.name}</div>}
              </header>

              {readArchive.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <button onClick={() => setReadFilters(p => ({ ...p, view: !p.view }))} className={`btn-pill ${readFilters.view ? 'active' : ''}`}>ยอดวิว</button>
                  <button onClick={() => setReadFilters(p => ({ ...p, engagement: !p.engagement }))} className={`btn-pill ${readFilters.engagement ? 'active' : ''}`}>เอนเกจเมนต์</button>
                </div>
              )}
              
              <div className="feed-grid">
                {readArchive
                  .filter(item => {
                    if (!activeListId) return true;
                    const activeList = postLists.find(l => l.id === activeListId);
                    if (!activeList) return true;
                    return item && item.author && activeList.members.some(m => m.toLowerCase() === item.author.username?.toLowerCase());
                  })
                  .sort((a, b) => {
                    const scoreA = (readFilters.view ? (parseInt(a.view_count) || 0) : 0) + (readFilters.engagement ? getEngagementTotal(a) : 0);
                    const scoreB = (readFilters.view ? (parseInt(b.view_count) || 0) : 0) + (readFilters.engagement ? getEngagementTotal(b) : 0);
                    return scoreB - scoreA;
                  })
                  .map((item, idx) => (
                    <FeedCard key={item.id || idx} tweet={item} isBookmarked={bookmarks.some(b => b.id === item.id)} onBookmark={handleBookmark} />
                  ))
                }
                {readArchive.length === 0 && <div className="empty-state-card">ยังไม่มีบทความในห้องสมุด</div>}
              </div>
            </div>
          )}

          {/* ===== AUDIENCE VIEW: SMART TARGET DISCOVERY ===== */}
          {activeView === 'audience' && (() => {
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
                                    <div className="discovery-menu" style={{ display: 'none', position: 'absolute', right: 0, top: '100%', marginTop: '8px', background: 'var(--bg-900)', border: '1px solid var(--glass-border)', borderRadius: '12px', zIndex: 100, width: '180px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
                                      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-border)', fontSize: '10px', fontWeight: '800', color: 'var(--accent-secondary)' }}>ADD TO LIST</div>
                                      {postLists.map(list => {
                                        const isMember = list.members.some(m => m.toLowerCase() === expert.username.toLowerCase());
                                        return (
                                          <button
                                            key={list.id}
                                            onClick={() => { handleToggleMemberInList(list.id, expert.username); }}
                                            style={{ width: '100%', background: 'transparent', border: 'none', color: isMember ? 'var(--accent-secondary)' : '#fff', cursor: 'pointer', padding: '8px 12px', textAlign: 'left', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}
                                          >
                                            {list.name}
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
                      {watchlist.length === 0 && (
                        <div style={{ padding: '100px 40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                          <Users size={48} style={{ color: 'var(--bg-700)', marginBottom: '16px' }} />
                          <div style={{ color: 'var(--text-dim)', fontSize: '15px' }}>ยังไม่มีบัญชีที่ติดตามอยู่</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}



          {/* ===== BOOKMARKS VIEW ===== */}
          {activeView === 'bookmarks' && (
            <div className="animate-fade-in">
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
          )}

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
        <div className="modal-overlay" onClick={() => setFilterModal({ ...filterModal, show: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🪄 AI Smart Filter</div>
            <div className="modal-subtitle">กรองเนื้อหาที่ต้องการโดยระบุเป็นภาษามนุษย์ (เช่น "หาเฉพาะเรื่องระดมทุนของส้มหยุด" หรือ "ข่าวที่เกี่ยวกับ Apple")</div>
            <textarea 
              className="modal-input"
              style={{ minHeight: '120px', resize: 'none', padding: '16px' }}
              autoFocus
              placeholder="ระบุสิ่งที่ต้องการกรองที่นี่..."
              value={filterModal.prompt}
              onChange={e => setFilterModal({ ...filterModal, prompt: e.target.value })}
            />
            <div className="modal-actions">
              <button className="modal-btn modal-btn-secondary" onClick={() => setFilterModal({ ...filterModal, show: false })}>ยกเลิก</button>
              <button className="modal-btn modal-btn-primary" onClick={handleAiFilter}>กรองข้อมูล</button>
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
