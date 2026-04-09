import { useEffect, useMemo, useState } from 'react';
import { Copy, Eraser, FileText, List, RefreshCw, Undo2 } from 'lucide-react';
import { cleanMarkdownForClipboard, normalizeSummaryMarkdown, renderMarkdownToHtml } from '../utils/markdown';
import AiFilteredBadge from './AiFilteredBadge';
import FeedCard from './FeedCard';
import FeedCardSkeleton from './FeedCardSkeleton';
import ForoFilterSummarySkeleton from './ForoFilterSummarySkeleton';
import HomeCanvas from './HomeCanvas';

const FILTER_BRIEF_CITATION_PATTERN = /\[(?:F|W)\d+\]/gi;

const parseBriefItem = (value = '') => {
  const citations = Array.from(new Set(String(value || '').match(FILTER_BRIEF_CITATION_PATTERN) || []));
  const text = String(value || '').replace(FILTER_BRIEF_CITATION_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
  return { text, citations };
};

const normalizeBriefSections = (brief) => {
  if (!brief) return [];

  const sectionLabel = String(brief.sectionLabel || 'ประเด็นสำคัญ').trim();
  const structuredSections = Array.isArray(brief.sections)
    ? brief.sections
      .map((section) => ({
        title: String(section?.title || '').trim(),
        items: Array.isArray(section?.items)
          ? section.items.map((item) => String(item || '').trim()).filter(Boolean)
          : [],
      }))
      .filter((section) => section.title && section.items.length > 0)
    : [];

  if (structuredSections.length > 0) return structuredSections;

  const fallbackItems = Array.isArray(brief.matchedSignals)
    ? brief.matchedSignals.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  return fallbackItems.length > 0
    ? [{ title: sectionLabel, items: fallbackItems }]
    : [];
};

const buildBriefClipboardText = (brief) => {
  if (!brief) return '';

  const headline = parseBriefItem(brief.headline || '').text;
  const whyNow = parseBriefItem(brief.whyNow || '').text;
  const sections = normalizeBriefSections(brief);

  return [
    headline,
    whyNow,
    ...sections.map((section) => [
      section.title,
      ...section.items.map((item) => `- ${parseBriefItem(item).text}`),
    ].join('\n')),
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
};

const BRIEF_SECTION_TONES = [
  { eyebrow: 'ภาพหลัก', hint: 'ประเด็นใหญ่ที่เห็นชัดจากข่าวและโพสต์ที่คัดมา', className: 'is-lead' },
  { eyebrow: 'แรงส่ง', hint: 'รายละเอียดที่ทำให้ประเด็นนี้ชัดขึ้น', className: 'is-supporting' },
  { eyebrow: 'จับตาต่อ', hint: 'มุมที่ควรตามต่อหลังจากนี้', className: 'is-watch' },
];

const getBriefSectionTone = (index) => BRIEF_SECTION_TONES[index] || BRIEF_SECTION_TONES[BRIEF_SECTION_TONES.length - 1];

const HomeView = ({
  isVisible,
  currentActiveList,
  activeListId,
  originalFeedLength,
  deletedFeedLength,
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
  const briefSections = normalizeBriefSections(aiFilterBrief);
  const [isCompactSkeletonLayout, setIsCompactSkeletonLayout] = useState(
    () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false),
  );
  const isFilterUiActive = isFiltering || isFilterPrimed;
  const hasStructuredAiBrief = Boolean(
    aiFilterBrief?.headline &&
    (briefSections.length > 0 || aiFilterBrief?.whyNow),
  );
  const shouldShowAiFilterSummarySkeleton =
    isFilterUiActive &&
    !aiFilterSummary &&
    (isFiltered || isFilterPrimed);
  const effectiveBookmarkIdSet = useMemo(() => bookmarkIdSet ?? new Set(), [bookmarkIdSet]);
  const effectiveWatchlistHandleSet = useMemo(
    () => watchlistHandleSet ?? new Set(),
    [watchlistHandleSet],
  );
  const freshFeedIdSet = useMemo(() => new Set((freshFeedIds ?? []).map((id) => String(id))), [freshFeedIds]);
  const hasVisibleFeed = feed.length > 0;
  const shouldShowIncomingSkeletons = hasVisibleFeed && (isSyncing || isLoadingMore);
  const incomingSkeletonCount = isCompactSkeletonLayout ? 2 : 4;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateLayout = (event) => setIsCompactSkeletonLayout(event.matches);

    setIsCompactSkeletonLayout(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateLayout);
      return () => mediaQuery.removeEventListener('change', updateLayout);
    }

    mediaQuery.addListener(updateLayout);
    return () => mediaQuery.removeListener(updateLayout);
  }, []);

  if (!isVisible) return null;

  const normalizedActiveFilterPrompt = String(activeFilterPrompt || '').trim();

  const outputLabel = aiFilterBrief?.outputLabel || 'ผลการวิเคราะห์';
  const briefHeadline = parseBriefItem(aiFilterBrief?.headline || '').text;
  const briefWhyNow = parseBriefItem(aiFilterBrief?.whyNow || '').text;
  const briefItemCount = briefSections.reduce((total, section) => total + section.items.length, 0);
  const briefCitationCount = briefSections.reduce(
    (total, section) => total + section.items.reduce((sectionTotal, item) => sectionTotal + parseBriefItem(item).citations.length, 0),
    0,
  );

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

          <div className={`home-ai-filter-cluster ${isFilterUiActive ? 'is-filtering' : ''}`}>
            {feed.length > 0 && !isFiltered && visibleQuickPresets.length > 0 && (
              <div className="home-ai-quick-presets">
                {visibleQuickPresets.map((preset) => (
                  <div
                    key={preset}
                    className={`home-ai-quick-chip ${isFilterUiActive && normalizedActiveFilterPrompt === preset ? 'is-active' : ''}`}
                  >
                    <button
                      onClick={() => onQuickFilter(preset)}
                      disabled={isFiltering}
                      className={`home-ai-quick-preset-btn ${isFilterUiActive && normalizedActiveFilterPrompt === preset ? 'is-active' : ''}`}
                    >
                      {preset}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={onOpenFilterModal}
              aria-busy={isFilterUiActive}
              className={`btn-pill home-ai-filter-btn ${feed.length > 0 ? 'home-ai-filter-ready' : ''} ${isFilterUiActive ? 'is-filtering' : ''}`}
            >
              <span className={`home-ai-filter-btn-signal ${isFilterUiActive ? 'is-visible' : ''}`} aria-hidden="true" />
              <span className="home-ai-filter-btn-label">FORO Filter</span>
            </button>
            <button
              onClick={onSync}
              disabled={loading}
              className="btn-pill primary"
            >
              {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} ฟีดข้อมูล
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

      {shouldShowAiFilterSummarySkeleton && <ForoFilterSummarySkeleton />}

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
                  FORO FILTER
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
                const clipboardText = hasStructuredAiBrief
                  ? buildBriefClipboardText(aiFilterBrief)
                  : cleanMarkdownForClipboard(normalizedAiFilterSummary);
                navigator.clipboard.writeText(clipboardText);
                onSummaryCopied();
              }}
              className="icon-btn-large"
              style={{ width: '32px', height: '32px' }}
              title="คัดลอกผลลัพธ์"
            >
              <Copy size={14} />
            </button>
          </div>

          {hasStructuredAiBrief ? (
            <div
              className="foro-filter-brief"
              style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '18px' }}
            >
              <div className="foro-filter-hero">
                <div className="foro-filter-hero-copy">
                  <div className="foro-filter-kicker-row">
                    <div className="foro-filter-kicker">อ่านภาพรวมก่อน แล้วค่อยไล่ลงรายละเอียด</div>
                    <div className="foro-filter-meta-pill foro-filter-output-pill">{outputLabel}</div>
                  </div>
                  <div className="foro-filter-hero-headline">{briefHeadline}</div>
                  {briefWhyNow && (
                    <div className="foro-filter-hero-why">{briefWhyNow}</div>
                  )}
                </div>
                <div className="foro-filter-hero-rail">
                  <div className="foro-filter-hero-stat">
                    <span className="foro-filter-hero-stat-value">{briefSections.length}</span>
                    <span className="foro-filter-hero-stat-label">แกนเรื่อง</span>
                  </div>
                  <div className="foro-filter-hero-stat">
                    <span className="foro-filter-hero-stat-value">{briefItemCount}</span>
                    <span className="foro-filter-hero-stat-label">ประเด็นคัดแล้ว</span>
                  </div>
                  <div className="foro-filter-hero-stat">
                    <span className="foro-filter-hero-stat-value">{briefCitationCount}</span>
                    <span className="foro-filter-hero-stat-label">จุดอ้างอิง</span>
                  </div>
                </div>
              </div>

              {briefSections.length > 0 && (
                <div className="foro-filter-brief-card foro-filter-brief-stage">
                  <div className="foro-filter-brief-sections">
                    {briefSections.map((section, index) => {
                      const tone = getBriefSectionTone(index);
                      return (
                        <div key={`${outputLabel}-${section.title}`} className={`foro-filter-brief-section ${tone.className}`}>
                          <div className="foro-filter-brief-section-top">
                            <div className="foro-filter-brief-eyebrow">{tone.eyebrow}</div>
                            <div className="foro-filter-brief-hint">{tone.hint}</div>
                          </div>
                          <div className="foro-filter-brief-title">{section.title}</div>
                          <div className="foro-filter-brief-list">
                            {section.items.map((item) => {
                              const parsedItem = parseBriefItem(item);
                              return (
                                <div key={`${section.title}-${item}`} className="foro-filter-brief-item">
                                  <span className="foro-filter-brief-item-text">{parsedItem.text}</span>
                                  {parsedItem.citations.length > 0 && (
                                    <span className="foro-filter-brief-citations">
                                      {parsedItem.citations.map((citation) => (
                                        <span key={`${section.title}-${item}-${citation}`} className="reference-badge foro-filter-brief-citation-badge">
                                          {citation.replaceAll('[', '').replaceAll(']', '')}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="markdown-body search-summary-content"
              style={{ fontSize: '15px', lineHeight: '1.8', color: 'rgba(255,255,255,0.9)', position: 'relative', zIndex: 1 }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(normalizedAiFilterSummary) }}
            />
          )}
        </div>
      )}

      <div className={`feed-grid ${isFilterUiActive ? 'is-filter-transitioning' : ''}`}>
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

        {shouldShowIncomingSkeletons && (
          <FeedCardSkeleton count={incomingSkeletonCount} />
        )}

        {hasVisibleFeed &&
          feed.map((item, index) => (
            <FeedCard
              key={item.id || index}
              tweet={item}
              isBookmarked={effectiveBookmarkIdSet.has(item.id)}
              isFresh={freshFeedIdSet.has(String(item?.id || ''))}
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

      {hasVisibleFeed && (pendingFeed.length > 0 || nextCursor || isLoadingMore) && (
        <div className="home-load-more-shell">
          <button onClick={onLoadMore} className="btn-pill" disabled={loading}>
            {isLoadingMore ? <RefreshCw size={14} className="animate-spin" /> : 'โหลดเพิ่มเติม'}
          </button>
        </div>
      )}
    </div>
  );
};

export default HomeView;
