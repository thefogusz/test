// @ts-nocheck
import React, { startTransition, useMemo } from 'react';
import { List, PenSquare, Search, Trash2, X } from 'lucide-react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getListTitleTextStyle } from '../utils/listTheme';
import FeedCard from './FeedCard';

const BookmarksWorkspace = ({
  isVisible,
  currentActiveList,
  activeListId,
  setIsMobilePostListOpen,
  bookmarkTab,
  setBookmarkTab,
  readSearchQuery,
  setReadSearchQuery,
  filteredBookmarks,
  handleBookmark,
  onArticleGen,
  onReadArticle,
  setBookmarks,
}) => {
  const watchlistHandleSet = useMemo(() => {
    if (typeof window === 'undefined') return new Set();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.watchlist);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(
        (Array.isArray(parsed) ? parsed : [])
          .map((user) => String(user?.username || '').trim().replace(/^@/, '').toLowerCase())
          .filter(Boolean),
      );
    } catch {
      return new Set();
    }
  }, [filteredBookmarks]);

  const shouldShowGeneratedFromContentBadge = (item) => {
    if (item?.type !== 'article') return false;

    const attachedUsername = String(item?.attachedSource?.author?.username || '')
      .trim()
      .replace(/^@/, '')
      .toLowerCase();

    if (!attachedUsername) return false;
    return !watchlistHandleSet.has(attachedUsername);
  };

  return (
    <div className="animate-fade-in" style={{ display: isVisible ? 'block' : 'none' }}>
      <header className="reader-header">
        <div className="reader-header-top">
          <div className="reader-header-copy">
            <h1 className="hero-search-title" style={getListTitleTextStyle(currentActiveList?.color)}>
              Bookmarks
            </h1>
            <p className="hero-search-subtitle">{'\u0e04\u0e25\u0e31\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e17\u0e35\u0e48\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e44\u0e27\u0e49\u0e41\u0e22\u0e01\u0e15\u0e32\u0e21\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17'}</p>
          </div>
          <button className="mobile-only-flex icon-btn-large" onClick={() => setIsMobilePostListOpen(true)}>
            <List size={20} />
          </button>
        </div>
        {activeListId && <div className="active-list-pills">{'\u0e01\u0e33\u0e25\u0e31\u0e07\u0e01\u0e23\u0e2d\u0e07\u0e15\u0e32\u0e21:'} {currentActiveList?.name}</div>}
      </header>

      <div className="bookmark-tabs">
        <button onClick={() => setBookmarkTab('news')} className={`bookmark-tab-btn ${bookmarkTab === 'news' ? 'active' : ''}`}>
          {'\ud83d\udcf0 \u0e02\u0e48\u0e32\u0e27'}
        </button>
        <button onClick={() => setBookmarkTab('article')} className={`bookmark-tab-btn ${bookmarkTab === 'article' ? 'active' : ''}`}>
          {'\ud83d\udcdd \u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21'}
        </button>
      </div>

      <div className="reader-toolbar" style={{ marginBottom: '20px' }}>
        <div className="reader-search-shell">
          <div className="reader-search-input-wrap">
            <Search size={18} className="reader-search-icon" />
            <input
              type="text"
              className="reader-search-input"
              placeholder={
                bookmarkTab === 'news'
                  ? '\u0e04\u0e49\u0e19\u0e2b\u0e32 bookmark \u0e08\u0e32\u0e01\u0e0a\u0e37\u0e48\u0e2d\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32 \u0e2b\u0e23\u0e37\u0e2d\u0e04\u0e33\u0e2a\u0e33\u0e04\u0e31\u0e0d...'
                  : '\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21 bookmark \u0e08\u0e32\u0e01\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07 \u0e2a\u0e23\u0e38\u0e1b \u0e2b\u0e23\u0e37\u0e2d\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07...'
              }
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
        </div>
        <div className="reader-toolbar-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <span className="reader-toolbar-count">{filteredBookmarks.length} {'\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23'}</span>
        </div>
      </div>

      <div className="feed-grid">
        {filteredBookmarks.map((item, idx) =>
          bookmarkTab === 'news' ? (
            <FeedCard
              key={item.id || idx}
              tweet={item}
              isBookmarked={true}
              onBookmark={handleBookmark}
              onArticleGen={onArticleGen}
              onReadArticle={onReadArticle}
            />
          ) : (
            <div key={item.id} className="article-card" onClick={() => onReadArticle(item)}>
              <div className="article-card-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: 1 }}>
                  {shouldShowGeneratedFromContentBadge(item) && (
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.10)',
                        color: 'rgba(255,255,255,0.92)',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                      title={'มาจาก Create Content และยังไม่ได้เพิ่มผู้เขียนเข้า Watchlist'}
                      aria-label={'มาจาก Create Content และยังไม่ได้เพิ่มผู้เขียนเข้า Watchlist'}
                    >
                      <PenSquare size={13} strokeWidth={2.2} />
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {item.title && item.title.startsWith('http') ? (
                      <a
                        href={item.title}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: 'var(--accent-secondary)',
                          textDecoration: 'none',
                          display: 'block',
                          maxWidth: '85%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.title}
                      </a>
                    ) : (
                      <h3 title={item.title || item.name} style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                        {item.title && item.title !== '...' ? item.title : (item.name || item.author?.name || 'à¸šà¸—à¸„à¸§à¸²à¸¡à¸—à¸µà¹ˆà¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸§à¹‰')}
                      </h3>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('\u0e04\u0e38\u0e13\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e25\u0e1a\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21\u0e19\u0e35\u0e49\u0e43\u0e0a\u0e48\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?')) {
                      setBookmarks((prev) => prev.filter((post) => post.id !== item.id));
                    }
                  }}
                  className="btn-mini-ghost text-red"
                  style={{ padding: '4px 8px', flexShrink: 0 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="article-preview" style={{
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.6',
                color: 'var(--text-main)',
                fontSize: '14px',
                opacity: 0.85
              }}>
                {(item.summary || item.text || '').replace(/[#*`]/g, '').trim()}
              </div>
              <div className="article-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-secondary)' }}>
                  {'\u0e2d\u0e48\u0e32\u0e19\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21 \u2192'}
                </span>
              </div>
            </div>
          ),
        )}
        {filteredBookmarks.length === 0 && readSearchQuery && (
          <div className="reader-empty-search-state">
            <div className="reader-empty-search-icon">
              <Search size={20} />
            </div>
            <div className="reader-empty-search-title">{'\u0e44\u0e21\u0e48\u0e1e\u0e1a bookmark \u0e17\u0e35\u0e48\u0e43\u0e01\u0e25\u0e49\u0e40\u0e04\u0e35\u0e22\u0e07\u0e01\u0e31\u0e1a'} "{readSearchQuery}"</div>
            <div className="reader-empty-search-copy">
              {'\u0e25\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e04\u0e33\u0e17\u0e35\u0e48\u0e01\u0e27\u0e49\u0e32\u0e07\u0e02\u0e36\u0e49\u0e19 \u0e2b\u0e23\u0e37\u0e2d\u0e0a\u0e37\u0e48\u0e2d\u0e41\u0e2b\u0e25\u0e48\u0e07 \u0e23\u0e30\u0e1a\u0e1a\u0e08\u0e30\u0e08\u0e31\u0e1a\u0e04\u0e39\u0e48\u0e41\u0e1a\u0e1a fuzzy \u0e43\u0e2b\u0e49\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34'}
            </div>
            <button type="button" className="btn-pill" onClick={() => setReadSearchQuery('')}>
              {'\u0e25\u0e49\u0e32\u0e07\u0e04\u0e33\u0e04\u0e49\u0e19'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarksWorkspace;
