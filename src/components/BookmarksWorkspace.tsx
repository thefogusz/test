// @ts-nocheck
import React from 'react';
import { List, Trash2 } from 'lucide-react';
import FeedCard from './FeedCard';

const BookmarksWorkspace = ({
  isVisible,
  currentActiveList,
  activeListId,
  setIsMobilePostListOpen,
  bookmarkTab,
  setBookmarkTab,
  filteredBookmarks,
  handleBookmark,
  onArticleGen,
  onReadArticle,
  setBookmarks,
}) => {
  return (
    <div className="animate-fade-in" style={{ display: isVisible ? 'block' : 'none' }}>
      <header className="reader-header">
        <div className="reader-header-top">
          <div className="reader-header-copy">
            <h1 className="reader-title" style={{ color: currentActiveList?.color || 'inherit' }}>
              Bookmarks
            </h1>
            <p className="reader-subtitle">{'\u0e04\u0e25\u0e31\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e17\u0e35\u0e48\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e44\u0e27\u0e49\u0e41\u0e22\u0e01\u0e15\u0e32\u0e21\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17'}</p>
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
                    {item.title && item.title !== '...' ? item.title : (item.name || item.author?.name || 'บทความที่บันทึกไว้')}
                  </h3>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('\u0e04\u0e38\u0e13\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e25\u0e1a\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21\u0e19\u0e35\u0e49\u0e43\u0e0a\u0e48\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?')) {
                      setBookmarks((prev) => prev.filter((post) => post.id !== item.id));
                    }
                  }}
                  className="btn-mini-ghost text-red"
                  style={{ padding: '4px 8px' }}
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
      </div>
    </div>
  );
};

export default BookmarksWorkspace;
