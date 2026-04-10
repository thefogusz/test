// @ts-nocheck
import React from 'react';
import {
  Activity,
  Copy,
  Crown,
  ExternalLink,
  FileText,
  Link,
  Loader2,
  BookmarkPlus,
  RefreshCw,
  RefreshCcw,
  Search,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import { AI_WORKSPACES } from '../config/aiWorkspaces';
import { cleanMarkdownForClipboard, normalizeSummaryMarkdown, renderMarkdownToHtml } from '../utils/markdown';
import { getSummaryDateLabel } from '../utils/summaryDates';
import ContentErrorBoundary from './ContentErrorBoundary';
import ContentTabSwitcher from './ContentTabSwitcher';
import CreateContent from './CreateContent';
import FeedCard from './FeedCard';
import SearchInlineStatus from './SearchInlineStatus';

const ContentWorkspace = ({
  isVisible,
  contentTab,
  setContentTab,
  createContentSource,
  onRemoveSource,
  onSaveGeneratedArticle,
  onBeforeGenerate,
  onBeforeRegenerate,
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
  handleSearch,
  isLatestMode,
  setIsLatestMode,
  isSearching,
  searchResults,
  setSearchResults,
  setSearchOverflowResults,
  setSearchSummary,
  setSearchWebSources,
  setSearchCursor,
  setStatus,
  shouldInlineSearchStatus,
  searchStatusMessage,
  lastSubmittedSearchQuery,
  searchPresets,
  canSaveCurrentSearchAsPreset,
  maxSearchPresets: _maxSearchPresets,
  addSearchPreset,
  isLiveSearching,
  dynamicSearchTags,
  watchlistHandleSet,
  postLists,
  onAddAuthorToWatchlist,
  onToggleAuthorInPostList,
  searchHistory,
  interestSeedLabels,
  removeSearchPreset,
  searchOverflowResults,
  searchCursor,
  searchChoiceOptions,
  searchSummary,
  searchWebSources,
  shouldShowSearchChoices,
  isSourcesExpanded,
  setIsSourcesExpanded,
  onArticleGen,
  onReadArticle,
  activePlanId,
  onOpenPricing,
}) => {
  const createLocked = activePlanId === 'free';
  const summaryDateLabel = getSummaryDateLabel(searchResults, 10);
  const summaryTrustLabel = isLatestMode
    ? 'สรุปโดย FORO อ้างอิงจากข้อมูลล่าสุดใน 24-48 ชั่วโมงที่ผ่านมา'
    : 'สรุปโดย FORO อ้างอิงจากผลการค้นหาและสัญญาณสำคัญที่เกี่ยวข้อง';
  const normalizedCurrentSearchQuery = (searchQuery || '').trim().replace(/\s+/g, ' ');
  const shouldShowEmptySearchState =
    Boolean(normalizedCurrentSearchQuery) &&
    normalizedCurrentSearchQuery.toLowerCase() === (lastSubmittedSearchQuery || '').toLowerCase() &&
    searchResults.length === 0 &&
    !isSearching;
  const summarySafe = searchSummary || '';
  const webSourcesWithCitationIds = (searchWebSources || []).map((src, index) => ({
    ...src,
    citation_id: src.citation_id || `[W${index + 1}]`,
  }));
  const summaryWebCitationIds = Array.from(
    new Set((summarySafe.match(/\[W\d{1,2}\]/g) || []).map((token) => token.replaceAll('[', '').replaceAll(']', ''))),
  );
  const referencedWebSources = webSourcesWithCitationIds.filter((src) =>
    summaryWebCitationIds.includes(String(src.citation_id || '').replaceAll('[', '').replaceAll(']', '')),
  );
  const shouldCenterSearchDiscovery =
    contentTab === 'search' &&
    !isSearching &&
    !searchResults.length &&
    !searchOverflowResults.length &&
    !lastSubmittedSearchQuery &&
    !(searchQuery || '').trim();
  const handleLockedCreateClick = () => {
    onOpenPricing?.();
  };

  return (
    <div className="unified-content-view animate-fade-in" style={{ display: isVisible ? 'block' : 'none' }}>
      <ContentTabSwitcher
        contentTab={contentTab}
        setContentTab={setContentTab}
        disableCreate={createLocked}
        onLockedCreateClick={handleLockedCreateClick}
      />

      {contentTab === 'create' && (
        <div className="animate-fade-in">
          {createLocked ? (
            <section className="create-content-premium-gate">
              <div className="create-content-premium-shell">
                <div className="create-content-premium-copy">
                  <div className="create-content-eyebrow">
                    <Crown size={14} />
                    Plus only
                  </div>
                  <h2 className="create-content-premium-title">Generate Studio</h2>
                  <p className="create-content-premium-subtitle">
                    โหมดนี้ไม่ใช่แค่เขียนโพสต์ แต่เป็น workflow สร้างคอนเทนต์แบบเต็มระบบของ Foro
                    ที่ตีความโจทย์, หาข้อมูล, เช็ก fact, สร้าง brief, เขียน draft และตรวจงานให้อีกชั้น
                  </p>
                </div>

                <div className="create-content-premium-grid">
                  <div className="create-content-premium-card">
                    <div className="create-content-premium-card-label">What happens inside</div>
                    <ul className="create-content-premium-list">
                      <li>ตีความโจทย์และเลือก angle ที่ควรเล่า</li>
                      <li>ดึง source เพิ่มจาก X และเว็บเมื่อจำเป็น</li>
                      <li>ประกอบ fact sheet เพื่อลด hallucination</li>
                      <li>สร้าง content brief ก่อนส่งเข้า writer</li>
                      <li>เขียน draft และมี review pass ในงานที่ต้องละเอียด</li>
                    </ul>
                  </div>

                  <div className="create-content-premium-card accent">
                    <div className="create-content-premium-card-label">Why it feels premium</div>
                    <ul className="create-content-premium-list">
                      <li>ใช้ Generate ได้ 3 ครั้งต่อวันในแพ็ก Plus</li>
                      <li>รองรับโจทย์ที่มี URL ข่าว, X post, ภาพ และวิดีโอ</li>
                      <li>เหมาะกับงานที่ต้องการทั้งความเร็วและความน่าเชื่อถือ</li>
                    </ul>
                    <button className="btn-pill primary create-content-premium-cta" onClick={handleLockedCreateClick}>
                      <Crown size={16} />
                      อัปเกรดเป็น Plus
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <ContentErrorBoundary key={createContentSource?.id ?? 'no-source'}>
              <CreateContent
                sourceNode={createContentSource}
                onRemoveSource={onRemoveSource}
                onSaveArticle={onSaveGeneratedArticle}
                onBeforeGenerate={onBeforeGenerate}
                onBeforeRegenerate={onBeforeRegenerate}
                isGenerating={isGeneratingContent}
                setIsGenerating={setIsGeneratingContent}
                phase={genPhase}
                setPhase={setGenPhase}
                contentTab={contentTab}
                setContentTab={setContentTab}
              />
            </ContentErrorBoundary>
          )}
        </div>
      )}

      {contentTab === 'search' && (
        <div
          className={`search-discovery-view animate-fade-in ${
            shouldCenterSearchDiscovery ? 'search-discovery-view-centered' : ''
          }`.trim()}
        >
          <div className="hero-search-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 className="hero-search-title">{'\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e04\u0e2d\u0e19\u0e40\u0e17\u0e19\u0e15\u0e4c'}</h1>
                <p className="hero-search-subtitle">{'\u0e2a\u0e33\u0e23\u0e27\u0e08\u0e40\u0e17\u0e23\u0e19\u0e14\u0e4c\u0e41\u0e25\u0e30\u0e40\u0e08\u0e32\u0e30\u0e25\u0e36\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e08\u0e32\u0e01\u0e17\u0e31\u0e48\u0e27\u0e42\u0e25\u0e01'}</p>
              </div>
            </div>
            <ContentTabSwitcher
              contentTab={contentTab}
              setContentTab={setContentTab}
              className="content-view-tabs-mobile-inline"
              disableCreate={createLocked}
              onLockedCreateClick={handleLockedCreateClick}
            />
            <ContentErrorBoundary key="search-form-boundary">
              <div className="hero-search-wrapper">
                <div className="hero-search-form" style={{ width: '100%' }}>
                  <Search size={20} className="hero-search-icon" />
                  <input
                    type="text"
                    className="hero-search-input"
                    placeholder={'\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e04\u0e35\u0e22\u0e4c\u0e40\u0e27\u0e34\u0e23\u0e4c\u0e14...'}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                      setActiveSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        setActiveSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        setActiveSuggestionIndex((prev) => Math.max(prev - 1, -1));
                      } else if (e.key === 'Enter') {
                        if (activeSuggestionIndex >= 0) {
                          const selectedSuggestion = suggestions[activeSuggestionIndex];
                          setSearchQuery(selectedSuggestion);
                          handleSearch(null, false, selectedSuggestion);
                          setShowSuggestions(false);
                        } else if (!e.nativeEvent.isComposing) {
                          handleSearch(e);
                          setShowSuggestions(false);
                        }
                      }
                    }}
                  />
                  <div className="hero-search-actions">
                    <button
                      type="button"
                      onClick={() => setIsLatestMode(!isLatestMode)}
                      className={`zap-toggle-btn ${isLatestMode ? 'active' : ''}`}
                      title={'\u0e04\u0e2d\u0e19\u0e40\u0e17\u0e19\u0e15\u0e4c\u0e43\u0e2b\u0e21\u0e48'}
                    >
                      <Zap size={18} fill={isLatestMode ? 'currentColor' : 'none'} />
                    </button>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                        }}
                        className="hero-clear-btn"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="hero-submit-btn"
                      onClick={(e) => {
                        handleSearch(e);
                        setShowSuggestions(false);
                      }}
                      disabled={isSearching}
                    >
                      {isSearching ? <Loader2 size={18} className="animate-spin" /> : <span className="btn-text">{'\u0e04\u0e49\u0e19\u0e2b\u0e32'}</span>}
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginTop: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'ทั้งหมด' },
                      { id: 'videos', label: 'วิดีโอ' },
                    ].map((option) => {
                      const isActive = searchMediaType === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSearchMediaType(option.id)}
                          className={`btn-mini-ghost ${isActive ? 'active' : ''}`}
                          style={{
                            background: isActive ? 'rgba(96, 165, 250, 0.18)' : 'transparent',
                            borderColor: isActive ? 'rgba(96, 165, 250, 0.45)' : 'rgba(255,255,255,0.08)',
                            color: isActive ? '#bfdbfe' : 'var(--text-dim)',
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {searchResults.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          setSearchOverflowResults([]);
                          setSearchSummary('');
                          setSearchWebSources([]);
                          setSearchCursor(null);
                          setStatus('\u0e25\u0e49\u0e32\u0e07\u0e1c\u0e25\u0e25\u0e31\u0e1e\u0e18\u0e4c\u0e41\u0e25\u0e49\u0e27');
                        }}
                        className="btn-mini-ghost"
                        style={{ color: 'var(--text-dim)', background: 'transparent' }}
                      >
                        <RefreshCcw size={14} /> {'\u0e25\u0e49\u0e32\u0e07\u0e1c\u0e25\u0e25\u0e31\u0e1e\u0e18\u0e4c'}
                      </button>
                    )}

                    {canSaveCurrentSearchAsPreset && (
                      <button
                        type="button"
                        className="search-preset-save-btn"
                        onClick={() => addSearchPreset(searchQuery)}
                        style={{ marginTop: 0 }}
                      >
                        <BookmarkPlus size={14} /> {'\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e40\u0e1b\u0e47\u0e19 Preset'}
                      </button>
                    )}
                  </div>
                </div>
                {shouldInlineSearchStatus && !isSearching && (
                  <SearchInlineStatus
                    badge={isSearching ? AI_WORKSPACES.langGraph.role : AI_WORKSPACES.langChain.role}
                    message={searchStatusMessage}
                    hint={
                      isSearching
                        ? 'Broad searches may take around 10-30 seconds while the system expands sources and ranks signal quality.'
                        : 'Results are ready. The summary is still being refined in the background.'
                    }
                    loading={isSearching}
                  />
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="search-suggestions-dropdown">
                    {suggestions.map((item, idx) => {
                      if (typeof item !== 'string') return null;
                      return (
                        <div
                          key={`${item}-${idx}`}
                          className={`suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
                          onClick={() => {
                            setSearchQuery(item);
                            handleSearch(null, false, item);
                            setShowSuggestions(false);
                          }}
                        >
                          <Search size={14} className="suggestion-icon" />
                          <span>{String(item)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {isLiveSearching && !isSearching && (
                  <div className="searching-indicator" style={{ marginTop: '16px' }}>
                    <RefreshCw size={12} className="animate-spin" /> {'\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25...'}</div>
                )}

                {isSearching && (
                  <div className="search-loading-state animate-fade-in" style={{ padding: '40px 0', width: '100%' }}>
                    <div className="search-minimal-loader">
                      <div className="search-minimal-loader-bar"></div>
                      <div className="search-minimal-loader-grid">
                        <div className="search-minimal-loader-line search-minimal-loader-line-wide"></div>
                        <div className="search-minimal-loader-line"></div>
                        <div className="search-minimal-loader-line search-minimal-loader-line-short"></div>
                      </div>
                    </div>
                    <div className="search-loading-label">{AI_WORKSPACES.langGraph.title} {'\u0e01\u0e33\u0e25\u0e31\u0e07\u0e02\u0e22\u0e32\u0e22\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25'}</div>
                    <div className="search-narrative">
                      <div className="narrative-item" style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
                        {searchStatusMessage || 'Preparing the next search stage...'}
                      </div>
                    </div>
                  </div>
                )}

                {shouldShowEmptySearchState && (
                  <div className="search-idea-tags animate-fade-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ marginBottom: '16px', opacity: 0.5 }}>
                      <Search size={48} style={{ margin: '0 auto' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-dim)', lineHeight: '1.4' }}>{'\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a'} "{searchQuery}"</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{'\u0e23\u0e30\u0e1a\u0e1a\u0e25\u0e2d\u0e07\u0e02\u0e22\u0e32\u0e22\u0e04\u0e33\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27 \u0e41\u0e15\u0e48\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e40\u0e08\u0e2d\u0e1c\u0e25\u0e25\u0e31\u0e1e\u0e18\u0e4c\u0e17\u0e35\u0e48\u0e19\u0e48\u0e32\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19\u0e43\u0e19\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49'}</p>
                  </div>
                )}

                {!searchQuery && searchResults.length === 0 && !isSearching && (
                  <div className="search-idea-tags search-preset-hub animate-fade-in">
                    <div className="search-preset-hub-header">
                      <p>
                        {searchPresets.length > 0
                          ? '\u0050reset \u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13'
                          : searchHistory.length > 0
                            ? '\u0e15\u0e48\u0e2d\u0e08\u0e32\u0e01\u0e2a\u0e34\u0e48\u0e07\u0e17\u0e35\u0e48\u0e04\u0e38\u0e13\u0e2a\u0e19\u0e43\u0e08'
                            : interestSeedLabels.length > 0
                              ? '\u0e15\u0e32\u0e21\u0e2a\u0e34\u0e48\u0e07\u0e17\u0e35\u0e48\u0e04\u0e38\u0e13\u0e01\u0e33\u0e25\u0e31\u0e07\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21'
                              : '\u0e40\u0e23\u0e34\u0e48\u0e21\u0e08\u0e32\u0e01\u0e2b\u0e31\u0e27\u0e02\u0e49\u0e2d\u0e22\u0e2d\u0e14\u0e19\u0e34\u0e22\u0e21'}
                      </p>
                      <span>
                        {searchPresets.length > 0
                          ? '\u0e01\u0e14\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e17\u0e31\u0e19\u0e17\u0e35 \u0e2b\u0e23\u0e37\u0e2d\u0e25\u0e1a\u0e1b\u0e38\u0e48\u0e21\u0e17\u0e35\u0e48\u0e44\u0e21\u0e48\u0e43\u0e0a\u0e49\u0e41\u0e25\u0e49\u0e27'
                          : searchHistory.length > 0
                            ? '\u0e23\u0e30\u0e1a\u0e1a\u0e08\u0e30\u0e14\u0e31\u0e19\u0e04\u0e33\u0e04\u0e49\u0e19\u0e17\u0e35\u0e48\u0e04\u0e38\u0e13\u0e43\u0e0a\u0e49\u0e08\u0e23\u0e34\u0e07\u0e02\u0e36\u0e49\u0e19\u0e21\u0e32\u0e01\u0e48\u0e2d\u0e19 \u0e41\u0e25\u0e49\u0e27\u0e04\u0e48\u0e2d\u0e22\u0e40\u0e15\u0e34\u0e21\u0e2b\u0e31\u0e27\u0e02\u0e49\u0e2d\u0e17\u0e35\u0e48\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e02\u0e49\u0e2d\u0e07\u0e43\u0e2b\u0e49'
                            : interestSeedLabels.length > 0
                              ? '\u0e23\u0e30\u0e1a\u0e1a\u0e2b\u0e22\u0e34\u0e1a\u0e08\u0e32\u0e01\u0e25\u0e34\u0e2a\u0e15\u0e4c\u0e41\u0e25\u0e30\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e17\u0e35\u0e48\u0e04\u0e38\u0e13\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e21\u0e32\u0e40\u0e1b\u0e47\u0e19\u0e08\u0e38\u0e14\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e43\u0e2b\u0e49'
                              : '\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e04\u0e38\u0e13\u0e40\u0e23\u0e34\u0e48\u0e21\u0e04\u0e49\u0e19\u0e2b\u0e32 \u0e23\u0e30\u0e1a\u0e1a\u0e08\u0e30\u0e40\u0e23\u0e35\u0e22\u0e19\u0e23\u0e39\u0e49\u0e41\u0e25\u0e30\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e1b\u0e38\u0e48\u0e21\u0e0a\u0e38\u0e14\u0e19\u0e35\u0e49\u0e43\u0e2b\u0e49\u0e40\u0e2b\u0e21\u0e32\u0e30\u0e01\u0e31\u0e1a\u0e04\u0e38\u0e13\u0e21\u0e32\u0e01\u0e02\u0e36\u0e49\u0e19'}
                      </span>
                    </div>
                    <div className="tags-row">
                      {dynamicSearchTags.map((tag) => (
                        <div key={`${tag.source}-${tag.label}`} className={`idea-tag search-preset-pill ${tag.source === 'preset' ? 'is-preset' : ''}`}>
                          <button
                            type="button"
                            className="search-preset-pill-button"
                            onClick={() => {
                              setSearchQuery(tag.label);
                              handleSearch(null, false, tag.label);
                            }}
                          >
                            {tag.label}
                          </button>
                          {tag.source === 'preset' && (
                            <button
                              type="button"
                              className="search-preset-remove-btn"
                              aria-label={`\u0e25\u0e1a preset ${tag.label}`}
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
            </ContentErrorBoundary>
          </div>
          {searchResults.length > 0 && (
            <div className="search-results-container">
              {shouldShowSearchChoices && searchChoiceOptions.length > 1 && (
                <div
                  className="animate-fade-in"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '14px 16px',
                    marginBottom: '18px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '18px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
                      อยากให้โฟกัสแบบไหนมากกว่า
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      ไม่กดก็ได้ ระบบจะใช้มุมมองเริ่มต้นให้เอง
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {searchChoiceOptions.map((option) => {
                      const isActive = activeSearchFocus === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => applySearchFocus(option.id)}
                          className="btn-mini-ghost"
                          style={{
                            background: isActive ? 'rgba(41, 151, 255, 0.16)' : 'rgba(255,255,255,0.02)',
                            borderColor: isActive ? 'rgba(41, 151, 255, 0.34)' : 'rgba(255,255,255,0.08)',
                            color: isActive ? '#dbeafe' : 'var(--text-muted)',
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={dismissSearchChoices}
                      className="btn-mini-ghost"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      ไว้ก่อน
                    </button>
                  </div>
                </div>
              )}

              {searchSummary && (
                <div
                  className="search-summary-card animate-fade-in"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '24px',
                    border: '1px solid var(--glass-border)',
                    padding: '24px',
                    marginBottom: '32px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '-20px',
                      width: '120px',
                      height: '120px',
                      background: 'radial-gradient(circle, rgba(41, 151, 255, 0.15) 0%, transparent 70%)',
                      zIndex: 0,
                      pointerEvents: 'none',
                    }}
                  ></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          background: 'var(--accent-gradient)',
                          padding: '8px',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        <FileText size={18} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--accent-secondary)' }}>
                            FORO SUMMARY
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>
                          EDITORIAL DIGEST FROM {Math.min(searchResults.length, 10)} KEY SIGNALS
                        </div>
                        {isLatestMode && summaryDateLabel && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>
                            {summaryDateLabel}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(cleanMarkdownForClipboard(normalizeSummaryMarkdown(searchSummary)));
                        setStatus('\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e1a\u0e17\u0e2a\u0e23\u0e38\u0e1b\u0e41\u0e25\u0e49\u0e27');
                      }}
                      className="icon-btn-large"
                      style={{ width: '32px', height: '32px' }}
                      title="ก๊อปปี้สรุป"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  {(() => {
                    const confMatch = searchSummary.match(/\[CONFIDENCE_SCORE:\s*([^\]]+)\]/i);
                    const confidenceScore = confMatch ? confMatch[1] : null;
                    const cleanSummary = normalizeSummaryMarkdown(searchSummary);

                    return (
                      <>
                        <div
                          className="markdown-body search-summary-content"
                          style={{ fontSize: '15px', lineHeight: '1.8', color: 'rgba(255,255,255,0.9)', position: 'relative', zIndex: 1 }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(cleanSummary) }}
                        />

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '20px',
                            paddingTop: '16px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            flexWrap: 'wrap',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', flexWrap: 'wrap' }}>
                            <ShieldCheck size={12} className="text-accent" /> {summaryTrustLabel}
                            {confidenceScore && (
                              <span
                                style={{
                                  marginLeft: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  letterSpacing: '0.02em',
                                }}
                              >
                                <Activity size={10} /> {'\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e04\u0e27\u0e32\u0e21\u0e41\u0e21\u0e48\u0e19\u0e22\u0e33 (Confidence)'} {confidenceScore}
                              </span>
                            )}
                          </div>

                          {referencedWebSources.length > 0 && (
                            <button
                              onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-dim)',
                                fontSize: '11px',
                                padding: '4px 10px',
                                borderRadius: '100px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                              className="action-hover-btn"
                            >
                              <Link size={12} />{' '}
                              {isSourcesExpanded
                                ? '\u0e0b\u0e48\u0e2d\u0e19\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07'
                                : `\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e14\u0e49\u0e27\u0e22 ${referencedWebSources.length} \u0e40\u0e27\u0e47\u0e1a\u0e44\u0e0b\u0e15\u0e4c`}
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {isSourcesExpanded && referencedWebSources.length > 0 && (
                    <div
                      className="animate-fade-in"
                      style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-dim)', marginBottom: '12px', letterSpacing: '0.05em' }}>
                        WEB SOURCES
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {referencedWebSources.map((src, index) => (
                          <a
                            key={src.url || index}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              textDecoration: 'none',
                              padding: '10px 14px',
                              background: 'rgba(255,255,255,0.02)',
                              borderRadius: '8px',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                            }}
                          >
                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--accent-secondary)', letterSpacing: '0.05em' }}>
                              {src.citation_id || `[W${index + 1}]`}
                            </div>
                            <div
                              style={{
                                fontSize: '13px',
                                color: '#fff',
                                fontWeight: '600',
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {src.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ExternalLink size={10} /> {'\u0e40\u0e1b\u0e34\u0e14\u0e2d\u0e48\u0e32\u0e19\u0e15\u0e49\u0e19\u0e09\u0e1a\u0e31\u0e1a\u0e40\u0e27\u0e47\u0e1a\u0e44\u0e0b\u0e15\u0e4c'}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="feed-grid">
                {searchResults.map((item, idx) => (
                  <FeedCard
                    key={item.id || idx}
                    tweet={item}
                    onArticleGen={onArticleGen}
                    onReadArticle={onReadArticle}
                    isInWatchlist={watchlistHandleSet?.has((item?.author?.username || '').toLowerCase())}
                    postLists={postLists}
                    onAddToWatchlist={onAddAuthorToWatchlist}
                    onTogglePostList={onToggleAuthorInPostList}
                  />
                ))}
              </div>
              {(searchOverflowResults.length > 0 || searchCursor) && !isSearching && (
                <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '40px' }}>
                  <button onClick={(e) => handleSearch(e, true)} className="btn-pill">{'\u0e42\u0e2b\u0e25\u0e14\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21'}</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentWorkspace;
