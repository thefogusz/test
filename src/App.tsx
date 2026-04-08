// @ts-nocheck
import React, { Suspense, lazy, startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import AiFilterModal from './components/AiFilterModal';
import ArticleReaderModal from './components/ArticleReaderModal';
import HomeView from './components/HomeView';
import ListModal from './components/ListModal';
import Sidebar from './components/Sidebar';
import StatusToast from './components/StatusToast';
import RightSidebar from './components/RightSidebar';
import { getSummaryDateLabel } from './utils/summaryDates';
import './index.css';
import { STORAGE_KEYS } from './constants/storageKeys';
import { RSS_CATALOG } from './config/rssCatalog';
import { useHomeFeedWorkspace } from './hooks/useHomeFeedWorkspace';
import { useIndexedDbState } from './hooks/useIndexedDbState';
import useLibraryViews from './hooks/useLibraryViews';
import { usePersistentState } from './hooks/usePersistentState';
import { useSearchWorkspace } from './hooks/useSearchWorkspace';
import useSearchSuggestions from './hooks/useSearchSuggestions';
import { useBilling } from './hooks/useBilling';
import { useWatchlist } from './hooks/useWatchlist';
import { usePostLists } from './hooks/usePostLists';
import { useAudienceSearch } from './hooks/useAudienceSearch';
import { clearForoIndexedDbStorage } from './utils/indexedDb';
import {
  sanitizeCollectionState,
  sanitizeStoredSingle,
} from './utils/appUtils';
import {
  deserializeAttachedSource,
  deserializeStoredCollection,
} from './utils/appPersistence';

const AudienceWorkspace = lazy(() => import('./components/AudienceWorkspace'));
const BookmarksWorkspace = lazy(() => import('./components/BookmarksWorkspace'));
const ContentWorkspace = lazy(() => import('./components/ContentWorkspace'));
const PricingView = lazy(() => import('./components/PricingWorkspace'));
const ReadWorkspace = lazy(() => import('./components/ReadWorkspace'));

const READ_ARCHIVE_INITIAL_RENDER = 24;
const READ_ARCHIVE_RENDER_BATCH = 24;

const shouldRemoveWhenFalsy = (value) => !value;
const STORAGE_RESET_QUERY_PARAM = 'reset';
const FORO_STORAGE_KEY_PREFIX = 'foro_';

const App = () => {
  const [status, setStatus] = useState('');
  const [activeView, setActiveView] = usePersistentState(STORAGE_KEYS.activeView, 'home');
  const [contentTab, setContentTab] = usePersistentState(STORAGE_KEYS.contentTab, 'search');

  // --- Billing & Pricing ---
  const {
    activePlanId,
    currentPlan,
    dailyUsage,
    remainingUsage,
    plusAccess,
    planNotice,
    isStartingCheckout,
    openPricingView,
    openPricingWithStatus,
    tryConsumeFeature,
    canUseExportShare,
    handleSwitchPlan,
    handlePlanSelection,
    handleResetUsage,
    setPlanNotice,
  } = useBilling({ setActiveView, setStatus });

  // --- Watchlist ---
  const {
    watchlist,
    setWatchlist,
    watchlistHandleSet,
    hasWatchlistRoomFor,
    resolvePlaceholders,
    handleRemoveAccountGlobal: removeAccountFromWatchlist,
    handleAddUser: addUserToWatchlist,
    handleAddExpert,
    handleAddSearchAuthorToWatchlist,
  } = useWatchlist({ currentPlan, openPricingWithStatus, setStatus });

  // --- Subscribed RSS Sources ---
  const [subscribedSources, setSubscribedSources] = usePersistentState(STORAGE_KEYS.subscribedSources, []);
  const supportedRssSourcesById = useMemo(
    () => new Map(Object.values(RSS_CATALOG).flat().map((source) => [String(source.id), source])),
    [],
  );
  const handleToggleSource = (source) => {
    setSubscribedSources((prev) => {
      const exists = prev.some((s) => s.id === source.id);
      return exists ? prev.filter((s) => s.id !== source.id) : [...prev, source];
    });
  };

  // Safer normalization: only update if found in catalog, don't delete if NOT found
  useEffect(() => {
    setSubscribedSources((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      
      let changed = false;
      const next = prev.map(source => {
        const catalogMatch = supportedRssSourcesById.get(String(source?.id || ''));
        if (catalogMatch && catalogMatch.url !== source.url) {
          changed = true;
          return { ...source, ...catalogMatch };
        }
        return source;
      });

      return changed ? next : prev;
    });
  }, [setSubscribedSources, supportedRssSourcesById]);

  // --- Post Lists ---
  const {
    postLists,
    activeListId,
    setActiveListId,
    currentActiveList,
    listModal,
    setListModal,
    isMobilePostListOpen,
    setIsMobilePostListOpen,
    openPricingFromPostList,
    finalizeListAction,
    handleRemoveList,
    handleUpdateList,
    handleAddMember,
    handleRemoveMember,
    handleShareList,
    handleToggleMemberInList,
    handleRemoveAccountFromLists,
    handleCreateListRequest,
    handleImportListRequest,
    closeListModal,
  } = usePostLists({
    watchlist,
    setWatchlist,
    subscribedSources,
    setSubscribedSources,
    hasWatchlistRoomFor,
    resolvePlaceholders,
    currentPlan,
    openPricingWithStatus,
    openPricingView,
    canUseExportShare,
    setStatus,
  });

  // Combined remove: watchlist + lists
  const handleRemoveAccountGlobal = (id) => {
    removeAccountFromWatchlist(id);
    handleRemoveAccountFromLists(id);
  };

  // --- Audience Search ---
  const {
    audienceTab,
    setAudienceTab,
    aiQuery,
    setAiQuery,
    aiSearchLoading,
    aiSearchResults,
    setAiSearchResults,
    hasSearchedAudience,
    manualQuery,

    setManualQuery,
    manualPreview,
    handleAiSearchAudience,
    handleManualSearch,
    handleAddUser,
  } = useAudienceSearch({
    watchlist,
    hasWatchlistRoomFor,
    handleAddUser: addUserToWatchlist,
  });

  // --- Feed & Content State ---
  const [originalFeed, setOriginalFeed] = useIndexedDbState(STORAGE_KEYS.homeFeed, [], {
    deserialize: deserializeStoredCollection,
  });
  const [pendingFeed, setPendingFeed] = useIndexedDbState(STORAGE_KEYS.pendingFeed, [], {
    deserialize: deserializeStoredCollection,
  });
  const [bookmarks, setBookmarks] = useIndexedDbState(STORAGE_KEYS.bookmarks, [], {
    deserialize: deserializeStoredCollection,
  });
  const [bookmarkTab, setBookmarkTab] = useState('news');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const bookmarkIdSet = useMemo(
    () => new Set(bookmarks.map((item) => item?.id).filter(Boolean)),
    [bookmarks],
  );

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

  const [filterModal, setFilterModal] = useState({ show: false, prompt: '' });
  const DEFAULT_QUICK_PRESETS = ['สรุป', 'หาโพสต์เด่น', 'โพสต์ไหนน่าทำคอนเทนต์'];
  const [quickFilterPresets, setQuickFilterPresets] = usePersistentState(STORAGE_KEYS.quickFilterPresets, DEFAULT_QUICK_PRESETS);
  const [quickFilterVisiblePresets, setQuickFilterVisiblePresets] = usePersistentState(
    STORAGE_KEYS.quickFilterVisiblePresets,
    DEFAULT_QUICK_PRESETS.slice(0, 3),
  );
  const [readFilters, setReadFilters] = useState({ view: false, engagement: false });
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [genPhase, setGenPhase] = useState('idle');

  // --- Composed Hooks ---
  const {
    activeFilters,
    aiFilterSummary,
    applyAiFilter,
    clearAiFilter,
    deletedFeedCount,
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
    subscribedSources,
  });

  const {
    activeSearchFocus,
    activeSuggestionIndex,
    addSearchPreset,
    applySearchFocus,
    canSaveCurrentSearchAsPreset,
    dismissSearchChoices,
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
  } = useSearchWorkspace({
    activeView,
    contentTab,
    originalFeed,
    readArchive,
    subscribedSources,
    setStatus,
    status,
  });

  const aiFilterSummaryDateLabel = getSummaryDateLabel(feed, 8);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get(STORAGE_RESET_QUERY_PARAM) !== '1') return;

    let cancelled = false;

    const resetBrowserState = async () => {
      setStatus('กำลังล้างข้อมูลแอปในเบราว์เซอร์...');

      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(FORO_STORAGE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('[App] Failed to clear localStorage during reset', error);
      }

      try {
        await clearForoIndexedDbStorage();
      } catch (error) {
        console.warn('[App] Failed to clear IndexedDB during reset', error);
      }

      if (cancelled) return;

      currentUrl.searchParams.delete(STORAGE_RESET_QUERY_PARAM);
      window.history.replaceState({}, '', currentUrl.toString());
      window.location.reload();
    };

    void resetBrowserState();

    return () => {
      cancelled = true;
    };
  }, []);

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

  // --- Effects ---
  useEffect(() => {
    if (status) {
      const shouldKeepStatusVisible =
        isSearching ||
        (activeView === 'content' && contentTab === 'search' && searchResults.length > 0 && !searchSummary);

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
  }, [setBookmarks, setCreateContentSource, setOriginalFeed, setPendingFeed, setReadArchive]);

  // --- Quick Filter Presets ---
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
      if (prev.includes(preset)) return prev.filter((item) => item !== preset);
      if (prev.length >= 3) return prev;
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
      if (next.length === prev.length && next.every((preset, index) => preset === prev[index])) return prev;
      return next;
    });
  }, [quickFilterPresets, setQuickFilterVisiblePresets]);

  // --- Handlers ---
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

  const handlePlanSync = async () => {
    if (!tryConsumeFeature('feed')) return;
    await handleSync();
  };

  const handlePlanLoadMore = async () => {
    if (!tryConsumeFeature('feed')) return;
    await handleLoadMore();
  };

  const handlePlanSearch = async (event, isMore = false, overrideQuery = '') => {
    if (!isMore && !tryConsumeFeature('search')) return;
    return handleSearch(event, isMore, overrideQuery);
  };

  const handleBeforeGenerate = () => tryConsumeFeature('generate');
  const handleBeforeRegenerate = () => tryConsumeFeature('generate');

  const handleSaveGeneratedArticle = (title, content, meta) => {
    const newArt = {
      id: Date.now().toString(),
      type: 'article',
      title: title || 'บทความ AI',
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

  const openArticleReader = (item) => {
    setSelectedArticle(item);
  };

  const closeFilterModal = () => setFilterModal((prev) => ({ ...prev, show: false }));

  // --- Render ---
  const workspaceLoadingFallback = (
    <div className="animate-fade-in" style={{ padding: '56px 0', display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: '700' }}>
        <Loader2 size={16} className="animate-spin" />
        <span>Loading workspace...</span>
      </div>
    </div>
  );
  const showRightSidebar = activeView !== 'pricing';

  return (
    <div className={`foro-layout ${showRightSidebar ? '' : 'pricing-open'}`.trim()}>
      <Sidebar
        activeView={activeView}
        onNavClick={(view) => {
          startTransition(() => { setActiveView(view); });
        }}
        backgroundTasks={{
          syncing: loading,
          generating: isGeneratingContent,
          searching: isSearching,
          filtering: isFiltering,
          audienceSearch: aiSearchLoading
        }}
        activePlanId={activePlanId}
        plusAccess={plusAccess}
        planName={currentPlan.name}
        planPriceLabel={currentPlan.priceLabel}
        remainingUsage={remainingUsage}
        usageLimits={currentPlan.usage}
        dailyUsage={dailyUsage}
        onSwitchPlan={handleSwitchPlan}
        onResetUsage={handleResetUsage}
        onOpenPricing={openPricingView}
        planNotice={planNotice}
        onClearPlanNotice={() => setPlanNotice(null)}
      />

      {isMobilePostListOpen && (
        <div className="mobile-backdrop" onClick={() => setIsMobilePostListOpen(false)} />
      )}

      <main className="foro-main">
        <div className="foro-main-scroll">

          {activeView === 'home' && (
          <HomeView
            isVisible
            currentActiveList={currentActiveList}
            activeListId={activeListId}
            originalFeedLength={originalFeed.length}
            deletedFeedLength={deletedFeedCount}
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
            bookmarkIdSet={bookmarkIdSet}
            watchlistHandleSet={watchlistHandleSet}
            postLists={postLists}
            onOpenMobileList={() => setIsMobilePostListOpen(true)}
            onDeleteAll={handleDeleteAll}
            onUndo={handleUndo}
            onSort={handleSort}
            onQuickFilter={handleAiFilter}
            onOpenFilterModal={() => setFilterModal({ show: true, prompt: '' })}
            onSync={handlePlanSync}
            onLoadMore={handlePlanLoadMore}
            onClearAiFilter={clearAiFilter}
            onBookmark={handleBookmark}
            onArticleGen={openContentComposerFromPost}
            onReadArticle={openArticleReader}
            onSummaryCopied={() => setStatus('คัดลอกบทสรุปแล้ว')}
          />)}

          {activeView === 'content' && (
          <Suspense fallback={workspaceLoadingFallback}>
            <ContentWorkspace
              isVisible
              contentTab={contentTab}
              setContentTab={setContentTab}
              createContentSource={createContentSource}
              onRemoveSource={() => setCreateContentSource(null)}
              onSaveGeneratedArticle={handleSaveGeneratedArticle}
              onBeforeGenerate={handleBeforeGenerate}
              onBeforeRegenerate={handleBeforeRegenerate}
              isGeneratingContent={isGeneratingContent}
              setIsGeneratingContent={setIsGeneratingContent}
              genPhase={genPhase}
              setGenPhase={setGenPhase}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchMediaType={searchMediaType}
              setSearchMediaType={setSearchMediaType}
              activeSearchFocus={activeSearchFocus}
              applySearchFocus={applySearchFocus}
              dismissSearchChoices={dismissSearchChoices}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              activeSuggestionIndex={activeSuggestionIndex}
              setActiveSuggestionIndex={setActiveSuggestionIndex}
              handleSearch={handlePlanSearch}
              isLatestMode={isLatestMode}
              setIsLatestMode={setIsLatestMode}
              isSearching={isSearching}
              searchResults={searchResults}
              searchChoiceOptions={searchChoiceOptions}
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
              shouldShowSearchChoices={shouldShowSearchChoices}
              isSourcesExpanded={isSourcesExpanded}
              setIsSourcesExpanded={setIsSourcesExpanded}
              onArticleGen={openContentComposerFromPost}
              onReadArticle={openArticleReader}
            />
          </Suspense>)}

          {activeView === 'pricing' && (
          <Suspense fallback={workspaceLoadingFallback}>
            <PricingView
              isVisible
              activePlanId={activePlanId}
              dailyUsage={dailyUsage}
              remainingUsage={remainingUsage}
              onSelectPlan={handlePlanSelection}
              isCheckoutLoading={isStartingCheckout}
              onOpenContent={() => setActiveView('content')}
            />
          </Suspense>)}

          {activeView === 'read' && (
          <Suspense fallback={workspaceLoadingFallback}>
            <ReadWorkspace
              isVisible
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
              onReadArticle={openArticleReader}
            />
          </Suspense>)}

          {activeView === 'audience' && (
          <Suspense fallback={workspaceLoadingFallback}>
            <AudienceWorkspace
              isVisible
              audienceTab={audienceTab}
              setAudienceTab={setAudienceTab}
              aiQuery={aiQuery}
              setAiQuery={setAiQuery}
              handleAiSearchAudience={handleAiSearchAudience}
              aiSearchLoading={aiSearchLoading}
              aiSearchResults={aiSearchResults}
              setAiSearchResults={setAiSearchResults}
              hasSearchedAudience={hasSearchedAudience}
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
              subscribedSources={subscribedSources}
              onToggleSource={handleToggleSource}
            />
          </Suspense>)}

          {activeView === 'bookmarks' && (
          <Suspense fallback={workspaceLoadingFallback}>
            <BookmarksWorkspace
              isVisible
              currentActiveList={currentActiveList}
              activeListId={activeListId}
              setIsMobilePostListOpen={setIsMobilePostListOpen}
              bookmarkTab={bookmarkTab}
              setBookmarkTab={setBookmarkTab}
              filteredBookmarks={filteredBookmarks}
              handleBookmark={handleBookmark}
              onArticleGen={openContentComposerFromPost}
              onReadArticle={openArticleReader}
              setBookmarks={setBookmarks}
            />
          </Suspense>)}
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
      <ArticleReaderModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onArticleGen={openContentComposerFromPost}
      />
      {showRightSidebar && (
        <RightSidebar
          watchlist={watchlist} subscribedSources={subscribedSources} postLists={postLists} activeListId={activeListId}
          onSelectList={setActiveListId}
          onCreateList={handleCreateListRequest}
          onImportList={handleImportListRequest}
          onRemoveList={handleRemoveList} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}
          onUpdateList={handleUpdateList} onShareList={handleShareList} onRemoveAccount={handleRemoveAccountGlobal}
          isMobileOpen={isMobilePostListOpen} onCloseMobile={() => setIsMobilePostListOpen(false)}
          activePlanId={activePlanId}
          onOpenPricing={openPricingFromPostList}
          planNotice={planNotice}
        />
      )}
    </div>
  );
};

export default App;
