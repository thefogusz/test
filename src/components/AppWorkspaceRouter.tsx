// @ts-nocheck
import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import HomeView from './HomeView';
import { getSummaryDateLabel } from '../utils/summaryDates';

const AudienceWorkspace = lazy(() => import('./AudienceWorkspace'));
const BookmarksWorkspace = lazy(() => import('./BookmarksWorkspace'));
const ContentWorkspace = lazy(() => import('./ContentWorkspace'));
const PricingView = lazy(() => import('./PricingWorkspace'));
const ReadWorkspace = lazy(() => import('./ReadWorkspace'));

const AppWorkspaceRouter = ({
  activeView,
  activeListId,
  currentActiveList,
  originalFeed,
  deletedFeedCount,
  feed,
  freshFeedIds,
  activeFilterPrompt,
  isFiltered,
  activeFilters,
  visibleQuickPresets,
  isFilterPrimed,
  isFiltering,
  isLoadingMore,
  isSyncing,
  loading,
  pendingFeed,
  nextCursor,
  aiFilterBrief,
  aiFilterSummary,
  bookmarkIdSet,
  watchlistHandleSet,
  postLists,
  setIsMobilePostListOpen,
  handleDeleteAll,
  handleUndo,
  handleSort,
  handleAiFilter,
  setFilterModal,
  handlePlanSync,
  handlePlanLoadMore,
  clearAiFilter,
  handleBookmark,
  openContentComposerFromPost,
  openArticleReader,
  setStatus,
  contentTab,
  setContentTab,
  createContentSource,
  setCreateContentSource,
  handleSaveGeneratedArticle,
  handleBeforeGenerate,
  handleBeforeRegenerate,
  isGeneratingContent,
  setIsGeneratingContent,
  genPhase,
  setGenPhase,
  searchQuery,
  setSearchQuery,
  searchMediaType,
  setSearchMediaType,
  activeSearchFocus,
  applySearchFocus,
  dismissSearchChoices,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  activeSuggestionIndex,
  setActiveSuggestionIndex,
  handlePlanSearch,
  isLatestMode,
  setIsLatestMode,
  isSearching,
  searchResults,
  searchChoiceOptions,
  setSearchResults,
  setSearchOverflowResults,
  setSearchSummary,
  setSearchWebSources,
  setSearchCursor,
  shouldInlineSearchStatus,
  searchStatusMessage,
  lastSubmittedSearchQuery,
  searchPresets,
  canSaveCurrentSearchAsPreset,
  maxSearchPresets,
  addSearchPreset,
  isLiveSearching,
  dynamicSearchTags,
  handleAddSearchAuthorToWatchlist,
  handleToggleMemberInList,
  searchHistory,
  interestSeedLabels,
  removeSearchPreset,
  searchOverflowResults,
  searchCursor,
  searchSummary,
  searchWebSources,
  shouldShowSearchChoices,
  isSourcesExpanded,
  setIsSourcesExpanded,
  activePlanId,
  dailyUsage,
  remainingUsage,
  currentPlan,
  plusAccess,
  handlePlanSelection,
  isStartingCheckout,
  profileSectionEventName,
  readArchive,
  readSearchQuery,
  setReadSearchQuery,
  readSearchSuggestions,
  filteredReadArchive,
  readFilters,
  setReadFilters,
  visibleReadArchive,
  setVisibleReadCount,
  readArchiveRenderBatch,
  bookmarkIds,
  audienceTab,
  setAudienceTab,
  aiQuery,
  setAiQuery,
  handleAiSearchAudience,
  aiSearchLoading,
  aiSearchResults,
  aiSearchHasMore,
  setAiSearchResults,
  hasSearchedAudience,
  watchlist,
  handleAddExpert,
  manualQuery,
  setManualQuery,
  handleManualSearch,
  manualPreview,
  handleAddUser,
  handleRemoveAccountGlobal,
  subscribedSources,
  handleToggleSource,
  bookmarkTab,
  setBookmarkTab,
  filteredBookmarks,
  setBookmarks,
}) => {
  const workspaceLoadingFallback = (
    <div className="animate-fade-in" style={{ padding: '56px 0', display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--text-dim)',
          fontSize: '13px',
          fontWeight: '700',
        }}
      >
        <Loader2 size={16} className="animate-spin" />
        <span>Loading workspace...</span>
      </div>
    </div>
  );

  const aiFilterSummaryDateLabel = getSummaryDateLabel(feed, 8);

  return (
    <>
      {activeView === 'home' && (
        <HomeView
          isVisible
          currentActiveList={currentActiveList}
          activeListId={activeListId}
          originalFeedLength={originalFeed.length}
          deletedFeedLength={deletedFeedCount}
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
          loading={loading}
          pendingFeed={pendingFeed}
          nextCursor={nextCursor}
          aiFilterBrief={aiFilterBrief}
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
          onSummaryCopied={() => setStatus('คัดลอกผลลัพธ์จาก FORO Filter แล้ว')}
        />
      )}

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
        </Suspense>
      )}

      {activeView === 'pricing' && (
        <Suspense fallback={workspaceLoadingFallback}>
          <PricingView
            isVisible
            activePlanId={activePlanId}
            dailyUsage={dailyUsage}
            remainingUsage={remainingUsage}
            usageLimits={currentPlan.usage}
            plusAccess={plusAccess}
            onSelectPlan={handlePlanSelection}
            isCheckoutLoading={isStartingCheckout}
            profileSectionEventName={profileSectionEventName}
          />
        </Suspense>
      )}

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
            readArchiveRenderBatch={readArchiveRenderBatch}
            bookmarkIds={bookmarkIds}
            handleBookmark={handleBookmark}
            onArticleGen={openContentComposerFromPost}
            onReadArticle={openArticleReader}
          />
        </Suspense>
      )}

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
            aiSearchHasMore={aiSearchHasMore}
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
        </Suspense>
      )}

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
        </Suspense>
      )}
    </>
  );
};

export default AppWorkspaceRouter;
