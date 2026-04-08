import { useMemo } from 'react';
import { Copy, Eraser, FileText, List, RefreshCw, ShieldCheck, Undo2 } from 'lucide-react';
import { cleanMarkdownForClipboard, normalizeSummaryMarkdown, renderMarkdownToHtml } from '../utils/markdown';
import AiFilteredBadge from './AiFilteredBadge';
import FeedCard from './FeedCard';
import HomeCanvas from './HomeCanvas';

const HomeView = ({
  isVisible,
  currentActiveList,
  activeListId,
  originalFeedLength,
  deletedFeedLength,
  feed,
  isFiltered,
  activeFilters,
  visibleQuickPresets,
  quickFilterPresets,
  isFiltering,
  loading,
  pendingFeed,
  nextCursor,
  aiFilterSummary,
  aiFilterSummaryDateLabel,
  bookmarkIdSet,
  watchlistHandleSet,
  postLists,
  onOpenMobileList,
  onDeleteAll,
  onUndo,
  onSort,
  onQuickFilter,
  onOpenFilterModal,
  onSync,
  onLoadMore,
  onClearAiFilter,
  onBookmark,
  onArticleGen,
  onReadArticle,
  onSummaryCopied,
}) => {
  const hasHomeSecondaryActions = originalFeedLength > 0 || deletedFeedLength > 0;
  const showHomeFeedToolbar = feed.length > 0 || isFiltered;
  const normalizedAiFilterSummary = normalizeSummaryMarkdown(aiFilterSummary);
  const effectiveBookmarkIdSet = useMemo(() => bookmarkIdSet ?? new Set(), [bookmarkIdSet]);
  const effectiveWatchlistHandleSet = useMemo(
    () => watchlistHandleSet ?? new Set(),
    [watchlistHandleSet],
  );

  if (!isVisible) return null;

  return (
    <div className="animate-fade-in">
      <header className="dashboard-header dashboard-header-home dashboard-header-home-layout">
        <div className="dashboard-header-top dashboard-header-top-layout">
          <div className="mobile-only-flex home-mobile-logo home-mobile-logo-layout">
            <img src="logo.png" alt="FO" className="home-mobile-logo-img" loading="eager" />
          </div>
          <div className="dashboard-header-title-block dashboard-header-title-stack">
            <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: '500' }}>WATCHLIST FEED</div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', lineHeight: '1.4', color: currentActiveList?.color || 'inherit' }}>
              {currentActiveList?.name || 'หน้าหลัก'}
            </h1>
          </div>
          <button className="mobile-only-flex icon-btn-large" onClick={onOpenMobileList}>
            <List size={20} />
          </button>
        </div>

        <div
          className={`dashboard-header-actions home-control-panel ${hasHomeSecondaryActions ? '' : 'home-control-panel-compact'}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}
        >
          <div className="dashboard-header-actions-group" style={{ display: 'flex', gap: '8px' }}>
            {originalFeedLength > 0 && (
              <button onClick={onDeleteAll} className="icon-btn-large header-secondary-action" title="เคลียร์ฟีด">
                <Eraser size={16} />
              </button>
            )}
            {deletedFeedLength > 0 && (
              <button onClick={onUndo} className="icon-btn-large header-secondary-action undo-reveal">
                <Undo2 size={16} />
              </button>
            )}
          </div>

          <div className="mobile-only-flex home-mobile-feed-inline" style={{ alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
            <div className="feed-section-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="section-title">โพสต์ล่าสุด</div>
              {isFiltered && <AiFilteredBadge onClear={onClearAiFilter} clearTitle="ล้างตัวกรอง" />}
            </div>
            <div className="feed-section-filters" style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onSort('view')} className={`btn-pill ${activeFilters.view ? 'active' : ''}`}>
                ยอดวิว
              </button>
              <button onClick={() => onSort('engagement')} className={`btn-pill ${activeFilters.engagement ? 'active' : ''}`}>
                เอนเกจเมนต์
              </button>
            </div>
          </div>

          <div className="home-ai-filter-cluster">
            {feed.length > 0 && !isFiltered && visibleQuickPresets.length > 0 && (
              <div className="home-ai-quick-presets">
                {visibleQuickPresets.map((preset) => (
                  <div key={preset} className="home-ai-quick-chip">
                    <button
                      onClick={() => onQuickFilter(preset)}
                      disabled={isFiltering}
                      className="home-ai-quick-preset-btn"
                    >
                      {preset}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {feed.length > 0 && !isFiltered && quickFilterPresets.length > 0 && (
              <div className="home-ai-connector">
                <div className="home-ai-connector-line" />
              </div>
            )}
            <button
              onClick={onOpenFilterModal}
              className={`btn-pill home-ai-filter-btn ${feed.length > 0 ? 'home-ai-filter-ready' : ''}`}
            >
              FORO Filter
            </button>
            <button
              onClick={onSync}
              disabled={loading || feed.length > 0}
              className="btn-pill primary"
              title={feed.length > 0 ? (activeListId ? 'ล้างฟีดสำหรับลิสต์นี้ก่อน' : 'ล้างฟีดทั้งหมดก่อนแล้วค่อยหาฟีดใหม่') : undefined}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} ฟีดข้อมูล
            </button>
          </div>
        </div>
      </header>

      {showHomeFeedToolbar && (
        <div className="feed-section-header home-desktop-feed-header home-feed-toolbar reader-toolbar-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="feed-section-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="section-title">โพสต์ล่าสุด</div>
            {activeListId && <div className="active-list-pills">กำลังกรองตาม: {currentActiveList?.name}</div>}
            {isFiltered && <AiFilteredBadge onClear={onClearAiFilter} clearTitle="ล้างตัวกรอง" />}
          </div>
          <div className="feed-section-filters reader-toolbar-actions-group" style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onSort('view')} className={`btn-pill ${activeFilters.view ? 'active' : ''}`}>
              ยอดวิว
            </button>
            <button onClick={() => onSort('engagement')} className={`btn-pill ${activeFilters.engagement ? 'active' : ''}`}>
              เอนเกจเมนต์
            </button>
          </div>
        </div>
      )}

      {aiFilterSummary && (
        <div className="search-summary-card animate-fade-in">
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
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--accent-secondary)' }}>
                  FORO FILTER SUMMARY
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>
                  CURATED FROM {feed.length} FILTERED RESULTS
                </div>
                {aiFilterSummaryDateLabel && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>
                    {aiFilterSummaryDateLabel}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(cleanMarkdownForClipboard(normalizedAiFilterSummary));
                onSummaryCopied();
              }}
              className="icon-btn-large"
              style={{ width: '32px', height: '32px' }}
              title="ก๊อปปี้สรุป"
            >
              <Copy size={14} />
            </button>
          </div>

          <div
            className="markdown-body search-summary-content"
            style={{ fontSize: '15px', lineHeight: '1.8', color: 'rgba(255,255,255,0.9)', position: 'relative', zIndex: 1 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(normalizedAiFilterSummary) }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontWeight: '600',
            }}
          >
            <ShieldCheck size={12} className="text-accent" />
            สรุปโดย FORO อ้างอิงจากบทสนทนาและเงื่อนไขการกรองของคุณ
          </div>
        </div>
      )}

      <div className="feed-grid">
        {feed.length === 0 && (
          <div
            className="home-splash"
            onMouseMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty('--mx', `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
              event.currentTarget.style.setProperty('--my', `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
            }}
          >
            <HomeCanvas />
            <div className="home-splash-inner">
              <h2 className="home-splash-title no-select-ui">FORO ติดตามทุกเรื่องที่คุณสนใจ</h2>
            </div>
          </div>
        )}

        {feed.length > 0 &&
          feed.map((item, index) => (
            <FeedCard
              key={item.id || index}
              tweet={item}
              isBookmarked={effectiveBookmarkIdSet.has(item.id)}
              isInWatchlist={effectiveWatchlistHandleSet.has(
                String(item?.author?.username || '').trim().replace(/^@/, '').toLowerCase(),
              )}
              postLists={postLists}
              onBookmark={onBookmark}
              onArticleGen={onArticleGen}
              onReadArticle={onReadArticle}
            />
          ))}
      </div>

      {(pendingFeed.length > 0 || nextCursor) && !loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <button onClick={onLoadMore} className="btn-pill">
            โหลดเพิ่มเติม
          </button>
        </div>
      )}
    </div>
  );
};

export default HomeView;
