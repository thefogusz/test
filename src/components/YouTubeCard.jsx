import React, { memo, useState } from 'react';
import { BarChart2, Heart, MessageCircle, ExternalLink, PenTool, Loader2 } from 'lucide-react';
import { getVideoTranscript } from '../services/YouTubeService';

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
  if (isNaN(n) || n === 0) return '0';
  if (n >= 1000000) return Math.floor(n / 1000000) + 'M';
  if (n >= 1000) return Math.floor(n / 1000) + 'K';
  return n.toString();
};

const YouTubeCard = ({ video, onArticleGen }) => {
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  const handleGenerate = async () => {
    if (!onArticleGen || loadingTranscript) return;
    setLoadingTranscript(true);
    try {
      const result = await getVideoTranscript(video.videoId);
      const sourceNode = {
        source: 'youtube',
        id: video.id,
        videoId: video.videoId,
        title: result?.title || video.title,
        text: result?.transcript || video.text || '',
        url: video.url,
        thumbnail: video.thumbnail,
        author: { name: video.channelTitle, username: video.channelTitle, profile_image_url: null },
      };
      onArticleGen(sourceNode);
    } catch (err) {
      console.error('[YouTubeCard] transcript fetch error:', err);
      // Fallback: use description as source text
      onArticleGen({
        source: 'youtube',
        id: video.id,
        videoId: video.videoId,
        title: video.title,
        text: video.text || '',
        url: video.url,
        thumbnail: video.thumbnail,
        author: { name: video.channelTitle, username: video.channelTitle, profile_image_url: null },
      });
    } finally {
      setLoadingTranscript(false);
    }
  };

  return (
    <div className="feed-card animate-fade-in">

      {/* Thumbnail */}
      <div style={{ position: 'relative', marginBottom: '14px', borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)' }}>
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '32px' }}>▶</div>
        )}
        {video.duration && (
          <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.82)', color: '#fff', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.02em' }}>
            {video.duration}
          </div>
        )}
      </div>

      {/* Header: Channel + badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,50,50,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px' }}>▶</div>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.channelTitle || 'YouTube'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div style={{ background: 'rgba(255,50,50,0.12)', color: '#ff5555', padding: '0 8px', borderRadius: '100px', fontSize: '10px', fontWeight: '900', border: '1px solid rgba(255,85,85,0.25)', height: '22px', display: 'flex', alignItems: 'center' }}>
            YouTube
          </div>
          {video.publishedAt && (
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0 10px', borderRadius: '100px', fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.08)', height: '26px', display: 'flex', alignItems: 'center' }}>
              {getRelativeTime(video.publishedAt)}
            </div>
          )}
          <a href={video.url} target="_blank" rel="noopener noreferrer" style={{ width: '26px', height: '26px', borderRadius: '6px', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="icon-hover">
            <ExternalLink size={15} strokeWidth={2.5} />
          </a>
        </div>
      </div>

      {/* Title + Description */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '15px', lineHeight: '1.5', color: 'rgba(255,255,255,0.92)', fontWeight: '700', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', letterSpacing: '-0.01em', wordBreak: 'break-word' }}>
          {video.title}
        </p>
        {video.text && (
          <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-dim)', fontWeight: '400', margin: '6px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
            {video.text}
          </p>
        )}
      </div>

      {/* Footer: Stats + Actions */}
      <div className="feed-card-footer" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="feed-card-stats" style={{ display: 'flex', gap: '12px' }}>
          {[
            { icon: BarChart2, v: video.viewCount },
            { icon: Heart, v: video.likeCount },
            { icon: MessageCircle, v: video.commentCount },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '11px' }}>
              <s.icon size={12} strokeWidth={2.5} opacity={0.5} />
              <span style={{ fontWeight: '700' }}>{fmt(s.v)}</span>
            </div>
          ))}
        </div>
        {onArticleGen && (
          <button onClick={handleGenerate} disabled={loadingTranscript} className="btn-forge">
            {loadingTranscript
              ? <><Loader2 size={11} strokeWidth={2.5} style={{ animation: 'spin 1s linear infinite' }} /><span>กำลังดึง...</span></>
              : <><PenTool size={11} strokeWidth={2.5} /><span>สร้างคอนเทนต์</span></>
            }
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(YouTubeCard, (prev, next) => prev.video === next.video);
