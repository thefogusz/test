import React, { useState } from 'react';
import { 
  BarChart2, 
  Heart, 
  MessageCircle, 
  Repeat, 
  ExternalLink,
  Sparkles,
  PenTool,
  Bookmark
} from 'lucide-react';

const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return `เมื่อ ${Math.max(1, diffInSeconds)} วินาทีที่แล้ว`;
  if (diffInSeconds < 3600) return `เมื่อ ${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
  if (diffInSeconds < 86400) return `เมื่อ ${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
  return `เมื่อ ${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
};

const FeedCard = ({ tweet, onElevate, onArticleGen, onBookmark, isBookmarked: initialBookmarked = false }) => {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);

  const handleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    if (onBookmark) onBookmark(tweet, next);
  };

  const stats = [
    { icon: <BarChart2 size={12} />, value: tweet.view_count || '0' },
    { icon: <Heart size={12} />, value: tweet.like_count || '0' },
    { icon: <Repeat size={12} />, value: tweet.retweet_count || '0' },
    { icon: <MessageCircle size={12} />, value: tweet.reply_count || '0' },
  ];

  return (
    <div className="feed-card animate-fade-in">
      {/* Header: Author + Bookmark + External Link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <img 
            src={tweet.author?.profile_image_url} 
            alt="" 
            style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid var(--glass-border)' }} 
            onError={e => { 
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tweet.author?.name || 'User')}&background=random&color=fff&bold=true`; 
            }}
          />
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#fff' }}>{tweet.author?.name}</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>@{tweet.author?.username}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px', opacity: 0.9 }}>&bull; {getRelativeTime(tweet.created_at)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <button
            onClick={handleBookmark}
            title={bookmarked ? 'ลบออกจาก Bookmarks' : 'บันทึกใน Bookmarks'}
            className="bookmark-btn"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: bookmarked ? '#fff' : 'var(--text-dim)',
              transition: 'color 0.2s ease, transform 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} strokeWidth={bookmarked ? 2.5 : 1.5} />
          </button>
          <a 
            href={`https://twitter.com/any/status/${tweet.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="icon-btn"
            style={{ padding: '8px' }}
          >
            <ExternalLink size={14} color="#00aaff" />
          </a>
        </div>
      </div>

      {/* Content */}
      {!tweet.summary ? (
        <p style={{ fontSize: '17px', lineHeight: '1.65', marginBottom: '24px', color: 'rgba(255,255,255,0.98)', fontWeight: '500', flex: 1, letterSpacing: '0.2px' }}>
          {tweet.text}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginBottom: '24px' }}>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.98)', lineHeight: '1.75', whiteSpace: 'pre-wrap', fontWeight: '500', marginBottom: '16px', letterSpacing: '0.2px' }}>
            {tweet.summary}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', opacity: 0.7 }}>{stat.icon}</span>
            <span style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)' }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {onElevate && (
          <button 
            onClick={() => onElevate(tweet)} 
            className="forge-action-btn"
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-800)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontWeight: '500', fontSize: '12px' }}
          >
            <Sparkles size={14} /> วิเคราะห์เชิงลึก
          </button>
        )}
        {onArticleGen && (
          <button 
            onClick={() => onArticleGen(tweet)} 
            className="forge-action-btn"
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-800)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontWeight: '500', fontSize: '12px' }}
          >
            <PenTool size={14} /> สร้างคอนเทนต์
          </button>
        )}
      </div>
    </div>
  );
};

export default FeedCard;
