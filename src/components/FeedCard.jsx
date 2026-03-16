import React from 'react';
import { 
  BarChart2, 
  Heart, 
  MessageCircle, 
  Repeat, 
  Share2, 
  Zap, 
  ExternalLink,
  Sparkles,
  PenTool
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

const FeedCard = ({ tweet, onElevate, onArticleGen }) => {
  const stats = [
    { icon: <BarChart2 size={12} />, value: tweet.view_count || '0' },
    { icon: <Heart size={12} />, value: tweet.like_count || '0' },
    { icon: <Repeat size={12} />, value: tweet.retweet_count || '0' },
    { icon: <MessageCircle size={12} />, value: tweet.reply_count || '0' },
  ];

  return (
    <div className="feed-card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <img 
            src={tweet.author?.profile_image_url} 
            alt="" 
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--glass-border)' }} 
          />
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>{tweet.author?.name}</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>@{tweet.author?.username}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', opacity: 0.8 }}>&bull; {getRelativeTime(tweet.created_at)}</span>
            </div>
          </div>
        </div>
        <a 
          href={`https://twitter.com/any/status/${tweet.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="icon-btn"
          style={{ padding: '8px' }}
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {!tweet.summary ? (
        <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px', color: 'rgba(255,255,255,0.95)', fontWeight: '500', letterSpacing: '-0.02em', flex: 1 }}>
          {tweet.text}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginBottom: '24px' }}>
          <p style={{ fontSize: '16px', color: '#fff', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: '400', letterSpacing: '-0.01em', marginBottom: '16px' }}>
            {tweet.summary}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', opacity: 0.7 }}>{stat.icon}</span>
            <span style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)' }}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => onElevate(tweet)} 
          className="forge-action-btn"
          style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-800)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontWeight: '500', fontSize: '12px' }}
        >
          <Sparkles size={14} /> วิเคราะห์เชิงลึก
        </button>
        <button 
          onClick={() => onArticleGen(tweet)} 
          className="forge-action-btn"
          style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-800)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontWeight: '500', fontSize: '12px' }}
        >
          <PenTool size={14} /> สร้างคอนเทนต์
        </button>
      </div>
    </div>
  );
};

export default FeedCard;
