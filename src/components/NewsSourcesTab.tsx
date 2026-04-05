// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { Check, Globe2, Plus, X } from 'lucide-react';
import { RSS_CATALOG, TOPIC_LABELS, type RssSource } from '../config/rssCatalog';
import type { PostList } from '../types/domain';

interface NewsSourcesTabProps {
  subscribedSources: RssSource[];
  onToggleSource: (source: RssSource) => void;
  postLists?: PostList[];
  onTogglePostList?: (
    listId: string,
    contributor: {
      id: string;
      username: string;
      name: string;
      profile_image_url: string;
    },
  ) => void;
}

const ALL_VIEW_TOPIC_PRIORITY = [
  'news',
  'finance',
  'business',
  'tech',
  'ai',
  'science',
  'security',
  'developer',
  'crypto',
  'gaming',
] as const;

const FEATURED_ALL_EN_SOURCE_IDS = [
  'bbc',
  'bloomberg',
  'cnbc',
  'npr-news',
  'guardian-world',
  'al-jazeera',
  'abc-news',
  'cbs-news',
  'time',
  'bangkok-post',
  'fortune',
  'marketwatch',
  'techcrunch',
  'verge',
  'ars-technica',
  'wired',
  'mit-tech-review',
  'openai-blog',
  'techcrunch-ai',
] as const;

const FEATURED_ALL_TH_SOURCE_IDS = [
  'thestandard',
  'matichon',
  'prachachat',
  'brandinside',
  'techsauce',
  'beartai',
] as const;

const THAI_FILTER_KEY = 'thai';

const TOPIC_PRIORITY_INDEX = new Map(
  ALL_VIEW_TOPIC_PRIORITY.map((topic, index) => [topic, index]),
);

const FEATURED_EN_PRIORITY_INDEX = new Map(
  FEATURED_ALL_EN_SOURCE_IDS.map((id, index) => [id, index]),
);

const FEATURED_TH_PRIORITY_INDEX = new Map(
  FEATURED_ALL_TH_SOURCE_IDS.map((id, index) => [id, index]),
);

