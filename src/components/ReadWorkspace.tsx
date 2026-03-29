// @ts-nocheck
import React, { startTransition } from 'react';
import { List, Search, X } from 'lucide-react';
import { renderMarkdownToHtml } from '../utils/markdown';
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
  selectedArticle,
  setSelectedArticle,
}) => {
  return (
    <>
      {isVisible && (
        <div className="reader-library-view animate-fade-in">
          <header className="reader-header">
            <div className="reader-header-top">
              <div className="reader-header-copy">
                <h1 className="reader-title">à¸­à¹ˆà¸²à¸™à¸‚à¹ˆà¸²à¸§</h1>
                <p className="reader-subtitle">à¸šà¸—à¸„à¸§à¸²à¸¡à¹à¸¥à¸°à¸‚à¹ˆà¸²à¸§à¸ªà¸²à¸£à¸—à¸µà¹ˆà¸„à¸¸à¸“à¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸§à¹‰à¸­à¹ˆà¸²à¸™à¹à¸šà¸š Deep Read</p>
              </div>
              <button className="mobile-only-flex icon-btn-large" onClick={() => setIsMobilePostListOpen(true)}>
                <List size={20} />
              </button>
            </div>
            {activeListId && <div className="active-list-pills">à¸à¸³à¸¥à¸±à¸‡à¸à¸£à¸­à¸‡à¸•à¸²à¸¡: {currentActiveList?.name}</div>}
          </header>

          {readArchive.length > 0 && (
            <div className="reader-toolbar">
              <div className="reader-search-shell">
                <div className="reader-search-input-wrap">
                  <Search size={18} className="reader-search-icon" />
                  <input
                    type="text"
                    className="reader-search-input"
                    placeholder="à¸„à¹‰à¸™à¸«à¸²à¸ˆà¸²à¸à¸Šà¸·à¹ˆà¸­à¸šà¸±à¸à¸Šà¸µ à¹€à¸™à¸·à¹‰à¸­à¸«à¸² à¸«à¸£à¸·à¸­à¸„à¸³à¹ƒà¸à¸¥à¹‰à¹€à¸„à¸µà¸¢à¸‡..."
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

              <div className="reader-toolbar-actions">
                <span className="reader-toolbar-count">{filteredReadArchive.length} à¸£à¸²à¸¢à¸à¸²à¸£</span>
                <div className="reader-toolbar-actions-group">
                  <button onClick={() => setReadFilters((p) => ({ ...p, view: !p.view }))} className={`btn-pill ${readFilters.view ? 'active' : ''}`}>
                    à¸¢à¸­à¸”à¸§à¸´à¸§
                  </button>
                  <button
                    onClick={() => setReadFilters((p) => ({ ...p, engagement: !p.engagement }))}
                    className={`btn-pill ${readFilters.engagement ? 'active' : ''}`}
                  >
                    à¹€à¸­à¸™à¹€à¸à¸ˆà¹€à¸¡à¸™à¸•à¹Œ
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
              />
            ))}
            {readArchive.length === 0 && <div className="empty-state-card">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸šà¸—à¸„à¸§à¸²à¸¡à¹ƒà¸™à¸«à¹‰à¸­à¸‡à¸ªà¸¡à¸¸à¸”</div>}
            {visibleReadArchive.length < filteredReadArchive.length && (
              <div className="reader-load-more-shell">
                <div className="reader-load-more-copy">à¹à¸ªà¸”à¸‡à¹à¸¥à¹‰à¸§ {visibleReadArchive.length} à¸ˆà¸²à¸ {filteredReadArchive.length} à¸£à¸²à¸¢à¸à¸²à¸£</div>
                <button type="button" className="btn-pill" onClick={() => setVisibleReadCount((current) => current + readArchiveRenderBatch)}>
                  à¹‚à¸«à¸¥à¸”à¹€à¸žà¸´à¹ˆà¸¡
                </button>
              </div>
            )}
            {readArchive.length > 0 && filteredReadArchive.length === 0 && (
              <div className="reader-empty-search-state">
                <div className="reader-empty-search-icon">
                  <Search size={20} />
                </div>
                <div className="reader-empty-search-title">à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹ˆà¸²à¸§à¸—à¸µà¹ˆà¹ƒà¸à¸¥à¹‰à¹€à¸„à¸µà¸¢à¸‡à¸à¸±à¸š "{readSearchQuery}"</div>
                <div className="reader-empty-search-copy">
                  à¸¥à¸­à¸‡à¹ƒà¸Šà¹‰à¸„à¸³à¸—à¸µà¹ˆà¸à¸§à¹‰à¸²à¸‡à¸‚à¸¶à¹‰à¸™ à¸Šà¸·à¹ˆà¸­à¸šà¸±à¸à¸Šà¸µ à¸«à¸£à¸·à¸­à¸„à¸³à¸ªà¸³à¸„à¸±à¸à¸—à¸µà¹ˆà¸ªà¸°à¸à¸”à¹ƒà¸à¸¥à¹‰à¹€à¸„à¸µà¸¢à¸‡à¸à¸±à¸™ à¸£à¸°à¸šà¸šà¸ˆà¸°à¸ˆà¸±à¸šà¸„à¸¹à¹ˆà¹à¸šà¸š dynamic à¹ƒà¸«à¹‰à¹€à¸­à¸‡
                </div>
                <button type="button" className="btn-pill" onClick={() => setReadSearchQuery('')}>
                  à¸¥à¹‰à¸²à¸‡à¸„à¸³à¸„à¹‰à¸™
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedArticle && (
        <div className="modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedArticle(null)}>
              <X size={20} />
            </button>
            <div className="modal-title" style={{ fontSize: '24px', marginBottom: '20px' }}>
              {selectedArticle.title && selectedArticle.title.startsWith('http') ? (
                <a href={selectedArticle.title} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)' }}>
                  {selectedArticle.title}
                </a>
              ) : (
                selectedArticle.title
              )}
            </div>
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(selectedArticle.summary) }} />
            <div className="modal-actions" style={{ marginTop: '32px', justifyContent: 'flex-end' }}>
              <button className="modal-btn modal-btn-secondary" onClick={() => setSelectedArticle(null)}>
                à¸›à¸´à¸”
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReadWorkspace;
