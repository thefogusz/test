import React, { useState } from 'react';
import { 
  BarChart2, Heart, MessageCircle, Repeat,
  ExternalLink, Sparkles, PenTool, Bookmark,
  MessageSquare, Reply
} from 'lucide-react';

const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/;

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60) return `${Math.max(1, diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const fmt = (num) => {
  const n = parseInt((num || '0').toString().replace(/,/g, ''), 10);
  if (isNaN(n)) return '0';
  if (n >= 1000000) return Math.floor(n / 1000000) + 'M';
  if (n >= 1000) return Math.floor(n / 1000) + 'K';
  return n.toString();
};

const isUsableThaiSummary = (summary, originalText = '') => {
  const trimmedSummary = (summary || '').trim();
  if (!trimmedSummary || trimmedSummary.startsWith('(Grok')) return false;
  if (trimmedSummary === (originalText || '').trim()) return false;
  return THAI_CHAR_REGEX.test(trimmedSummary);
};

const FeedCard = ({ tweet, onArticleGen, onBookmark, isBookmarked: initialBookmarked = false }) => {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const displayText = isUsableThaiSummary(tweet.summary, tweet.text) ? tweet.summary : tweet.text;

  const handleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    if (onBookmark) onBookmark(tweet, next);
  };

  const stats = [
    { icon: BarChart2, v: tweet.view_count },
    { icon: Heart, v: tweet.like_count },
    { icon: Repeat, v: tweet.retweet_count },
    { icon: MessageCircle, v: tweet.reply_count },
  ];

  return (
    <div className="feed-card animate-fade-in">
      {/* ── HEADER: Avatar, Author & Time ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ 
            width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', 
            border: '2px solid rgba(255,255,255,0.08)', flexShrink: 0 
          }}>
            <img
              src={tweet.author?.profile_image_url?.replace('_normal', '')}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tweet.author?.name || 'U')}&background=random&color=fff&bold=true`;
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {tweet.citation_id && (
                <span style={{ 
                  background: 'rgba(255,255,255,0.9)', color: '#000', padding: '1px 6px', 
                  borderRadius: '4px', fontSize: '10px', fontWeight: '900', letterSpacing: '0.05em' 
                }}>
                  {tweet.citation_id.replace(/[\[\]]/g, '')}
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {tweet.temporalTag && (
            <div style={{
              background: tweet.temporalTag === 'Breaking' ? 'rgba(239, 68, 68, 0.15)' : tweet.temporalTag === 'Trending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: tweet.temporalTag === 'Breaking' ? '#ef4444' : tweet.temporalTag === 'Trending' ? '#f59e0b' : '#3b82f6',
              padding: '0 10px',
              borderRadius: '100px',
              fontSize: '10px',
              fontWeight: '900',
              border: `1px solid ${tweet.temporalTag === 'Breaking' ? 'rgba(239, 68, 68, 0.3)' : tweet.temporalTag === 'Trending' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '26px',
              textTransform: 'uppercase'
            }}>
              {tweet.temporalTag === 'Breaking' ? '🚨' : tweet.temporalTag === 'Trending' ? '🔥' : '📌'} {tweet.temporalTag}
            </div>
          )}
          {/* Time Badge - Standardized Height for Alignment */}
          <div style={{
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
            height: '26px'
          }}>
            {getRelativeTime(tweet.created_at)}
          </div>
          
          <button onClick={handleBookmark} className="icon-hover" style={{ 
            background: 'transparent', border: 'none', cursor: 'pointer', 
            width: '26px', height: '26px', borderRadius: '6px',
            color: bookmarked ? '#fff' : 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0
          }}>
            <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} strokeWidth={2.5} />
          </button>
          
          <a href={`https://x.com/${tweet.author?.username || 'i'}/status/${tweet.id}`} target="_blank" rel="noopener noreferrer" style={{ 
            width: '26px', height: '26px', borderRadius: '6px',
            color: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0
          }} className="icon-hover">
            <ExternalLink size={15} strokeWidth={2.5} />
          </a>
        </div>
      </div>

      {/* ── CREATIVE REPLY BADGE ── */}
      {tweet.isReply && (
        <div style={{
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
          boxShadow: '0 2px 10px rgba(41, 151, 255, 0.05)'
        }}>
          <Reply size={13} strokeWidth={2.5} style={{ opacity: 0.9 }} />
          <span>ตอบกลับ <b>@{tweet.inReplyToUsername || 'ใครบางคน'}</b></span>
        </div>
      )}

      {/* ── BODY: The Star Content ── */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ 
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
          wordBreak: 'break-word'
        }}>
          {displayText}
        </p>
      </div>

      {/* ── FOOTER: Stats & Sublte Actions ── */}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {/* Minimalist Stats */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {stats.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '11px' }}>
              <s.icon size={12} strokeWidth={2.5} opacity={0.5} />
              <span style={{ fontWeight: '700' }}>{fmt(s.v)}</span>
            </div>
          ))}
        </div>

        {/* Mini-Ghost Actions */}
        <div style={{ display: 'flex', gap: '4px' }}>

          {onArticleGen && (
            <button 
              onClick={(e) => { e.stopPropagation(); onArticleGen(tweet); }} 
              className="btn-forge" 
            >
              <PenTool size={11} strokeWidth={2.5} /> <span>สร้างคอนเทนต์</span>
            </button>
          )}
        </div>
      </div>
      {/* ── SUBTLE AI REASONING BADGE ── */}
      {tweet.ai_reasoning && (
        <div style={{
          marginTop: '16px',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          fontSize: '11.5px',
          color: 'var(--text-dim)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          lineHeight: '1.4'
        }}>
          <Sparkles size={12} style={{ color: 'var(--accent-secondary)', marginTop: '2px', flexShrink: 0 }} fill="currentColor" />
          <span style={{ fontStyle: 'italic' }}>AI Insight: {tweet.ai_reasoning}</span>
        </div>
      )}
    </div>
  );
};

export default FeedCard;
