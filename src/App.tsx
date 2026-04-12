// @ts-nocheck
import React, { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import AiFilterModal from './components/AiFilterModal';
import ArticleReaderModal from './components/ArticleReaderModal';
import AppWorkspaceRouter from './components/AppWorkspaceRouter';
import ListModal from './components/ListModal';
import Sidebar from './components/Sidebar';
import StatusToast from './components/StatusToast';
import RightSidebar from './components/RightSidebar';
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

const READ_ARCHIVE_INITIAL_RENDER = 24;
const READ_ARCHIVE_RENDER_BATCH = 24;

const shouldRemoveWhenFalsy = (value) => !value;
const STORAGE_RESET_QUERY_PARAM = 'reset';
const FORO_STORAGE_KEY_PREFIX = 'foro_';
const PROFILE_SECTION_EVENT = 'foro:profile-section';
const UI_HISTORY_STATE_KEY = 'foroUiState';
const UI_HISTORY_CONTROLLED_KEY = 'foroUiControlled';

const dispatchProfileSectionChange = (section: 'details' | 'pricing' | 'audience') => {
  if (typeof window === 'undefined') return;

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(PROFILE_SECTION_EVENT, { detail: section }));
  }, 0);
};

const buildUiHistorySignature = ({
  activeView,
  contentTab,
  isMobilePostListOpen,
  isFilterModalOpen,
  filterPrompt,
  selectedArticleId,
}: {
  activeView: string;
  contentTab: string;
  isMobilePostListOpen: boolean;
  isFilterModalOpen: boolean;
  filterPrompt: string;
  selectedArticleId: string | null;
}) =>
  JSON.stringify({
    activeView,
    contentTab,
    isMobilePostListOpen,
    isFilterModalOpen,
    filterPrompt,
    selectedArticleId,
  });

