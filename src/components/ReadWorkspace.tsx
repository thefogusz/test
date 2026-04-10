// @ts-nocheck
import React, { startTransition } from 'react';
import { List, Search, X } from 'lucide-react';
import FeedCard from './FeedCard';

const ReadWorkspace = ({
  isVisible,
  activeListId,
  currentActiveList,
  setIsMobilePostListOpen,
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
  handleBookmark,
  onArticleGen,
  onReadArticle,
}) => {
  return (
    <>
      {isVisible && (
        <div className="reader-library-view animate-fade-in">
          <header className="reader-header">
            <div className="reader-header-top">
              <div className="reader-header-copy">
                <h1 className="hero-search-title">{'\u0e2d\u0e48\u0e32\u0e19\u0e02\u0e48\u0e32\u0e27'}</h1>
                <p className="hero-search-subtitle">{'\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21\u0e41\u0e25\u0e30\u0e02\u0e48\u0e32\u0e27\u0e2a\u0e32\u0e23\u0e17\u0e35\u0e48\u0e04\u0e38\u0e13\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e44\u0e27\u0e49\u0e2d\u0e48\u0e32\u0e19\u0e41\u0e1a\u0e1a Deep Read'}</p>
              </div>
              <button className="mobile-only-flex icon-btn-large" onClick={() => setIsMobilePostListOpen(true)}>
                <List size={20} />
              </button>
            </div>
          </header>

          {readArchive.length > 0 && (
            <div className="reader-toolbar">
              <div className="reader-search-shell">
                <div className="reader-search-input-wrap">
                  <Search size={18} className="reader-search-icon" />
                  <input
                    type="text"
                    className="reader-search-input"
                    placeholder={'\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e08\u0e32\u0e01\u0e0a\u0e37\u0e48\u0e2d\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32 \u0e2b\u0e23\u0e37\u0e2d\u0e04\u0e33\u0e2a\u0e33\u0e04\u0e31\u0e0d...'}
                    value={readSearchQuery}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      startTransition(() => {
                        setReadSearchQuery(nextValue);
                      });
                    }}
                  />
                  {readSearchQuery && (
                    <button type="button" className="reader-search-clear" onClick={() => setReadSearchQuery('')}>
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

              <div className="reader-toolbar-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="reader-toolbar-count">{filteredReadArchive.length} {'\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23'}</span>
                  {activeListId && (
                    <div className="active-list-pills" style={{ fontSize: '12px', padding: '4px 10px', margin: 0 }}>
                      {'\u0e01\u0e33\u0e25\u0e31\u0e07\u0e01\u0e23\u0e2d\u0e07\u0e15\u0e32\u0e21:'} {currentActiveList?.name}
                    </div>
                  )}
                </div>
                <div className="reader-toolbar-actions-group">
                  <button onClick={() => setReadFilters((p) => ({ ...p, view: !p.view }))} className={`btn-pill ${readFilters.view ? 'active' : ''}`}>
                    {'\u0e22\u0e2d\u0e14\u0e27\u0e34\u0e27'}
                  </button>
                  <button
                    onClick={() => setReadFilters((p) => ({ ...p, engagement: !p.engagement }))}
                    className={`btn-pill ${readFilters.engagement ? 'active' : ''}`}
                  >
                    {'\u0e40\u0e2d\u0e47\u0e19\u0e40\u0e01\u0e08\u0e40\u0e21\u0e19\u0e15\u0e4c'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="feed-grid">
            {visibleReadArchive.map((item, idx) => (
              <FeedCard
                key={item.id || idx}
                tweet={item}
                isBookmarked={bookmarkIds.has(item.id)}
                onBookmark={handleBookmark}
                onArticleGen={onArticleGen}
                onReadArticle={onReadArticle}
              />
            ))}
            {readArchive.length === 0 && <div className="empty-state-card">{'\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21\u0e43\u0e19\u0e2b\u0e49\u0e2d\u0e07\u0e2a\u0e21\u0e38\u0e14'}</div>}
            {visibleReadArchive.length < filteredReadArchive.length && (
              <div className="reader-load-more-shell">
                <div className="reader-load-more-copy">{'\u0e41\u0e2a\u0e14\u0e07\u0e41\u0e25\u0e49\u0e27'} {visibleReadArchive.length} {'\u0e08\u0e32\u0e01'} {filteredReadArchive.length} {'\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23'}</div>
                <button type="button" className="btn-pill" onClick={() => setVisibleReadCount((current) => current + readArchiveRenderBatch)}>
                  {'\u0e42\u0e2b\u0e25\u0e14\u0e40\u0e1e\u0e34\u0e48\u0e21'}
                </button>
              </div>
            )}
            {readArchive.length > 0 && filteredReadArchive.length === 0 && (
              <div className="reader-empty-search-state">
                <div className="reader-empty-search-icon">
                  <Search size={20} />
                </div>
                <div className="reader-empty-search-title">{'\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21\u0e17\u0e35\u0e48\u0e43\u0e01\u0e25\u0e49\u0e40\u0e04\u0e35\u0e22\u0e07\u0e01\u0e31\u0e1a'} "{readSearchQuery}"</div>
                <div className="reader-empty-search-copy">
                  {'\u0e25\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e04\u0e33\u0e17\u0e35\u0e48\u0e01\u0e27\u0e49\u0e32\u0e07\u0e02\u0e36\u0e49\u0e19 \u0e0a\u0e37\u0e48\u0e2d\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u0e2b\u0e23\u0e37\u0e2d\u0e04\u0e33\u0e2a\u0e33\u0e04\u0e31\u0e0d\u0e17\u0e35\u0e48\u0e2a\u0e30\u0e01\u0e14\u0e43\u0e01\u0e25\u0e49\u0e40\u0e04\u0e35\u0e22\u0e07\u0e01\u0e31\u0e19 \u0e23\u0e30\u0e1a\u0e1a\u0e08\u0e30\u0e08\u0e31\u0e1a\u0e04\u0e39\u0e48\u0e41\u0e1a\u0e1a dynamic \u0e43\u0e2b\u0e49\u0e40\u0e2d\u0e07'}
                </div>
                <button type="button" className="btn-pill" onClick={() => setReadSearchQuery('')}>
                  {'\u0e25\u0e49\u0e32\u0e07\u0e04\u0e33\u0e04\u0e49\u0e19'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
};

export default ReadWorkspace;