const sortSourcesForAllView = (sources: RssSource[], lang: 'en' | 'th') => {
  const featuredPriorityIndex =
    lang === 'th' ? FEATURED_TH_PRIORITY_INDEX : FEATURED_EN_PRIORITY_INDEX;

  return [...sources].sort((left, right) => {
    const leftFeatured = featuredPriorityIndex.has(left.id) ? 0 : 1;
    const rightFeatured = featuredPriorityIndex.has(right.id) ? 0 : 1;
    if (leftFeatured !== rightFeatured) return leftFeatured - rightFeatured;

    if (leftFeatured === 0 && rightFeatured === 0) {
      return (
        (featuredPriorityIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (featuredPriorityIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      );
    }

    const leftTypePriority = left.type === 'news' ? 0 : 1;
    const rightTypePriority = right.type === 'news' ? 0 : 1;
    if (leftTypePriority !== rightTypePriority) return leftTypePriority - rightTypePriority;

    const leftTopicPriority = TOPIC_PRIORITY_INDEX.get(left.topic) ?? Number.MAX_SAFE_INTEGER;
    const rightTopicPriority = TOPIC_PRIORITY_INDEX.get(right.topic) ?? Number.MAX_SAFE_INTEGER;
    if (leftTopicPriority !== rightTopicPriority) return leftTopicPriority - rightTopicPriority;

    return left.name.localeCompare(right.name);
  });
};

const SourceCard = ({
  source,
  isSubscribed,
  onToggle,
  postLists = [],
  onTogglePostList,
}: {
  source: RssSource;
  isSubscribed: boolean;
  onToggle: () => void;
  postLists?: PostList[];
  onTogglePostList?: (
    listId: string,
    contributor: {
      id: string;
      username: string;
      name: string;
      profile_image_url: string;
    },
  ) => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(source.siteUrl).hostname}&sz=128`;
  const rssUsername = `rss:${source.id}`;
  const memberPostLists = postLists.filter(
    (list) =>
      Array.isArray(list?.members) &&
      list.members.some(
        (member) => String(member || '').toLowerCase() === rssUsername.toLowerCase(),
      ),
  );
  const postListCount = memberPostLists.length;
  const isInAnyPostList = postListCount > 0;

  return (
    <div
      className="user-card user-list-item animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '14px',
        background: isSubscribed ? 'rgba(41, 151, 255, 0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isSubscribed ? 'rgba(41, 151, 255, 0.2)' : 'var(--glass-border)'}`,
        borderRadius: '18px',
        transition: 'all 0.2s',
        position: 'relative',
        zIndex: showMenu ? 50 : 1,
        width: '100%',
        minWidth: 0,
        overflow: 'visible',
      }}
    >
      <div className="user-card-top" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <img
          src={faviconUrl}
          alt={source.name}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            border: '1px solid var(--bg-700)',
            flexShrink: 0,
            objectFit: 'cover',
            background: 'rgba(255,255,255,0.05)',
          }}
          onError={(e) => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(source.name.charAt(0))}&background=1a1a2e&color=a5b4fc&bold=true&size=128`;
          }}
        />

        <div className="user-card-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
            <div
              style={{
                fontWeight: '800',
                fontSize: '15px',
                color: '#fff',
                lineHeight: '1.25',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {source.name}
            </div>
            {source.lang === 'en' && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  color: 'rgba(251,191,36,0.85)',
                  background: 'rgba(251,191,36,0.12)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
              >
                EN→TH
              </span>
            )}
            {source.lang === 'th' && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  color: 'rgba(52,211,153,0.85)',
                  background: 'rgba(52,211,153,0.12)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
              >
                TH
              </span>
            )}
            {source.type === 'community' && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  color: 'rgba(168,85,247,0.85)',
                  background: 'rgba(168,85,247,0.12)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
              >
                Community
              </span>
            )}
          </div>

          <div style={{ color: 'var(--text-dim)', fontSize: '12px', fontWeight: '600', lineHeight: '1.45' }}>
            {source.description}
          </div>
          <a
            href={source.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="user-card-profile-link"
            style={{ color: 'var(--accent-secondary)', fontSize: '11px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', marginTop: '2px' }}
          >
            {new URL(source.siteUrl).hostname.replace('www.', '')} · {source.frequency}
          </a>
        </div>

        <div className="user-card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowMenu((prev) => !prev)}
                className="user-card-icon-btn"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: isInAnyPostList ? 'rgba(41, 151, 255, 0.12)' : 'var(--bg-700)',
                  border: `1px solid ${isInAnyPostList ? 'rgba(41, 151, 255, 0.32)' : 'var(--glass-border)'}`,
                  color: isInAnyPostList ? '#8ec5ff' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="เพิ่มเข้า Post List"
              >
                <Plus
                  size={16}
                  style={{
                    transform: showMenu ? 'rotate(45deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
                {isInAnyPostList && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 5px',
                      borderRadius: '999px',
                      background: '#2997ff',
                      color: '#fff',
                      border: '2px solid rgba(17, 24, 39, 0.95)',
                      fontSize: '10px',
                      fontWeight: '800',
                      lineHeight: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    {postListCount}
                  </span>
                )}
              </button>

              {showMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className="discovery-menu"
                    style={{
                      display: 'block',
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      zIndex: 100,
                      minWidth: '220px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        color: 'var(--text-muted)',
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--glass-border)',
                      }}
                    >
                      ADD TO POST LIST
                    </div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      {postLists.map((list) => {
                        const isMember =
                          Array.isArray(list.members) &&
                          list.members.some(
                            (member) =>
                              String(member || '').toLowerCase() === rssUsername.toLowerCase(),
                          );

                        return (
                          <button
                            key={list.id}
                            type="button"
                            className={`discovery-menu-item ${isMember ? 'active' : ''}`}
                            onClick={() => {
                              onTogglePostList?.(list.id, {
                                id: `rss-${source.id}`,
                                username: rssUsername,
                                name: source.name,
                                profile_image_url: faviconUrl,
                              });
                              setShowMenu(false);
                            }}
                          >
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginRight: '8px',
                              }}
                            >
                              {list.name}
                            </span>
                            {isMember && <Check size={12} />}
                          </button>
                        );
                      })}
                      {postLists.length === 0 && (
                        <div
                          style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: 'var(--text-dim)',
                            textAlign: 'center',
                          }}
                        >
                          ยังไม่มี Post List
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
          </div>
        </div>
      </div>

      {isInAnyPostList && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '-4px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '999px',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.18)',
              color: 'rgba(134, 239, 172, 0.92)',
              fontSize: '11px',
              fontWeight: '700',
            }}
          >
            <Check size={11} />
            อยู่ใน Post List แล้ว {postListCount} รายการ
          </span>
        </div>
      )}

      <button
        onClick={onToggle}
        className={`expert-follow-btn ${isSubscribed ? 'added' : ''}`}
        style={{
          padding: '6px',
          fontSize: '11px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        {isSubscribed ? 'อยู่ใน Watchlist แล้ว' : '+ เพิ่มเข้า Watchlist'}
      </button>
    </div>
  );
};

const NewsSourcesTab = ({
  subscribedSources,
  onToggleSource,
  postLists = [],
  onTogglePostList,
}: NewsSourcesTabProps) => {
  const [activeTopic, setActiveTopic] = useState<string>('all');
  const subscribedIds = useMemo(
    () => new Set(subscribedSources.map((s) => s.id)),
    [subscribedSources],
  );

  const filteredSources = useMemo(() => {
    const allSources = Object.values(RSS_CATALOG).flat();
    if (activeTopic === 'all') return allSources;
    if (activeTopic === THAI_FILTER_KEY) return allSources.filter((s) => s.lang === 'th');
    return allSources.filter((s) => s.topic === activeTopic);
  }, [activeTopic]);

  const thaiSourceCount = useMemo(
    () => Object.values(RSS_CATALOG).flat().filter((source) => source.lang === 'th').length,
    [],
  );

  const enSources = useMemo(() => {
    const sources = filteredSources.filter((s) => s.lang === 'en');
    return activeTopic === 'all' ? sortSourcesForAllView(sources, 'en') : sources;
  }, [activeTopic, filteredSources]);

  const thSources = useMemo(() => {
    const sources = filteredSources.filter((s) => s.lang === 'th');
    return activeTopic === 'all' || activeTopic === THAI_FILTER_KEY
      ? sortSourcesForAllView(sources, 'th')
      : sources;
  }, [activeTopic, filteredSources]);

  return (
    <div className="animate-fade-in">
      <div
        style={{
          fontSize: '11px',
          fontWeight: '800',
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '14px',
        }}
      >
        กรองตามหมวด
      </div>
      <div className="news-source-filter-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
        <button
          onClick={() => setActiveTopic('all')}
          className={`audience-tab-btn news-source-filter-btn ${activeTopic === 'all' ? 'active-manual' : ''}`}
          style={{ minHeight: '34px', padding: '0 14px', fontSize: '12px' }}
        >
          ทั้งหมด
        </button>
        <button
          onClick={() => setActiveTopic(THAI_FILTER_KEY)}
          className={`audience-tab-btn news-source-filter-btn ${activeTopic === THAI_FILTER_KEY ? 'active-manual' : ''}`}
          style={{ minHeight: '34px', padding: '0 14px', fontSize: '12px' }}
        >
          🇹🇭 ข่าวไทย{' '}
          <span style={{ opacity: 0.4, fontSize: '10px', marginLeft: '2px' }}>
            ({thaiSourceCount})
          </span>
        </button>
        {Object.entries(TOPIC_LABELS).map(([key, { label, icon, count }]) => (
          <button
            key={key}
            onClick={() => setActiveTopic(key)}
            className={`audience-tab-btn news-source-filter-btn ${activeTopic === key ? 'active-manual' : ''}`}
            style={{ minHeight: '34px', padding: '0 14px', fontSize: '12px' }}
          >
            {icon} {label}{' '}
            <span style={{ opacity: 0.4, fontSize: '10px', marginLeft: '2px' }}>
              ({count})
            </span>
          </button>
        ))}
      </div>

      {enSources.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Globe2 size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.55)' }}>
              แหล่งข่าวต่างประเทศ
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              · FORO แปลและสรุปเป็นไทยให้
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: '700' }}>
              {enSources.length} แหล่ง
            </span>
          </div>
          <div
            className="news-source-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
              marginBottom: '8px',
            }}
          >
            {enSources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                isSubscribed={subscribedIds.has(source.id)}
                onToggle={() => onToggleSource(source)}
                postLists={postLists}
                onTogglePostList={onTogglePostList}
              />
            ))}
          </div>
        </>
      )}

      {thSources.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '36px',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '16px' }}>🇹🇭</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.55)' }}>
              แหล่งข่าวไทย
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              · รวมข่าวไทยไว้ในที่เดียว
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: '700' }}>
              {thSources.length} แหล่ง
            </span>
          </div>
          <div className="news-source-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {thSources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                isSubscribed={subscribedIds.has(source.id)}
                onToggle={() => onToggleSource(source)}
                postLists={postLists}
                onTogglePostList={onTogglePostList}
              />
            ))}
          </div>
        </>
      )}

      {subscribedSources.length > 0 && (
        <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '800',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            ▮ รายการใน Watchlist ({subscribedSources.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {subscribedSources.map((source) => (
              <div
                key={source.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 12px',
                  borderRadius: '9px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${new URL(source.siteUrl).hostname}&sz=64`}
                  alt=""
                  style={{ width: '16px', height: '16px', borderRadius: '4px' }}
                />
                {source.name}
                {source.lang === 'en' && (
                  <span
                    style={{
                      fontSize: '8px',
                      fontWeight: '800',
                      color: 'rgba(251,191,36,0.7)',
                      background: 'rgba(251,191,36,0.08)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                    }}
                  >
                    EN→TH
                  </span>
                )}
                {source.lang === 'th' && (
                  <span
                    style={{
                      fontSize: '8px',
                      fontWeight: '800',
                      color: 'rgba(52,211,153,0.7)',
                      background: 'rgba(52,211,153,0.08)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                    }}
                  >
                    TH
                  </span>
                )}
                <span
                  onClick={() => onToggleSource(source)}
                  style={{
                    color: 'rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginLeft: '2px',
                  }}
                >
                  <X size={12} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { SourceCard };
export default NewsSourcesTab;
