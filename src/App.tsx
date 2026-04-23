// @ts-nocheck
import { startTransition } from 'react';
import {
  READ_ARCHIVE_INITIAL_RENDER,
} from './app/constants';
import {
  useSanitizeStoredState,
  useStatusAutoClear,
  useStorageReset,
} from './app/hooks/useAppEffects';
import { useAppLibraryState } from './app/hooks/useAppLibraryState';
import { useAppShellState } from './app/hooks/useAppShellState';
import { createWorkspaceRouterProps } from './app/workspaceRouterProps';
import { useSubscribedSources } from './app/hooks/useSubscribedSources';
import AiFilterModal from './components/AiFilterModal';
import AppWorkspaceRouter from './components/AppWorkspaceRouter';
import ArticleReaderModal from './components/ArticleReaderModal';
import ListModal from './components/ListModal';
import RightSidebar from './components/RightSidebar';
import Sidebar from './components/Sidebar';
import StatusToast from './components/StatusToast';
import { useBilling } from './hooks/useBilling';
import { useHomeFeedWorkspace } from './hooks/useHomeFeedWorkspace';
import useLibraryViews from './hooks/useLibraryViews';
import { usePostLists } from './hooks/usePostLists';
import { useQuickFilterPresets } from './hooks/useQuickFilterPresets';
import useSearchSuggestions from './hooks/useSearchSuggestions';
import { useSearchWorkspace } from './hooks/useSearchWorkspace';
import { useUiHistoryState } from './hooks/useUiHistoryState';
import { useAudienceSearch } from './hooks/useAudienceSearch';
import { useWatchlist } from './hooks/useWatchlist';
import './index.css';

