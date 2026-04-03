import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  BarChart2,
  Bookmark,
  Check,
  ExternalLink,
  Heart,
  ListVideo,
  MessageCircle,
  PenTool,
  Repeat,
  Reply,
} from 'lucide-react';
import type { Post, PostList } from '../types/domain';
import { STORAGE_KEYS } from '../constants/storageKeys';

const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/;

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${Math.max(1, diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const fmt = (num) => {
  const n = parseInt((num || '0').toString().replace(/,/g, ''), 10);
  if (isNaN(n)) return '0';
  if (n >= 1000000) return `${Math.floor(n / 1000000)}M`;
  if (n >= 1000) return `${Math.floor(n / 1000)}K`;
  return n.toString();
};

const isUsableThaiSummary = (summary, originalText = '') => {
  const trimmedSummary = (summary || '').trim();
  if (!trimmedSummary || trimmedSummary.startsWith('(Grok')) return false;
  if (trimmedSummary === (originalText || '').trim()) return false;
  return THAI_CHAR_REGEX.test(trimmedSummary);
};

const safeReadStoredValue = (key, fallbackValue) => {
  if (typeof window === 'undefined') return fallbackValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallbackValue;
    const parsed = JSON.parse(raw);
    return parsed ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
};

type FeedCardProps = {
  tweet: Post;
  onArticleGen?: (tweet: Post) => void;
  onBookmark?: (tweet: Post, bookmarked: boolean) => void;
  isBookmarked?: boolean;
  isInWatchlist?: boolean;
  postLists?: PostList[];
  onAddToWatchlist?: (tweet: Post) => void | Promise<void>;
  onTogglePostList?: (
    listId: string,
    contributor: string | { username?: string; name?: string; profile_image_url?: string; id?: string }
  ) => void | Promise<void>;
};

const FeedCard = ({
  tweet,
  onArticleGen,
  onBookmark,
  isBookmarked: initialBookmarked = false,
  isInWatchlist = false,
  postLists = [],
  onAddToWatchlist,
  onTogglePostList,
}: FeedCardProps) => {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [optimisticInWatchlist, setOptimisticInWatchlist] = useState(false);
  const displayText = isUsableThaiSummary(tweet.summary, tweet.text) ? tweet.summary : tweet.text;
  const authorUsername = (tweet.author?.username || '').trim().replace(/^@/, '').toLowerCase();
  const postUrl = useMemo(
    () => tweet.url || `https://x.com/${tweet.author?.username || 'i'}/status/${tweet.id}`,
    [tweet.author?.username, tweet.id, tweet.url],
  );
  const fallbackPostLists = useMemo(() => {
    if (Array.isArray(postLists) && postLists.length > 0) return postLists;
    const storedPostLists = safeReadStoredValue(STORAGE_KEYS.postLists, []);
    return Array.isArray(storedPostLists) ? storedPostLists : [];
  }, [postLists]);
  const effectiveIsInWatchlist = useMemo(() => {
    if (!authorUsername) return false;
    if (optimisticInWatchlist || isInWatchlist) return true;
    const storedWatchlist = safeReadStoredValue(STORAGE_KEYS.watchlist, []);
    return (storedWatchlist || []).some(
      (user) => (user?.username || '').trim().replace(/^@/, '').toLowerCase() === authorUsername,
    );
  }, [authorUsername, isInWatchlist, optimisticInWatchlist]);

  useEffect(() => {
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  useEffect(() => {
    setOptimisticInWatchlist(false);
  }, [authorUsername, isInWatchlist]);

  const handleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    if (onBookmark) onBookmark(tweet, next);
  };

  const handleAddToWatchlist = async () => {
    if (!authorUsername || effectiveIsInWatchlist || !onAddToWatchlist) return;
    setOptimisticInWatchlist(true);
    try {
      await Promise.resolve(onAddToWatchlist(tweet));
    } catch (error) {
      console.error(error);
      setOptimisticInWatchlist(false);
    }
  };

  const profileMenuItems = fallbackPostLists.map((list) => {
    const isMember = Array.isArray(list.members) && list.members.some((member) => member?.toLowerCase() === authorUsername);
    return {
      id: list.id,
      label: isMember ? `เอาออกจาก ${list.name}` : `เพิ่มเข้า ${list.name}`,
      active: isMember,
    };
  });

  const stats = [
    { icon: BarChart2, v: tweet.view_count },
    { icon: Heart, v: tweet.like_count },
    { icon: Repeat, v: tweet.retweet_count },
    { icon: MessageCircle, v: tweet.reply_count },
  ];

  return (
    <div className="feed-card animate-fade-in">
      <div className="feed-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ position: 'relative', minWidth: 0 }}>
          <button
            type="button"
            className="feed-card-author feed-card-author-trigger"
            onClick={() => authorUsername && setShowProfileMenu((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: authorUsername ? 'pointer' : 'default',
              textAlign: 'left',
            }}
          >
            <div
              className="feed-card-author-avatar"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
              }}
            >
              <img
                src={tweet.author?.profile_image_url?.replace('_normal', '')}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tweet.author?.name || 'U')}&background=random&color=fff&bold=true`;
                }}
              />
            </div>
            <div className="feed-card-author-copy" style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {tweet.citation_id && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      color: '#000',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '900',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {tweet.citation_id.replace(/[[\]]/g, '')}
                  </span>
                )}
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tweet.author?.name}
                </div>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span>@{tweet.author?.username}</span>
              </div>
            </div>
          </button>

          {showProfileMenu && authorUsername && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowProfileMenu(false)} />
              <div
                className="discovery-menu feed-card-profile-menu"
                style={{ display: 'block', position: 'absolute', left: 0, top: 'calc(100% + 8px)', zIndex: 100, minWidth: '220px' }}
              >
                <button
                  type="button"
                  className="discovery-menu-item"
                  onClick={async () => {
                    await handleAddToWatchlist();
                    setShowProfileMenu(false);
                  }}
                  disabled={effectiveIsInWatchlist}
                  hidden={effectiveIsInWatchlist}
                >
                  <span>{isInWatchlist ? 'อยู่ใน Watchlist แล้ว' : 'เพิ่มเข้า Watchlist'}</span>
                  {effectiveIsInWatchlist && <Check size={12} />}
                </button>
                {profileMenuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`discovery-menu-item ${item.active ? 'active' : ''}`}
                    onClick={() => {
                      onTogglePostList?.(item.id, {
                        id: tweet.author?.id || authorUsername,
                        username: authorUsername,
                        name: tweet.author?.name || authorUsername,
                        profile_image_url: tweet.author?.profile_image_url || '',
                      });
                      setShowProfileMenu(false);
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>
                      {item.label}
                    </span>
                    {item.active && <Check size={12} />}
                  </button>
                ))}
                {profileMenuItems.length === 0 && (
                  <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                    ยังไม่มี Post List
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="feed-card-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              padding: '0 10px',
              borderRadius: '100px',
              fontSize: '10px',
              fontWeight: '900',
              color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '26px',
            }}
          >
            {getRelativeTime(tweet.created_at)}
          </div>

          {tweet.isXVideo && (
            <div
              style={{
                background: 'rgba(96, 165, 250, 0.14)',
                padding: '0 10px',
                borderRadius: '100px',
                fontSize: '10px',
                fontWeight: '900',
                color: '#bfdbfe',
                border: '1px solid rgba(96, 165, 250, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                height: '26px',
              }}
              title="X video source"
            >
              <ListVideo size={12} />
              VIDEO
            </div>
          )}

          <button
            onClick={handleBookmark}
            className="icon-hover"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              color: bookmarked ? '#facc15' : 'rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} strokeWidth={2.5} />
          </button>

          <a
            href={`https://x.com/${tweet.author?.username || 'i'}/status/${tweet.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            className="icon-hover"
          >
            <ExternalLink size={15} strokeWidth={2.5} />
          </a>
        </div>
      </div>

      {tweet.isReply && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            width: 'fit-content',
            gap: '6px',
            padding: '6px 12px',
            background: 'linear-gradient(90deg, rgba(41, 151, 255, 0.1) 0%, rgba(157, 117, 255, 0.05) 100%)',
            borderLeft: '3px solid var(--accent-blue)',
            borderRadius: '4px 8px 8px 4px',
            color: 'var(--accent-blue)',
            fontSize: '11.5px',
            fontWeight: '600',
            marginBottom: '14px',
            letterSpacing: '0.02em',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 10px rgba(41, 151, 255, 0.05)',
          }}
        >
          <Reply size={13} strokeWidth={2.5} style={{ opacity: 0.9 }} />
          <span>ตอบกลับ <b>@{tweet.inReplyToUsername || 'ใครบางคน'}</b></span>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <p
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: '500',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            letterSpacing: '-0.01em',
            wordBreak: 'break-word',
          }}
        >
          {displayText}
        </p>
      </div>

      {tweet.isXVideo && (
        <div
          style={{
            marginBottom: '16px',
            borderRadius: '18px',
            overflow: 'hidden',
            border: '1px solid rgba(96, 165, 250, 0.18)',
            background: 'linear-gradient(180deg, rgba(96, 165, 250, 0.12) 0%, rgba(15, 23, 42, 0.4) 100%)',
          }}
        >
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 7.8',
              textDecoration: 'none',
              cursor: 'pointer',
              background: tweet.thumbnailUrl
                ? `linear-gradient(180deg, rgba(2,6,23,0.08) 0%, rgba(2,6,23,0.72) 100%), url(${tweet.thumbnailUrl}) center/cover`
                : 'linear-gradient(135deg, rgba(96,165,250,0.28) 0%, rgba(15,23,42,0.8) 100%)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '14px',
                right: '14px',
                bottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '999px',
                  padding: '6px 10px',
                  background: 'rgba(2, 6, 23, 0.72)',
                  color: '#e5eefc',
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.04em',
                }}
              >
                <ListVideo size={12} />
                ดูบน X
              </div>
              {tweet.videoDurationMs ? (
                <div
                  style={{
                    borderRadius: '999px',
                    padding: '6px 10px',
                    background: 'rgba(2, 6, 23, 0.72)',
                    color: 'rgba(255,255,255,0.88)',
                    fontSize: '11px',
                    fontWeight: '800',
                  }}
                >
                  {Math.max(1, Math.round(tweet.videoDurationMs / 1000))}s
                </div>
              ) : null}
            </div>
          </a>
        </div>
      )}

      <div className="feed-card-footer" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="feed-card-stats" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="feed-card-stats-group" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '11px' }}>
                <s.icon size={12} strokeWidth={2.5} opacity={0.5} />
                <span style={{ fontWeight: '700' }}>{fmt(s.v)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="feed-card-actions" style={{ display: 'flex', gap: '4px' }}>
          {onArticleGen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArticleGen(tweet);
              }}
              className="btn-forge feed-card-inline-action"
            >
              {tweet.isXVideo ? <ListVideo size={11} strokeWidth={2.5} /> : <PenTool size={11} strokeWidth={2.5} />}
              <span>สร้างคอนเทนต์</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(FeedCard, (prevProps, nextProps) => (
  prevProps.tweet === nextProps.tweet &&
  prevProps.isBookmarked === nextProps.isBookmarked &&
  prevProps.isInWatchlist === nextProps.isInWatchlist &&
  prevProps.postLists === nextProps.postLists
));
