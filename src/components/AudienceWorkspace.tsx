// @ts-nocheck
import React from 'react';
import {
  Activity,
  BadgeDollarSign,
  Bitcoin,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  ChartColumn,
  Cpu,
  Globe2,
  HeartPulse,
  Landmark,
  Leaf,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  Users,
  TrendingUp,
  Plane,
  Utensils,
  Trophy,
  Star,
  Book,
  Building,
  Car,
  MessageCircle,
  X,
} from 'lucide-react';

import UserCard from './UserCard';
import NewsSourcesTab, { SourceCard } from './NewsSourcesTab';
import { RSS_CATALOG, TOPIC_LABELS, type RssSource } from '../config/rssCatalog';

const AudienceWorkspace = ({
  isVisible,
  audienceTab,
  setAudienceTab,
  aiQuery,
  setAiQuery,
  handleAiSearchAudience,
  aiSearchLoading,
  aiSearchResults,
  setAiSearchResults,

  watchlist,
  postLists,
  handleToggleMemberInList,
  handleAddExpert,
  manualQuery,
  setManualQuery,
  showSuggestions,
  setShowSuggestions,
  activeSuggestionIndex,
  setActiveSuggestionIndex,
  suggestions,
  handleManualSearch,
  manualPreview,
  handleAddUser,
  handleRemoveAccountGlobal,
  subscribedSources = [],
  onToggleSource = () => { },
}) => {
  const CATEGORIES = [
    { label: 'เทคโนโลยี', image: 'Tech.jpg_202604080519.jpeg' },
    { label: 'AI', image: 'AI.jpg_202604080519.jpeg' },
    { label: 'ธุรกิจ', image: 'Business.png_202604080519.jpeg' },
    { label: 'การตลาด', image: 'Marketing.jpg_202604080519.jpeg' },
    { label: 'การเงิน', image: 'Finance.png_202604080519.jpeg' },
    { label: 'การลงทุน', image: 'Investment.png_202604080519.jpeg' },
    { label: 'คริปโต', image: 'Crypto.png_202604080519.jpeg' },
    { label: 'ความปลอดภัยไซเบอร์', image: 'Cyber_Security.jpg_202604080519.jpeg' },
    { label: 'สุขภาพ', image: 'Health.jpeg_202604080519.jpeg' },
    { label: 'ไลฟ์สไตล์', image: 'Lifestyle.jpg_202604080519.jpeg' },
    { label: 'เศรษฐกิจ', image: 'Economy.jpg_202604080519.jpeg' },
    { label: 'การเมือง', image: 'Politics.jpeg_202604080519.jpeg' },
    { label: 'กีฬา', image: 'Sports.jpeg_202604080519.jpeg' },
    { label: 'บันเทิง', image: 'Entertainment.jpeg_202604080519.jpeg' },
    { label: 'ท่องเที่ยว', image: 'Travel.jpg_202604080519.jpeg' },
    { label: 'อาหาร', image: 'Food.jpg_202604080519.jpeg' },
    { label: 'สิ่งแวดล้อม', image: 'Environment.jpg_202604080525.jpeg' },
    { label: 'การศึกษา', image: 'Education.jpeg_202604080519.jpeg' },
    { label: 'บทวิเคราะห์', image: 'Analysis.jpg_202604080519.jpeg' },
    { label: 'อสังหาฯ', image: 'Realestate.jpg_202604080519.jpeg' },
    { label: 'ยานยนต์', image: 'Automotive.jpg_202604080519.jpeg' },
  ];
  
  const handleClearAiSearch = () => {
    setAiQuery('');
    setAiSearchResults([]);
  };


  return (
    <div style={{ display: isVisible ? 'block' : 'none' }}>
      <div className="animate-fade-in">
        <header className="dashboard-header audience-hero-header" style={{ marginBottom: '14px', paddingTop: '0' }}>
          <div className="audience-hero-copy">

            <div className="audience-hero-text">
              <h1 className="audience-hero-title">
                <span className="audience-hero-title-mark">
                  <Activity size={17} strokeWidth={2.2} />
                </span>
                <span>Smart Target Discovery</span>
              </h1>
            </div>
          </div>
          <p className="audience-hero-subtitle">{'\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e41\u0e25\u0e30\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e04\u0e27\u0e32\u0e21\u0e2a\u0e19\u0e43\u0e08\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13'}</p>
        </header>

        <div className="audience-tabs">
          <button onClick={() => setAudienceTab('ai')} className={`audience-tab-btn audience-primary-tab ${audienceTab === 'ai' ? 'active-ai' : ''}`}>
            <Users size={14} strokeWidth={2.1} />
            <span className="audience-tab-label audience-tab-label-full">{'\u0e41\u0e19\u0e30\u0e19\u0e33\u0e42\u0e14\u0e22 FORO'}</span>
            <span className="audience-tab-label audience-tab-label-mobile">FORO</span>
          </button>
          <button onClick={() => { setAudienceTab('sources'); handleClearAiSearch(); }} className={`audience-tab-btn audience-primary-tab ${audienceTab === 'sources' ? 'active-manual' : ''}`}>
            <Newspaper size={14} strokeWidth={2.1} />
            <span className="audience-tab-label audience-tab-label-full">แหล่งข่าว</span>
            <span className="audience-tab-label audience-tab-label-mobile">ข่าว</span>
            {subscribedSources.length > 0 && (
              <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(41, 151, 255, 0.2)', color: '#7eb8ff', padding: '1px 6px', borderRadius: '999px', marginLeft: '4px' }}>
                {subscribedSources.length}
              </span>
            )}
          </button>
          <button onClick={() => { setAudienceTab('manual'); handleClearAiSearch(); }} className={`audience-tab-btn audience-primary-tab ${audienceTab === 'manual' ? 'active-manual' : ''}`}>
            <Search size={14} strokeWidth={2.1} />
            <span className="audience-tab-label audience-tab-label-full">{'\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e0a\u0e37\u0e48\u0e2d'}</span>
            <span className="audience-tab-label audience-tab-label-mobile">ค้นชื่อ</span>
          </button>

        </div>

        {audienceTab === 'ai' && (
          <div className="animate-fade-in">
            <div className="audience-ai-searchbar audience-command-row" style={{ display: 'flex', gap: '12px', marginBottom: '20px', maxWidth: '680px' }}>
              <div className="audience-ai-search-input">

                <input
                  type="text"
                  placeholder={'\u0e2d\u0e22\u0e32\u0e01\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e40\u0e17\u0e04\u0e42\u0e19\u0e42\u0e25\u0e22\u0e35 AI...'}
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSearchAudience()}
                  style={{ background: 'transparent', border: 'none', color: '#fff', flex: 1, fontSize: '14px', outline: 'none' }}
                />
                {aiQuery && (
                  <button 
                    onClick={handleClearAiSearch}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}
                    className="icon-hover"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button onClick={() => handleAiSearchAudience()} disabled={aiSearchLoading} className="btn-sync-premium" style={{ height: '48px', padding: '0 24px' }}>
                {aiSearchLoading ? <RefreshCw size={15} className="animate-spin" /> : '\u0e04\u0e49\u0e19\u0e2b\u0e32'}
              </button>
            </div>

            {aiSearchLoading && aiSearchResults.length === 0 && (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div className="ai-loader-ring" style={{ margin: '0 auto 20px' }}></div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent-secondary)' }} className="animate-pulse">
                  FORO IS CURATING SOURCES...
                </div>
              </div>
            )}

            {!aiSearchLoading && aiSearchResults.length > 0 && (
              <div className="audience-results-shell" style={{ marginBottom: '32px' }}>
                <div className="expert-grid" style={{ marginBottom: '24px' }}>
                  {aiSearchResults.map((expert, i) => {
                    const isAdded = watchlist.find((w) => w.username.toLowerCase() === expert.username.toLowerCase());
                    return (
                      <div key={expert.username} className="expert-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="audience-expert-top">
                          <div className="audience-expert-meta-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="ai-pick-pill">
                                <Users size={10} /> FORO PICK
                              </div>
                              {expert.activityLabel && (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '3px 8px',
                                    borderRadius: '999px',
                                    fontSize: '9px',
                                    fontWeight: '800',
                                    letterSpacing: '0.04em',
                                    color: '#bfdbfe',
                                    background: 'rgba(41, 151, 255, 0.12)',
                                    border: '1px solid rgba(41, 151, 255, 0.24)',
                                  }}
                                  title={
                                    Number.isFinite(expert.lastSeenDays)
                                      ? `Last seen about ${Math.round(expert.lastSeenDays)} days ago`
                                      : 'Recently verified active'
                                  }
                                >
                                  <Activity size={10} />
                                  {expert.activityLabel}
                                </div>
                              )}
                            </div>
                            <div className="audience-expert-menu-wrap" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>

                              <button
                                onClick={(e) => {
                                  const btn = e.currentTarget;
                                  const menu = btn.nextElementSibling;
                                  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                                }}
                                className="audience-expert-menu-trigger"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                              >
                                <Plus size={12} />
                              </button>
                              <div className="discovery-menu" style={{ display: 'none', position: 'absolute', right: 0, top: '100%', marginTop: '8px', zIndex: 100, width: '180px' }}>
                                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-border)', fontSize: '10px', fontWeight: '800', color: 'var(--accent-secondary)' }}>
                                  ADD TO LIST
                                </div>
                                {postLists.map((list) => {
                                  const isMember = list.members.some((m) => m.toLowerCase() === expert.username.toLowerCase());
                                  return (
                                    <button
                                      key={list.id}
                                      onClick={(e) => {
                                        handleToggleMemberInList(list.id, expert.username);
                                        e.currentTarget.closest('.discovery-menu').style.display = 'none';
                                      }}
                                      className={`discovery-menu-item ${isMember ? 'active' : ''}`}
                                    >
                                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>{list.name}</span>
                                      {isMember && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-secondary)' }} />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="audience-expert-profile">
                            <img
                              src={`https://unavatar.io/twitter/${expert.username}`}
                              className="audience-expert-avatar"
                              style={{ width: '42px', height: '42px', borderRadius: '50%', marginBottom: '10px', border: '2px solid var(--bg-700)', objectFit: 'cover' }}
                              onError={(e) => {
                                if (e.target.src.includes('unavatar.io')) {
                                  e.target.src = `https://unavatar.io/github/${expert.username}`;
                                } else if (e.target.src.includes('github')) {
                                  e.target.src = 'https://www.google.com/s2/favicons?domain=x.com&sz=128';
                                } else {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=random&color=fff&bold=true`;
                                  e.target.onerror = null;
                                }
                              }}
                            />
                            <a href={`https://x.com/${expert.username}`} target="_blank" rel="noopener noreferrer" className="audience-expert-link" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '8px', width: 'fit-content' }}>
                              <div className="expert-name" style={{ fontSize: '14px', color: '#fff', fontWeight: '800' }}>{expert.name}</div>
                              <div className="expert-username" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>@{expert.username}</div>
                            </a>

                          </div>
                        </div>
                        <div className="expert-reasoning audience-expert-reasoning" style={{ fontSize: '13px', marginBottom: '16px', flex: 1, color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                          "{expert.reasoning}"
                        </div>
                        <button onClick={() => handleAddExpert(expert)} disabled={isAdded} className={`expert-follow-btn ${isAdded ? 'added' : ''}`} style={{ padding: '6px', fontSize: '11px' }}>
                          {isAdded ? '\u2713 \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e41\u0e25\u0e49\u0e27' : '+ \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e02\u0e49\u0e32 Watchlist'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => handleAiSearchAudience(null, true)} disabled={aiSearchLoading} className="btn-pill">
                    {aiSearchLoading ? <RefreshCw size={14} className="animate-spin" /> : '\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21'}
                  </button>
                </div>
              </div>
            )}

            {/* Matched RSS sources based on query */}
            {(() => {
              const q = (aiQuery || '').toLowerCase().trim();
              const KEYWORD_TO_TOPIC = {
                ai: 'ai', 'artificial intelligence': 'ai', 'machine learning': 'ai', ml: 'ai', llm: 'ai', gpt: 'ai',
                'เทคโนโลยี': 'tech', tech: 'tech', startup: 'tech', เทค: 'tech',
                'เกม': 'gaming', gaming: 'gaming', game: 'gaming',
                'คริปโต': 'crypto', crypto: 'crypto', bitcoin: 'crypto', blockchain: 'crypto',
                'ธุรกิจ': 'business', business: 'business', 'การตลาด': 'business',
                'การเงิน': 'finance', finance: 'finance', 'การลงทุน': 'finance', 'เศรษฐกิจ': 'finance',
                'วิทยาศาสตร์': 'science', science: 'science',
                'การเมือง': 'politics', politics: 'politics',
                'สุขภาพ': 'health', health: 'health',
                'กีฬา': 'sports', sports: 'sports',
                'บันเทิง': 'entertainment', entertainment: 'entertainment',
                'ไลฟ์สไตล์': 'lifestyle', lifestyle: 'lifestyle', 'การพัฒนาตัวเอง': 'education',
                'ท่องเที่ยว': 'travel', travel: 'travel',
                'อาหาร': 'food', food: 'food', dining: 'food',
                'สิ่งแวดล้อม': 'environment', environment: 'environment', climate: 'environment',
                'การศึกษา': 'education', education: 'education',
                'บทวิเคราะห์': 'opinion', opinion: 'opinion',
                'อสังหาฯ': 'realestate', realestate: 'realestate',
                'ยานยนต์': 'auto', auto: 'auto', cars: 'auto',
              };
              Object.assign(KEYWORD_TO_TOPIC, {
                '\u0e44\u0e0b\u0e40\u0e1a\u0e2d\u0e23\u0e4c': 'security',
                security: 'security',
                cybersecurity: 'security',
                infosec: 'security',
                threat: 'security',
                malware: 'security',
                '\u0e19\u0e31\u0e01\u0e1e\u0e31\u0e12\u0e19\u0e32': 'developer',
                developer: 'developer',
                dev: 'developer',
                coding: 'developer',
                programming: 'developer',
                devops: 'developer',
                cloud: 'developer',
              });
              const matchedTopic = Object.entries(KEYWORD_TO_TOPIC).find(([kw]) => q.includes(kw))?.[1];
              const matchedSources = matchedTopic ? (RSS_CATALOG[matchedTopic] || []) : [];
              const subscribedIds = new Set(subscribedSources.map((s) => s.id));

              if (matchedSources.length === 0 || !q) return null;

              return (
                <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid var(--glass-border)' }} className="animate-fade-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Newspaper size={14} style={{ color: 'var(--accent-secondary)' }} />
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      แหล่งข่าวที่เกี่ยวข้อง
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>· {matchedSources.length} แหล่ง</span>
                  </div>
                  <div className="audience-matched-source-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {matchedSources.slice(0, 4).map((source) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        isSubscribed={subscribedIds.has(source.id)}
                        onToggle={() => onToggleSource(source)}
                        postLists={postLists}
                        onTogglePostList={handleToggleMemberInList}
                      />
                    ))}
                  </div>
                  {matchedSources.length > 4 && (
                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                      <button
                        onClick={() => setAudienceTab('sources')}
                        className="btn-pill"
                        style={{ fontSize: '11px' }}
                      >
                        ดูแหล่งข่าวทั้งหมด ({matchedSources.length})
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="audience-category-section" style={{ borderTop: 'none', paddingTop: '0' }}>
              <div className="audience-category-image-grid">

                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => { setAiQuery(cat.label); handleAiSearchAudience(cat.label); }}
                    className="category-image-card"
                  >
                    <img src={`${import.meta.env.BASE_URL}categories/${cat.image}`} alt={cat.label} loading="lazy" />
                    <div className="category-image-gradient"></div>
                    <span className="category-image-label">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {audienceTab === 'sources' && (
          <NewsSourcesTab
            subscribedSources={subscribedSources}
            onToggleSource={onToggleSource}
            postLists={postLists}
            onTogglePostList={handleToggleMemberInList}
          />
        )}

        {audienceTab === 'manual' && (
          <div className="animate-fade-in">
            <div style={{ maxWidth: '640px', marginBottom: '40px' }}>
              <div className="audience-manual-label" style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {'\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e14\u0e49\u0e27\u0e22 X Username \u0e42\u0e14\u0e22\u0e15\u0e23\u0e07'}
              </div>
              <form onSubmit={handleManualSearch} className="manual-search-form audience-command-row" style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                <div className="custom-input-wrapper">
                  <Search size={16} />
                  <input
                    placeholder={'\u0e01\u0e23\u0e2d\u0e01 X Username (\u0e40\u0e0a\u0e48\u0e19 elonmusk)...'}
                    value={manualQuery}
                    onChange={(e) => {
                      setManualQuery(e.target.value);
                      setShowSuggestions(true);
                      setActiveSuggestionIndex(-1);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') setActiveSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
                      else if (e.key === 'ArrowUp') setActiveSuggestionIndex((prev) => Math.max(prev - 1, -1));
                      else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                        const sel = suggestions[activeSuggestionIndex];
                        setManualQuery(sel);
                        setShowSuggestions(false);
                      }
                    }}
                  />
                </div>
                <button type="submit" className="btn-sync-premium" style={{ height: '44px', padding: '0 28px' }}>
                  {'\u0e04\u0e49\u0e19\u0e2b\u0e32'}
                </button>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="search-suggestions-dropdown" style={{ top: '100%', left: 0, right: 0, marginTop: '8px', zIndex: 1000 }}>
                    {suggestions.map((item, idx) => (
                      <div key={item} className={`suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`} onClick={() => { setManualQuery(item); setShowSuggestions(false); }}>
                        <Search size={14} className="suggestion-icon" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </form>
              {manualPreview && (
                <div className="preview-card" style={{ padding: '20px', borderRadius: '16px', marginTop: '24px' }}>
                  <img
                    src={manualPreview.profile_image_url}
                    style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-700)' }}
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(manualPreview.name)}&background=random&color=fff`;
                      e.target.onerror = null;
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{manualPreview.name}</div>
                    <div style={{ color: 'var(--accent-secondary)', fontWeight: '700' }}>@{manualPreview.username}</div>
                  </div>
                  <button onClick={() => handleAddUser(manualPreview)} className="btn-pill primary" style={{ height: '40px', padding: '0 24px' }}>
                    {'+ \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e02\u0e49\u0e32 Watchlist'}
                  </button>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '32px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {'\u25ae \u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e17\u0e35\u0e48\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e2d\u0e22\u0e39\u0e48'} ({watchlist.length + subscribedSources.length})
              </div>
              <div className="watchlist-grid">
                {watchlist.map((user) => (
                  <UserCard key={user.id} user={user} postLists={postLists} onToggleList={handleToggleMemberInList} onRemove={handleRemoveAccountGlobal} />
                ))}
                {subscribedSources.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    isSubscribed={true}
                    onToggle={() => onToggleSource(source)}
                    postLists={postLists}
                    onTogglePostList={handleToggleMemberInList}
                    compact={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudienceWorkspace;
