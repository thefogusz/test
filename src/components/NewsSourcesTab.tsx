// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Check, Globe2, MessageSquare, Plus, X } from 'lucide-react';
import { RSS_CATALOG, TOPIC_LABELS, type RssSource } from '../config/rssCatalog';

interface NewsSourcesTabProps {
  subscribedSources: RssSource[];
  onToggleSource: (source: RssSource) => void;
}

const SourceCard = ({ source, isSubscribed, onToggle }: { source: RssSource; isSubscribed: boolean; onToggle: () => void }) => (
  <div
    className="animate-fade-in"
    style={{
      background: isSubscribed ? 'rgba(41, 151, 255, 0.04)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isSubscribed ? 'rgba(41, 151, 255, 0.2)' : 'var(--glass-border)'}`,
      borderRadius: '14px',
      padding: '16px',
      display: 'flex',
      gap: '12px',
      transition: 'all 0.15s',
    }}
  >
    <img
      src={`https://www.google.com/s2/favicons?domain=${new URL(source.siteUrl).hostname}&sz=128`}
      alt=""
      style={{ width: '36px', height: '36px', borderRadius: '9px', objectFit: 'cover', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}
      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(source.name.charAt(0))}&background=1a1a2e&color=a5b4fc&bold=true&size=64`; }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>{source.name}</span>
            {source.lang === 'en' && (
              <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(251,191,36,0.8)', background: 'rgba(251,191,36,0.1)', padding: '2px 6px', borderRadius: '4px' }}>EN → TH</span>
            )}
            {source.lang === 'th' && (
              <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(52,211,153,0.8)', background: 'rgba(52,211,153,0.1)', padding: '2px 6px', borderRadius: '4px' }}>TH</span>
            )}
            {source.type === 'community' && (
              <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(168,85,247,0.8)', background: 'rgba(168,85,247,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Community</span>
            )}
          </div>
          <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.25)', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {new URL(source.siteUrl).hostname.replace('www.', '')}
          </div>
          <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5', marginBottom: '8px' }}>
            {source.description}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '5px' }}>
              {source.frequency}
            </span>
          </div>
        </div>
        <button
          onClick={onToggle}
          style={{
            padding: '5px 12px',
            borderRadius: '7px',
            border: `1px solid ${isSubscribed ? 'rgba(34,197,94,0.2)' : 'rgba(41, 151, 255, 0.3)'}`,
            background: isSubscribed ? 'rgba(34,197,94,0.08)' : 'rgba(41, 151, 255, 0.08)',
            color: isSubscribed ? 'rgba(34,197,94,0.7)' : '#7eb8ff',
            fontSize: '10.5px',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s',
          }}
        >
          {isSubscribed ? <><Check size={11} /> เพิ่มแล้ว</> : <><Plus size={11} /> เพิ่มเข้า Feed</>}
        </button>
      </div>
    </div>
  </div>
);

const NewsSourcesTab = ({ subscribedSources, onToggleSource }: NewsSourcesTabProps) => {
  const [activeTopic, setActiveTopic] = useState<string>('all');
  const subscribedIds = useMemo(() => new Set(subscribedSources.map((s) => s.id)), [subscribedSources]);

  const filteredSources = useMemo(() => {
    const allSources = Object.values(RSS_CATALOG).flat();
    if (activeTopic === 'all') return allSources;
    return allSources.filter((s) => s.topic === activeTopic);
  }, [activeTopic]);

  const enSources = filteredSources.filter((s) => s.lang === 'en');
  const thSources = filteredSources.filter((s) => s.lang === 'th');

  return (
    <div className="animate-fade-in">
      {/* Category filter pills */}
      <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
        กรองตามหมวด
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
        <button
          onClick={() => setActiveTopic('all')}
          className={`audience-tab-btn ${activeTopic === 'all' ? 'active-manual' : ''}`}
          style={{ minHeight: '34px', padding: '0 14px', fontSize: '12px' }}
        >
          ทั้งหมด
        </button>
        {Object.entries(TOPIC_LABELS).map(([key, { label, icon, count }]) => (
          <button
            key={key}
            onClick={() => setActiveTopic(key)}
            className={`audience-tab-btn ${activeTopic === key ? 'active-manual' : ''}`}
            style={{ minHeight: '34px', padding: '0 14px', fontSize: '12px' }}
          >
            {icon} {label} <span style={{ opacity: 0.4, fontSize: '10px', marginLeft: '2px' }}>({count})</span>
          </button>
        ))}
      </div>

      {/* International sources */}
      {enSources.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Globe2 size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.55)' }}>แหล่งข่าวต่างประเทศ</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>· FORO แปลและสรุปเป็นไทยให้</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: '700' }}>{enSources.length} แหล่ง</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '8px' }}>
            {enSources.map((source) => (
              <SourceCard key={source.id} source={source} isSubscribed={subscribedIds.has(source.id)} onToggle={() => onToggleSource(source)} />
            ))}
          </div>
        </>
      )}

      {/* Thai sources */}
      {thSources.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '36px', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px' }}>🇹🇭</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.55)' }}>แหล่งข่าวไทย</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>· รวมข่าวไทยไว้ในที่เดียว</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: '700' }}>{thSources.length} แหล่ง</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {thSources.map((source) => (
              <SourceCard key={source.id} source={source} isSubscribed={subscribedIds.has(source.id)} onToggle={() => onToggleSource(source)} />
            ))}
          </div>
        </>
      )}

      {/* Subscribed list */}
      {subscribedSources.length > 0 && (
        <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ▮ แหล่งข่าวที่ติดตามอยู่ ({subscribedSources.length})
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
                  <span style={{ fontSize: '8px', fontWeight: '800', color: 'rgba(251,191,36,0.7)', background: 'rgba(251,191,36,0.08)', padding: '1px 5px', borderRadius: '3px' }}>EN→TH</span>
                )}
                {source.lang === 'th' && (
                  <span style={{ fontSize: '8px', fontWeight: '800', color: 'rgba(52,211,153,0.7)', background: 'rgba(52,211,153,0.08)', padding: '1px 5px', borderRadius: '3px' }}>TH</span>
                )}
                <span
                  onClick={() => onToggleSource(source)}
                  style={{ color: 'rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: '12px', marginLeft: '2px' }}
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