const App = () => {
  const {
    status,
    setStatus,
    activeView,
    setActiveView,
    contentTab,
    setContentTab,
    setMobileProfileSection,
    mainScrollRef,
    scrollMainToTop,
  } = useAppShellState();

  const {
    originalFeed,
    setOriginalFeed,
    pendingFeed,
    setPendingFeed,
    bookmarks,
    setBookmarks,
    bookmarkTab,
    setBookmarkTab,
    selectedArticle,
    setSelectedArticle,
    bookmarkIdSet,
    readArchive,
    setReadArchive,
    readSearchQuery,
    setReadSearchQuery,
    deferredReadSearchQuery,
    visibleReadCount,
    setVisibleReadCount,
    createContentSource,
    setCreateContentSource,
    filterModal,
    setFilterModal,
    readFilters,
    setReadFilters,
    isGeneratingContent,
    setIsGeneratingContent,
    genPhase,
    setGenPhase,
    handleBookmark,
    handleSaveGeneratedArticle,
  } = useAppLibraryState();

  useStorageReset({ setStatus });

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

  const { subscribedSources, setSubscribedSources, handleToggleSource } = useSubscribedSources();

  const {
    postLists,
    activeListId,
    setActiveListId,
    currentActiveList,
    postListWarnings,
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

  const handleRemoveAccountGlobal = (id) => {
    removeAccountFromWatchlist(id);
    handleRemoveAccountFromLists(id);
  };

  const {
    audienceTab,
    setAudienceTab,
    aiQuery,
    setAiQuery,
    aiSearchLoading,
    aiSearchError,
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
    watchlistHandleSet,
    hasWatchlistRoomFor,
    handleAddUser: addUserToWatchlist,
  });

  const {
    quickFilterPresets,
    quickFilterVisiblePresets,
    visibleQuickPresets,
    addQuickPreset,
    removeQuickPreset,
    toggleQuickPresetVisibility,
  } = useQuickFilterPresets();

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
    isFeedHistoryHydrated,
    isFiltered,
    isFilterPrimed,
    isFiltering,
    isLoadingMore,
    isSyncing,
    loading,
    canLoadMoreFeed,
    visibleFeedTotalCount,
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

  useUiHistoryState({
    activeView,
    setActiveView,
    setMobileProfileSection,
    contentTab,
    setContentTab,
    isMobilePostListOpen,
    setIsMobilePostListOpen,
    filterModal,
    setFilterModal,
    selectedArticle,
    setSelectedArticle,
  });

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

  useStatusAutoClear({
    activeView,
    contentTab,
    isSearching,
    searchResultsCount: searchResults.length,
    searchSummary,
    setStatus,
    status,
  });

  useSanitizeStoredState({
    setBookmarks,
    setCreateContentSource,
    setOriginalFeed,
    setPendingFeed,
    setReadArchive,
  });

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
    if (!isFeedHistoryHydrated) {
      setStatus('กำลังโหลดประวัติฟีด... รอสักครู่แล้วลองอีกครั้ง');
      return;
    }
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
  const workspaceRouterProps = createWorkspaceRouterProps({
    activeListId,
    activePlanId,
    activeSearchFocus,
    activeSuggestionIndex,
    activeFilterPrompt,
    activeFilters,
    aiFilterBrief,
    aiFilterSummary,
    aiQuery,
    aiSearchError,
    aiSearchHasMore,
    aiSearchLoading,
    aiSearchResults,
    audienceTab,
    addSearchPreset,
    applySearchFocus,
    bookmarkIds,
    bookmarkIdSet,
    bookmarks,
    bookmarkTab,
    canLoadMoreFeed,
    canSaveCurrentSearchAsPreset,
    clearAiFilter,
    contentTab,
    createContentSource,
    currentActiveList,
    currentPlan,
    dailyUsage,
    deletedFeedCount,
    dismissSearchChoices,
    dynamicSearchTags,
    feed,
    filteredBookmarks,
    filteredReadArchive,
    freshFeedIds,
    genPhase,
    handleAddExpert,
    handleAddSearchAuthorToWatchlist,
    handleAddUser,
    handleAiFilter,
    handleAiSearchAudience,
    handleBeforeGenerate,
    handleBeforeRegenerate,
    handleBookmark,
    handleDeleteAll,
    handleLoadMore,
    handleManualSearch,
    handlePlanLoadMore,
    handlePlanSearch,
    handlePlanSelection,
    handlePlanSync,
    handleRemoveAccountGlobal,
    handleSaveGeneratedArticle,
    handleSort,
    handleToggleMemberInList,
    handleToggleSource,
    handleUndo,
    hasReachedFeedCardLimit,
    hasSearchedAudience,
    homeFeedCardLimit,
    interestSeedLabels,
    isFiltered,
    isFilterPrimed,
    isFiltering,
    isFeedHistoryHydrated,
    isGeneratingContent,
    isLatestMode,
    isLiveSearching,
    isLoadingMore,
    isSearching,
    isSourcesExpanded,
    isStartingCheckout,
    isSyncing,
    lastSubmittedSearchQuery,
    loading,
    manualPreview,
    manualQuery,
    maxSearchPresets,
    openArticleReader,
    openContentComposerFromPost,
    originalFeed,
    plusAccess,
    postLists,
    quickFilterVisiblePresets,
    readArchive,
    readFilters,
    readSearchQuery,
    readSearchSuggestions,
    remainingUsage,
    removeSearchPreset,
    searchChoiceOptions,
    searchCursor,
    searchHistory,
    searchMediaType,
    searchOverflowResults,
    searchPresets,
    searchQuery,
    searchResults,
    searchStatusMessage,
    searchSummary,
    searchWebSources,
    setActiveSuggestionIndex,
    setActiveView,
    setAiQuery,
    setAiSearchResults,
    setAudienceTab,
    setBookmarkTab,
    setBookmarks,
    setContentTab,
    setCreateContentSource,
    setFilterModal,
    setGenPhase,
    setIsGeneratingContent,
    setIsLatestMode,
    setIsMobilePostListOpen,
    setIsSourcesExpanded,
    setManualQuery,
    setMobileProfileSection,
    setReadFilters,
    setReadSearchQuery,
    setSearchCursor,
    setSearchMediaType,
    setSearchOverflowResults,
    setSearchQuery,
    setSearchResults,
    setSearchSummary,
    setSearchWebSources,
    setShowSuggestions,
    setStatus,
    setVisibleReadCount,
    shouldInlineSearchStatus,
    shouldShowSearchChoices,
    showSuggestions,
    subscribedSources,
    suggestions,
    visibleQuickPresets,
    visibleReadArchive,
    visibleFeedTotalCount,
    watchlist,
    watchlistHandleSet,
  });

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
          audienceSearch: aiSearchLoading,
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
          <AppWorkspaceRouter activeView={activeView} {...workspaceRouterProps} />
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
        visibleQuickPresets={quickFilterVisiblePresets}
        onClose={closeFilterModal}
        onPromptChange={(value) => setFilterModal((prev) => ({ ...prev, prompt: value }))}
        onSelectPreset={(preset) => {
          setFilterModal((prev) => ({ ...prev, prompt: preset }));
        }}
        onTogglePresetVisibility={toggleQuickPresetVisibility}
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
          watchlist={watchlist}
          subscribedSources={subscribedSources}
          postLists={postLists}
          postListWarnings={postListWarnings}
          activeListId={activeListId}
          onSelectList={setActiveListId}
          onCreateList={handleCreateListRequest}
          onImportList={handleImportListRequest}
          onRemoveList={handleRemoveList}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onUpdateList={handleUpdateList}
          onShareList={handleShareList}
          onRemoveAccount={handleRemoveAccountGlobal}
          isMobileOpen={isMobilePostListOpen}
          onCloseMobile={() => setIsMobilePostListOpen(false)}
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
