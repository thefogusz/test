import React, { useState } from 'react';
import { 
  BarChart2, Heart, MessageCircle, Repeat,
  ExternalLink, Sparkles, PenTool, Bookmark
} from 'lucide-react';

const getRelativeTime = (dateString) => {
  const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
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

const FeedCard = ({ tweet, onArticleGen, onBookmark, isBookmarked: initialBookmarked = false }) => {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);

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
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tweet.author?.name}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
              @{tweet.author?.username}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          
          <a href={`https://twitter.com/any/status/${tweet.id}`} target="_blank" rel="noopener noreferrer" style={{ 
            width: '26px', height: '26px', borderRadius: '6px',
            color: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0
          }} className="icon-hover">
            <ExternalLink size={15} strokeWidth={2.5} />
          </a>
        </div>
      </div>

      {/* ── BODY: The Star Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <p style={{
          fontSize: '16px', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.9)',
          fontWeight: '500', margin: 0, display: '-webkit-box',
          WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          letterSpacing: '-0.01em'
        }}>
          {tweet.summary || tweet.text}
        </p>
      </div>

      {/* ── FOOTER: Stats & Sublte Actions ── */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
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
              className="btn-pill accent" 
              style={{ height: '28px', padding: '0 12px', fontSize: '11px', gap: '4px', background: 'rgba(41, 151, 255, 0.1)', border: '1px solid rgba(41, 151, 255, 0.3)', color: '#2997ff' }}
            >
              <PenTool size={12} strokeWidth={2.5} /> <span style={{ fontWeight: '700' }}>สร้างคอนเทนต์</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedCard;
