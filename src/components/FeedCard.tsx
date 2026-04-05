import React, { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart2,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Heart,
  Image as ImageIcon,
  ListVideo,
  MessageCircle,
  PenSquare,
  Repeat,
  Reply,
  X,
} from 'lucide-react';
import type { Post, PostList } from '../types/domain';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  getRssCardPresentation,
  getPreferredPostSummary,
  getPreferredPostTitle,
  hasUsefulThaiSummary,
} from '../utils/appUtils';

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
  onReadArticle?: (tweet: Post) => void;
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
  onReadArticle,
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
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const displayTweet = tweet.repostedPost || tweet;
  const isRepost = Boolean(tweet.isRepost || tweet.repostedPost);
  const isRssPost = String(displayTweet.sourceType || tweet.sourceType || '').trim().toLowerCase() === 'rss';
  const repostedByUsername = (tweet.repostedByUsername || tweet.author?.username || '').trim().replace(/^@/, '');
  const repostedByName = (tweet.repostedByName || tweet.author?.name || '').trim();
  const hasThaiSummary = hasUsefulThaiSummary(displayTweet.summary, displayTweet.text);
  const displayText = hasThaiSummary ? displayTweet.summary : displayTweet.text;
  const previewImageUrl = displayTweet.primaryImageUrl || displayTweet.imageUrls?.[0] || '';
  const hasMediaPreview = Boolean(displayTweet.isXVideo || previewImageUrl);
  const rssCardPresentation = isRssPost
    ? getRssCardPresentation(displayTweet, { hasMediaPreview })
    : null;
  const displayTitle = isRssPost
    ? (rssCardPresentation?.title || '')
    : getPreferredPostTitle(displayTweet);
  const rssSummaryText = isRssPost
    ? (rssCardPresentation?.summary || '')
    : getPreferredPostSummary(displayTweet);
  const shouldShowRssTitle = isRssPost && !!String(displayTitle || '').trim();
  const imageUrls = useMemo(
    () =>
      Array.from(
        new Set([
          previewImageUrl,
          ...(Array.isArray(displayTweet.imageUrls) ? displayTweet.imageUrls : []),
        ].filter(Boolean)),
      ),
    [displayTweet.imageUrls, previewImageUrl],
  );
  const shouldShowRssSummary =
    isRssPost &&
    !!String(rssSummaryText || '').trim();
  const isReadableArticle =
    Boolean(onReadArticle) &&
    ['rss', 'web_article'].includes(String(displayTweet.sourceType || '').trim().toLowerCase()) &&
    Boolean(displayTweet.url);
  const authorUsername = (displayTweet.author?.username || '').trim().replace(/^@/, '').toLowerCase();
  const postUrl = useMemo(
    () => displayTweet.url || `https://x.com/${displayTweet.author?.username || 'i'}/status/${displayTweet.id}`,
    [displayTweet.author?.username, displayTweet.id, displayTweet.url],
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

  useEffect(() => {
    if (!isImageViewerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsImageViewerOpen(false);
        return;
      }

      if (imageUrls.length <= 1) return;

      if (event.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
      }

      if (event.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev + 1) % imageUrls.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageUrls.length, isImageViewerOpen]);

  const handleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    if (onBookmark) onBookmark(tweet, next);
  };

  const handleAddToWatchlist = async () => {
    if (!authorUsername || effectiveIsInWatchlist || !onAddToWatchlist) return;
    setOptimisticInWatchlist(true);
    try {
      await Promise.resolve(onAddToWatchlist(displayTweet));
    } catch (error) {
      console.error(error);
      setOptimisticInWatchlist(false);
    }
  };

  const openImageViewer = (index = 0) => {
    if (imageUrls.length === 0) return;
    setActiveImageIndex(Math.max(0, Math.min(index, imageUrls.length - 1)));
    setIsImageViewerOpen(true);
  };

  const activeImageUrl = imageUrls[activeImageIndex] || previewImageUrl;

  const profileMenuItems = fallbackPostLists.map((list) => {
    const isMember = Array.isArray(list.members) && list.members.some((member) => member?.toLowerCase() === authorUsername);
    return {
      id: list.id,
      label: isMember ? `เอาออกจาก ${list.name}` : `เพิ่มเข้า ${list.name}`,
      active: isMember,
    };
  });

  const stats = [
    { icon: BarChart2, v: displayTweet.view_count },
    { icon: Heart, v: displayTweet.like_count },
    { icon: Repeat, v: displayTweet.retweet_count },
    { icon: MessageCircle, v: displayTweet.reply_count },
  ];
  const footerBadges = [
    isRepost
      ? {
          key: 'repost',
          icon: Repeat,
          label: `รีโพสต์โดย ${repostedByUsername ? `@${repostedByUsername}` : repostedByName || 'บัญชีนี้'}`,
          color: 'rgba(142, 197, 255, 0.72)',
          background: 'rgba(41, 151, 255, 0.035)',
          border: '1px solid rgba(41, 151, 255, 0.08)',
        }
      : null,
    displayTweet.isReply
      ? {
          key: 'reply',
          icon: Reply,
          label: `ตอบกลับ @${displayTweet.inReplyToUsername || 'บางคน'}`,
          color: 'rgba(120, 186, 255, 0.7)',
          background: 'rgba(41, 151, 255, 0.03)',
          border: '1px solid rgba(41, 151, 255, 0.075)',
        }
      : null,
  ].filter(Boolean);
  const showSocialStats = !isRssPost;
  const shouldShowFooterMeta = showSocialStats || footerBadges.length > 0;
  const showRepostBanner = false;
  const showInlineReplyBanner = false;

  return (
    <div className="feed-card animate-fade-in">
      {showRepostBanner && isRepost && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
            padding: '6px 10px',
            borderRadius: '999px',
            background: 'rgba(41, 151, 255, 0.08)',
            border: '1px solid rgba(41, 151, 255, 0.16)',
            color: '#8ec5ff',
            fontSize: '11px',
            fontWeight: '700',
            width: 'fit-content',
          }}
          title={repostedByUsername ? `รีโพสต์โดย @${repostedByUsername}` : 'รีโพสต์'}
        >
          <Repeat size={12} strokeWidth={2.4} />
          <span>
            รีโพสต์โดย <b>{repostedByUsername ? `@${repostedByUsername}` : repostedByName || 'บัญชีนี้'}</b>
          </span>
        </div>
      )}
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
                src={displayTweet.author?.profile_image_url?.replace('_normal', '')}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayTweet.author?.name || 'U')}&background=random&color=fff&bold=true`;
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
                  {displayTweet.author?.name}
                </div>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span>{isRssPost && tweet.url ? new URL(tweet.url).hostname.replace('www.', '') : `@${displayTweet.author?.username}`}</span>
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
                        id: displayTweet.author?.id || authorUsername,
                        username: authorUsername,
                        name: displayTweet.author?.name || authorUsername,
                        profile_image_url: displayTweet.author?.profile_image_url || '',
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
          {showInlineReplyBanner && displayTweet.isReply && (
            <div
              className="feed-card-reply-badge feed-card-reply-badge-inline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: 'fit-content',
                gap: '6px',
                padding: '6px 12px',
                background: 'linear-gradient(90deg, rgba(41, 151, 255, 0.1) 0%, rgba(157, 117, 255, 0.05) 100%)',
                borderLeft: '3px solid var(--accent-blue)',
                borderRadius: '4px 8px 8px 4px',
                color: 'var(--accent-blue)',
                fontSize: '11.5px',
                fontWeight: '600',
                letterSpacing: '0.02em',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 2px 10px rgba(41, 151, 255, 0.05)',
              }}
            >
              <Reply size={13} strokeWidth={2.5} style={{ opacity: 0.9 }} />
              <span className="feed-card-reply-badge-text-clean">
                {'\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A'} <b>@{displayTweet.inReplyToUsername || '\u0E1A\u0E32\u0E07\u0E04\u0E19'}</b>
              </span>
              <span className="feed-card-reply-badge-text">à¸•à¸­à¸šà¸à¸¥à¸±à¸š <b>@{tweet.inReplyToUsername || 'à¸šà¸²à¸‡à¸„à¸™'}</b></span>
            </div>
          )}

          {isRssPost && (
            <div
              style={{
                background: 'rgba(251, 146, 60, 0.14)',
                padding: '0 10px',
                borderRadius: '100px',
                fontSize: '10px',
                fontWeight: '900',
                color: '#fdba74',
                border: '1px solid rgba(251, 146, 60, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                height: '26px',
              }}
              title="RSS news source"
            >
              RSS
            </div>
          )}

          {displayTweet.isXVideo && (
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
            {getRelativeTime(displayTweet.created_at)}
          </div>

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
            href={isRssPost ? (tweet.url || '#') : `https://x.com/${displayTweet.author?.username || 'i'}/status/${displayTweet.id}`}
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

      {displayTweet.isXVideo ? (
        <div
          className="feed-card-media-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: '112px minmax(0, 1fr)',
            gap: '12px',
            alignItems: 'start',
            marginBottom: '14px',
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
              aspectRatio: '1 / 1',
              borderRadius: '16px',
              overflow: 'hidden',
              textDecoration: 'none',
              border: '1px solid rgba(96, 165, 250, 0.18)',
              background: displayTweet.thumbnailUrl
                ? `linear-gradient(180deg, rgba(2,6,23,0.08) 0%, rgba(2,6,23,0.72) 100%), url(${displayTweet.thumbnailUrl}) center/cover`
                : 'linear-gradient(135deg, rgba(96,165,250,0.28) 0%, rgba(15,23,42,0.8) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '8px',
                right: '8px',
                bottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderRadius: '999px',
                  padding: '4px 7px',
                  background: 'rgba(2, 6, 23, 0.76)',
                  color: '#e5eefc',
                  fontSize: '9px',
                  fontWeight: '800',
                  letterSpacing: '0.03em',
                }}
              >
                <ListVideo size={10} />
                ดูบน X
              </div>
              {displayTweet.videoDurationMs ? (
                <div
                  style={{
                    borderRadius: '999px',
                    padding: '4px 7px',
                    background: 'rgba(2, 6, 23, 0.76)',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '9px',
                    fontWeight: '800',
                  }}
                >
                  {Math.max(1, Math.round(displayTweet.videoDurationMs / 1000))}s
                </div>
              ) : null}
            </div>
          </a>

          <div className="feed-card-media-copy" style={{ minWidth: 0, paddingTop: '2px' }}>
            <p
              className={`feed-card-body-copy ${hasMediaPreview ? 'has-media' : 'no-media'}`}
              style={{
                fontSize: '16px',
                lineHeight: '1.62',
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: '500',
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                letterSpacing: '-0.01em',
                wordBreak: 'break-word',
              }}
            >
              {displayText}
            </p>
          </div>
        </div>
      ) : previewImageUrl ? (
        <div
          className="feed-card-media-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: '112px minmax(0, 1fr)',
            gap: '12px',
            alignItems: 'start',
            marginBottom: '14px',
          }}
        >
          <button
            type="button"
            onClick={() => openImageViewer(0)}
            style={{
              display: 'block',
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: '16px',
              overflow: 'hidden',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
              background: `linear-gradient(180deg, rgba(2,6,23,0.04) 0%, rgba(2,6,23,0.22) 100%), url(${previewImageUrl}) center/cover`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              cursor: 'zoom-in',
              padding: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '8px',
                bottom: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '999px',
                padding: '4px 7px',
                background: 'rgba(2, 6, 23, 0.76)',
                color: '#e5eefc',
                fontSize: '9px',
                fontWeight: '800',
                letterSpacing: '0.03em',
              }}
            >
              <ImageIcon size={10} />
              ดูภาพใน FORO
            </div>
            {imageUrls.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  bottom: '8px',
                  borderRadius: '999px',
                  padding: '4px 7px',
                  background: 'rgba(2, 6, 23, 0.76)',
                  color: 'rgba(255,255,255,0.92)',
                  fontSize: '9px',
                  fontWeight: '800',
                }}
              >
                1/{imageUrls.length}
              </div>
            )}
          </button>

          <div className="feed-card-media-copy" style={{ minWidth: 0, paddingTop: '2px' }}>
            {shouldShowRssTitle && (
              <div
                style={{
                  display: '-webkit-box',
                  fontSize: '17px',
                  fontWeight: '800',
                  color: '#fff',
                  marginBottom: shouldShowRssSummary ? '8px' : 0,
                  lineHeight: '1.42',
                  letterSpacing: '-0.01em',
                  WebkitLineClamp: rssCardPresentation?.titleLineClamp || 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {displayTitle}
              </div>
            )}
            {(!isRssPost || shouldShowRssSummary || !shouldShowRssTitle) && (
              <p
                className={`feed-card-body-copy ${hasMediaPreview ? 'has-media' : 'no-media'}`}
                style={{
                  fontSize: isRssPost ? '15px' : '16px',
                  lineHeight: isRssPost ? '1.58' : '1.62',
                  color: isRssPost ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '500',
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: isRssPost ? (rssCardPresentation?.summaryLineClamp || 2) : 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  letterSpacing: '-0.01em',
                  wordBreak: 'break-word',
                }}
              >
                {isRssPost ? (rssSummaryText || displayTitle) : displayText}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '12px' }}>
          {shouldShowRssTitle && (
            <div
              style={{
                display: '-webkit-box',
                fontSize: '15px',
                fontWeight: '800',
                color: '#fff',
                marginBottom: shouldShowRssSummary ? '6px' : 0,
                lineHeight: '1.4',
                WebkitLineClamp: rssCardPresentation?.titleLineClamp || 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
              }}
            >
              {displayTitle}
            </div>
          )}
          {(!isRssPost || shouldShowRssSummary || !shouldShowRssTitle) && (
            <p
              className={`feed-card-body-copy ${hasMediaPreview ? 'has-media' : 'no-media'}`}
              style={{
                fontSize: isRssPost ? '15px' : '16px',
                lineHeight: isRssPost ? '1.58' : '1.6',
                color: isRssPost ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.9)',
                fontWeight: '500',
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: isRssPost ? (rssCardPresentation?.summaryLineClamp || 2) : 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                letterSpacing: '-0.01em',
                wordBreak: 'break-word',
              }}
            >
              {isRssPost ? (rssSummaryText || displayTitle) : displayText}
            </p>
          )}
        </div>
      )}

      <div className="feed-card-footer" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {shouldShowFooterMeta && (
          <div className="feed-card-stats" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {showSocialStats && (
              <div className="feed-card-stats-group" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {stats.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '11px' }}>
                    <s.icon size={12} strokeWidth={2.5} opacity={0.5} />
                    <span style={{ fontWeight: '700' }}>{fmt(s.v)}</span>
                  </div>
                ))}
              </div>
            )}
            {footerBadges.map((badge) => (
              <div
                key={badge.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  minHeight: '24px',
                  padding: '0 8px',
                  borderRadius: '999px',
                  background: badge.background,
                  border: badge.border,
                  color: badge.color,
                  fontSize: '10px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}
              >
                <badge.icon size={11} strokeWidth={2.2} />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="feed-card-actions" style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          {isReadableArticle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReadArticle?.(displayTweet);
              }}
              className="btn-forge feed-card-inline-action"
              title="อ่านเนื้อหาเต็ม"
              aria-label="อ่านเนื้อหาเต็ม"
            >
              <FileText size={11} strokeWidth={2.35} />
              <span>อ่านเนื้อหา</span>
            </button>
          )}
          {onArticleGen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArticleGen(displayTweet);
              }}
              className="btn-forge feed-card-inline-action"
              title="สร้างคอนเทนต์"
              aria-label="สร้างคอนเทนต์"
            >
              <PenSquare size={11} strokeWidth={2.35} />
              <span>สร้างคอนเทนต์</span>
            </button>
          )}
        </div>
      </div>

      {isImageViewerOpen && activeImageUrl && typeof document !== 'undefined' && createPortal(
        <div
          className="modal-overlay"
          onClick={() => setIsImageViewerOpen(false)}
          style={{
            background: 'rgba(2, 6, 23, 0.96)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            padding: '0',
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              width: '100vw',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '20px',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'max(16px, env(safe-area-inset-top))',
                left: '16px',
                right: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                zIndex: 2,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="modal-title" style={{ fontSize: '16px', marginBottom: '4px' }}>
                  {isRssPost
                    ? `รูปภาพจาก ${displayTweet.author?.name || 'แหล่งข่าว'}`
                    : `รูปภาพจาก @${tweet.author?.username || 'x'}`}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.68)' }}>
                  {imageUrls.length > 1 ? `รูป ${activeImageIndex + 1} จาก ${imageUrls.length}` : 'ดูรูปใน FORO'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-pill"
                  style={{ height: '36px', padding: '0 14px', fontSize: '12px', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
                >
                  <ExternalLink size={13} />
                  {isRssPost ? 'เปิดต้นฉบับ' : 'เปิดบน X'}
                </a>
                <button
                  className="modal-close-btn"
                  onClick={() => setIsImageViewerOpen(false)}
                  style={{
                    position: 'static',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                minHeight: 0,
              }}
            >
              <div
                onClick={(event) => event.stopPropagation()}
                style={{
                  position: 'relative',
                  width: 'fit-content',
                  maxWidth: 'min(92vw, 1200px)',
                  maxHeight: 'min(82vh, 1200px)',
                }}
              >
                <img
                  src={activeImageUrl}
                  alt={displayTweet.text || displayTweet.summary || 'tweet image'}
                  style={{
                    maxWidth: 'min(92vw, 1200px)',
                    maxHeight: 'min(82vh, 1200px)',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: '18px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                />

                {imageUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                      }}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '40px',
                        height: '40px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(2, 6, 23, 0.72)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveImageIndex((prev) => (prev + 1) % imageUrls.length);
                      }}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '40px',
                        height: '40px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(2, 6, 23, 0.72)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default memo(FeedCard, (prevProps, nextProps) => (
  prevProps.tweet === nextProps.tweet &&
  prevProps.isBookmarked === nextProps.isBookmarked &&
  prevProps.isInWatchlist === nextProps.isInWatchlist &&
  prevProps.postLists === nextProps.postLists
));