const App = () => {
  const [status, setStatus] = useState('');
  const [activeView, setActiveView] = usePersistentState(STORAGE_KEYS.activeView, 'home');
  const [contentTab, setContentTab] = usePersistentState(STORAGE_KEYS.contentTab, 'search');
  const [, setMobileProfileSection] = useState<'details' | 'pricing' | 'audience'>('details');
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollMainToTop = () => {
    window.setTimeout(() => {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, 0);
  };

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
    aiSearchHasMore,
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
  const hasInitializedUiHistoryRef = useRef(false);
  const isApplyingUiHistoryRef = useRef(false);
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
  const [readFilters, setReadFilters] = useState({ view: false, engagement: false });
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [genPhase, setGenPhase] = useState('idle');

  const uiHistorySnapshot = useMemo(() => ({
    activeView,
    contentTab,
    isMobilePostListOpen,
    filterModal,
    selectedArticle,
  }), [activeView, contentTab, filterModal, isMobilePostListOpen, selectedArticle]);

  const uiHistorySignature = useMemo(
    () =>
      buildUiHistorySignature({
        activeView,
        contentTab,
        isMobilePostListOpen,
        isFilterModalOpen: Boolean(filterModal?.show),
        filterPrompt: String(filterModal?.prompt || ''),
        selectedArticleId: selectedArticle?.id ? String(selectedArticle.id) : null,
      }),
    [activeView, contentTab, filterModal, isMobilePostListOpen, selectedArticle],
  );

  // --- Composed Hooks ---
  const {
    activeFilters,
    activeFilterPrompt,
    aiFilterBrief,
    aiFilterSummary,
    applyAiFilter,
    clearAiFilter,
    deletedFeedCount,
    feed,
    freshFeedIds,
    handleDeleteAll,
    handleLoadMore,
    handleSort,
    handleSync,
    handleUndo,
    hasReachedFeedCardLimit,
    homeFeedCardLimit,
    isFiltered,
    isFilterPrimed,
    isFiltering,
    isLoadingMore,
    isSyncing,
    loading,
    nextCursor,
  } = useHomeFeedWorkspace({
    activePlanId,
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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const applyUiHistorySnapshot = (snapshot) => {
      if (!snapshot || typeof snapshot !== 'object') return;

      startTransition(() => {
        if (snapshot.activeView) {
          setActiveView(snapshot.activeView);
          if (snapshot.activeView === 'pricing') {
            setMobileProfileSection('details');
          }
        }

        if (snapshot.contentTab) {
          setContentTab(snapshot.contentTab);
        }

        setIsMobilePostListOpen(Boolean(snapshot.isMobilePostListOpen));
        setFilterModal(snapshot.filterModal && typeof snapshot.filterModal === 'object'
          ? snapshot.filterModal
          : { show: false, prompt: '' });
        setSelectedArticle(snapshot.selectedArticle ?? null);
      });
    };

    const currentState = window.history.state || {};
    const existingSnapshot = currentState?.[UI_HISTORY_STATE_KEY];

    if (existingSnapshot) {
      isApplyingUiHistoryRef.current = true;
      applyUiHistorySnapshot(existingSnapshot);
    }

    window.history.replaceState(
      {
        ...currentState,
        [UI_HISTORY_CONTROLLED_KEY]: true,
        [UI_HISTORY_STATE_KEY]: existingSnapshot || uiHistorySnapshot,
      },
      '',
      window.location.href,
    );
    hasInitializedUiHistoryRef.current = true;

    const handlePopState = (event) => {
      const nextSnapshot = event.state?.[UI_HISTORY_STATE_KEY];
      if (!nextSnapshot) return;

      isApplyingUiHistoryRef.current = true;
      applyUiHistorySnapshot(nextSnapshot);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasInitializedUiHistoryRef.current) return;

    const currentState = window.history.state || {};
    const currentSnapshot = currentState?.[UI_HISTORY_STATE_KEY];
    const currentSignature = buildUiHistorySignature({
      activeView: currentSnapshot?.activeView || 'home',
      contentTab: currentSnapshot?.contentTab || 'search',
      isMobilePostListOpen: Boolean(currentSnapshot?.isMobilePostListOpen),
      isFilterModalOpen: Boolean(currentSnapshot?.filterModal?.show),
      filterPrompt: String(currentSnapshot?.filterModal?.prompt || ''),
      selectedArticleId: currentSnapshot?.selectedArticle?.id
        ? String(currentSnapshot.selectedArticle.id)
        : null,
    });

    const nextState = {
      ...currentState,
      [UI_HISTORY_CONTROLLED_KEY]: true,
      [UI_HISTORY_STATE_KEY]: uiHistorySnapshot,
    };

    if (isApplyingUiHistoryRef.current) {
      isApplyingUiHistoryRef.current = false;
      window.history.replaceState(nextState, '', window.location.href);
      return;
    }

    if (currentSignature === uiHistorySignature) {
      window.history.replaceState(nextState, '', window.location.href);
      return;
    }

    window.history.pushState(nextState, '', window.location.href);
  }, [uiHistorySignature, uiHistorySnapshot]);

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
  const promoteQuickPreset = (preset) => {
    const trimmed = String(preset || '').trim();
    if (!trimmed) return;

    setQuickFilterPresets((prev) => {
      const next = Array.isArray(prev) ? prev.filter((item) => item !== trimmed) : [];
      return [trimmed, ...next];
    });
  };

  const removeQuickPreset = (preset) => {
    setQuickFilterPresets(prev => prev.filter(p => p !== preset));
  };

  const addQuickPreset = (preset) => {
    const trimmed = preset.trim();
    if (!trimmed) return;
    promoteQuickPreset(trimmed);
  };

  const visibleQuickPresets = useMemo(
    () => quickFilterPresets.slice(0, 3),
    [quickFilterPresets],
  );

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
    setContentTab('create');
    setActiveView('content');
    scrollMainToTop();
  };

  const openArticleReader = (item) => {
    setSelectedArticle(item);
  };

  const closeFilterModal = () => setFilterModal((prev) => ({ ...prev, show: false }));

  const showRightSidebar = activeView !== 'pricing';

  return (
    <div className={`foro-layout ${showRightSidebar ? '' : 'pricing-open'}`.trim()}>
      <Sidebar
        activeView={activeView}
        onNavClick={(view) => {
          startTransition(() => {
            setActiveView(view);
            if (view === 'pricing') {
              setMobileProfileSection('details');
            }
          });
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
        onOpenPricing={openPricingView}
        planNotice={planNotice}
        onClearPlanNotice={() => setPlanNotice(null)}
        postLists={postLists}
        currentActiveList={currentActiveList}
        onOpenMobilePostList={() => setIsMobilePostListOpen(true)}
        onOpenMobileFeed={async () => {
          setIsMobilePostListOpen(false);
          setActiveView('home');
          await handlePlanSync();
        }}
        onOpenMobileFilter={() => setFilterModal({ show: true, prompt: '' })}
        isHomeFilterActive={isFilterPrimed || isFiltering || isFiltered}
        contentTab={contentTab}
        onOpenMobileSearch={() => {
          setActiveView('content');
          setContentTab('search');
          scrollMainToTop();
        }}
        onOpenMobileCreate={() => {
          setActiveView('content');
          setContentTab('create');
          scrollMainToTop();
        }}
        onOpenMobileRead={() => setActiveView('read')}
        onOpenMobileBookmarks={() => setActiveView('bookmarks')}
      />

      {isMobilePostListOpen && (
        <div className="mobile-backdrop" onClick={() => setIsMobilePostListOpen(false)} />
      )}

      <main className="foro-main">
        <div className="foro-main-scroll" ref={mainScrollRef}>
          <AppWorkspaceRouter
            activeView={activeView}
            activeListId={activeListId}
            currentActiveList={currentActiveList}
            originalFeed={originalFeed}
            deletedFeedCount={deletedFeedCount}
            feed={feed}
            freshFeedIds={freshFeedIds}
            activeFilterPrompt={activeFilterPrompt}
            isFiltered={isFiltered}
            activeFilters={activeFilters}
            visibleQuickPresets={visibleQuickPresets}
            isFilterPrimed={isFilterPrimed}
            isFiltering={isFiltering}
            isLoadingMore={isLoadingMore}
            isSyncing={isSyncing}
            hasReachedFeedCardLimit={hasReachedFeedCardLimit}
            homeFeedCardLimit={homeFeedCardLimit}
            loading={loading}
            pendingFeed={pendingFeed}
            nextCursor={nextCursor}
            aiFilterBrief={aiFilterBrief}
            aiFilterSummary={aiFilterSummary}
            bookmarkIdSet={bookmarkIdSet}
            watchlistHandleSet={watchlistHandleSet}
            postLists={postLists}
            setIsMobilePostListOpen={setIsMobilePostListOpen}
            handleDeleteAll={handleDeleteAll}
            handleUndo={handleUndo}
            handleSort={handleSort}
            handleAiFilter={handleAiFilter}
            setFilterModal={setFilterModal}
            handlePlanSync={handlePlanSync}
            handlePlanLoadMore={handlePlanLoadMore}
            clearAiFilter={clearAiFilter}
            handleBookmark={handleBookmark}
            openContentComposerFromPost={openContentComposerFromPost}
            openArticleReader={openArticleReader}
            setStatus={setStatus}
            contentTab={contentTab}
            setContentTab={setContentTab}
            createContentSource={createContentSource}
            setCreateContentSource={setCreateContentSource}
            handleSaveGeneratedArticle={handleSaveGeneratedArticle}
            handleBeforeGenerate={handleBeforeGenerate}
            handleBeforeRegenerate={handleBeforeRegenerate}
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
            handlePlanSearch={handlePlanSearch}
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
            shouldInlineSearchStatus={shouldInlineSearchStatus}
            searchStatusMessage={searchStatusMessage}
            lastSubmittedSearchQuery={lastSubmittedSearchQuery}
            searchPresets={searchPresets}
            canSaveCurrentSearchAsPreset={canSaveCurrentSearchAsPreset}
            maxSearchPresets={maxSearchPresets}
            addSearchPreset={addSearchPreset}
            isLiveSearching={isLiveSearching}
            dynamicSearchTags={dynamicSearchTags}
            handleAddSearchAuthorToWatchlist={handleAddSearchAuthorToWatchlist}
            handleToggleMemberInList={handleToggleMemberInList}
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
            activePlanId={activePlanId}
            onOpenPricing={openPricingView}
            dailyUsage={dailyUsage}
            remainingUsage={remainingUsage}
            currentPlan={currentPlan}
            plusAccess={plusAccess}
            handlePlanSelection={handlePlanSelection}
            isStartingCheckout={isStartingCheckout}
            profileSectionEventName={PROFILE_SECTION_EVENT}
            onOpenMobileProfileDetails={() => {
              setMobileProfileSection('details');
              setActiveView('pricing');
              dispatchProfileSectionChange('details');
            }}
            onOpenMobileAudience={() => {
              setActiveView('audience');
            }}
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
            audienceTab={audienceTab}
            setAudienceTab={setAudienceTab}
            aiQuery={aiQuery}
            setAiQuery={setAiQuery}
            handleAiSearchAudience={handleAiSearchAudience}
            aiSearchLoading={aiSearchLoading}
            aiSearchResults={aiSearchResults}
            aiSearchHasMore={aiSearchHasMore}
            setAiSearchResults={setAiSearchResults}
            hasSearchedAudience={hasSearchedAudience}
            watchlist={watchlist}
            handleAddExpert={handleAddExpert}
            manualQuery={manualQuery}
            setManualQuery={setManualQuery}
            handleManualSearch={handleManualSearch}
            manualPreview={manualPreview}
            handleAddUser={handleAddUser}
            handleRemoveAccountGlobal={handleRemoveAccountGlobal}
            subscribedSources={subscribedSources}
            handleToggleSource={handleToggleSource}
            bookmarkTab={bookmarkTab}
            setBookmarkTab={setBookmarkTab}
            filteredBookmarks={filteredBookmarks}
            setBookmarks={setBookmarks}
          />
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
        onClose={closeFilterModal}
        onPromptChange={(value) => setFilterModal((prev) => ({ ...prev, prompt: value }))}
        onSelectPreset={(preset) => {
          setFilterModal((prev) => ({ ...prev, prompt: preset }));
          promoteQuickPreset(preset);
        }}
        onRemovePreset={removeQuickPreset}
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
          onOpenAudience={() => {
            setIsMobilePostListOpen(false);
            setActiveView('audience');
          }}
          activePlanId={activePlanId}
          onOpenPricing={openPricingFromPostList}
          planNotice={planNotice}
        />
      )}
    </div>
  );
};

export default App;
