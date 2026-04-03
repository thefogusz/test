// @ts-nocheck
import React, { Suspense, lazy, startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import AiFilterModal from './components/AiFilterModal';
import HomeView from './components/HomeView';
import ListModal from './components/ListModal';
import Sidebar from './components/Sidebar';
import StatusToast from './components/StatusToast';
import RightSidebar from './components/RightSidebar';
import {
  getUserInfo,
} from './services/TwitterService';
import { discoverTopExpertsStrict } from './services/GrokService';
import { getSummaryDateLabel } from './utils/summaryDates';
import './index.css';
import { STORAGE_KEYS } from './constants/storageKeys';
import { useHomeFeedWorkspace } from './hooks/useHomeFeedWorkspace';
import { useIndexedDbState } from './hooks/useIndexedDbState';
import useLibraryViews from './hooks/useLibraryViews';
import { usePersistentState } from './hooks/usePersistentState';
import { useSearchWorkspace } from './hooks/useSearchWorkspace';
import useSearchSuggestions from './hooks/useSearchSuggestions';
import {
  sanitizeCollectionState,
  sanitizeStoredSingle,
} from './utils/appUtils';
import {
  deserializeAttachedSource,
  deserializePostLists,
  deserializeStoredCollection,
  deserializeWatchlist,
} from './utils/appPersistence';

const AudienceWorkspace = lazy(() => import('./components/AudienceWorkspace'));
const BookmarksWorkspace = lazy(() => import('./components/BookmarksWorkspace'));
const ContentWorkspace = lazy(() => import('./components/ContentWorkspace'));
const ReadWorkspace = lazy(() => import('./components/ReadWorkspace'));

const READ_ARCHIVE_INITIAL_RENDER = 24;
const READ_ARCHIVE_RENDER_BATCH = 24;

const shouldRemoveWhenFalsy = (value) => !value;
const DEFAULT_POST_LIST_COLOR = 'var(--accent-secondary)';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bytesToBase64Url = (bytes) =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const base64UrlToBytes = (value) => {
  const normalized = String(value || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  const base64 = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const compressString = async (value) => {
  const stream = new Blob([value]).stream().pipeThrough(new CompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
};

const decompressString = async (bytes) => {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return textDecoder.decode(buffer);
};

const encodeShareListPayload = async (list) => {
  const compactPayload = {
    n: String(list?.name || '').slice(0, 60).trim() || 'List',
    m: Array.isArray(list?.members) ? list.members.map((member) => String(member || '').trim().replace(/^@/, '').toLowerCase()).filter(Boolean) : [],
    ...(list?.color && list.color !== DEFAULT_POST_LIST_COLOR ? { c: list.color } : {}),
  };

  const json = JSON.stringify(compactPayload);
  if (typeof CompressionStream === 'function') {
    const compressed = await compressString(json);
    return `z.${bytesToBase64Url(compressed)}`;
  }

  return bytesToBase64Url(textEncoder.encode(json));
};

const decodeShareListPayload = async (value) => {
  const normalized = String(value || '').trim();
  const raw =
    normalized.startsWith('z.') && typeof DecompressionStream === 'function'
      ? JSON.parse(await decompressString(base64UrlToBytes(normalized.slice(2))))
      : JSON.parse(textDecoder.decode(base64UrlToBytes(normalized)));

  return {
    name: raw?.n ?? raw?.name,
    members: raw?.m ?? raw?.members,
    color: raw?.c ?? raw?.color,
  };
};

const App = () => {
  const [watchlist, setWatchlist] = usePersistentState(STORAGE_KEYS.watchlist, [], {
    deserialize: deserializeWatchlist,
  });
  
  const [originalFeed, setOriginalFeed] = useIndexedDbState(STORAGE_KEYS.homeFeed, [], {
    deserialize: deserializeStoredCollection,
  });
  const [pendingFeed, setPendingFeed] = useIndexedDbState(STORAGE_KEYS.pendingFeed, [], {
    deserialize: deserializeStoredCollection,
  });
  const [status, setStatus] = useState('');

  const [bookmarks, setBookmarks] = useIndexedDbState(STORAGE_KEYS.bookmarks, [], {
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
  const [readArchive, setReadArchive] = useIndexedDbState(STORAGE_KEYS.readArchive, [], {
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

  const {
    activeFilters,
    aiFilterSummary,
    applyAiFilter,
    clearAiFilter,
    deletedFeed,
    feed,
    handleDeleteAll,
    handleLoadMore,
    handleSort,
    handleSync,
    handleUndo,
    isFiltered,
    isFiltering,
    loading,
    nextCursor,
  } = useHomeFeedWorkspace({
    activeListId,
    activeView,
    originalFeed,
    pendingFeed,
    postLists,
    watchlist,
    setOriginalFeed,
    setPendingFeed,
    setReadArchive,
    setStatus,
  });
  const {
    activeSuggestionIndex,
    addSearchPreset,
    canSaveCurrentSearchAsPreset,
    dynamicSearchTags,
    handleSearch,
    interestSeedLabels,
    isLatestMode,
    isLiveSearching,
    isSearching,
    isSourcesExpanded,
    lastSubmittedSearchQuery,
    maxSearchPresets,
    removeSearchPreset,
    searchCursor,
    searchHistory,
    searchHistoryLabels,
    searchOverflowResults,
    searchPresets,
    searchMediaType,
    searchQuery,
    searchResults,
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
    shouldInlineSearchStatus,
    showSuggestions,
  } = useSearchWorkspace({
    activeView,
    contentTab,
    originalFeed,
    readArchive,
    setStatus,
    status,
  });
  const aiFilterSummaryDateLabel = getSummaryDateLabel(feed, 8);

  // Global Background Tasks Persistence
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [genPhase, setGenPhase] = useState('idle');

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

  const watchlistHandleSet = useMemo(
    () => new Set((watchlist || []).map((user) => (user?.username || '').toLowerCase()).filter(Boolean)),
    [watchlist],
  );

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
        const raw = await decodeShareListPayload(listModal.value);

        // Validate decoded payload — reject or sanitize unexpected values
        const safeName = String(raw.name || '').slice(0, 60).trim() || 'Imported List';
        const safeColor = /^(var\(--[a-z-]+\)|#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))$/.test(raw.color)
          ? raw.color
          : DEFAULT_POST_LIST_COLOR;
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

  const handleShareList = async (list) => {
    const code = await encodeShareListPayload(list);
    navigator.clipboard.writeText(code).then(() => setStatus('คัดลอกรหัสแชร์แล้ว'));
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

  const handleAiFilter = async (promptOverride) => {
    const prompt = promptOverride ?? filterModal.prompt;
    if (!prompt || isFiltering) return;

    setFilterModal((prev) => ({ ...prev, show: false }));
    try {
      await applyAiFilter(prompt);
    } catch {
      // Status messaging is handled inside the home feed workspace mutation.
    }
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
          filtering: isFiltering,
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
            isFiltering={isFiltering}
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
              searchMediaType={searchMediaType}
              setSearchMediaType={setSearchMediaType}
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
              maxSearchPresets={maxSearchPresets}
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
        filterModal={{ ...filterModal, isFiltering }}
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


