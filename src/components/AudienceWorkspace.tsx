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
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import UserCard from './UserCard';

const AudienceWorkspace = ({
  isVisible,
  audienceKey,
  audienceTab,
  setAudienceTab,
  aiQuery,
  setAiQuery,
  handleAiSearchAudience,
  aiSearchLoading,
  aiSearchResults,
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
}) => {
  const CATEGORIES = [
    { icon: Cpu, label: '\u0e40\u0e17\u0e04\u0e42\u0e19\u0e42\u0e25\u0e22\u0e35', tone: 'blue' },
    { icon: Bot, label: 'AI', tone: 'violet' },
    { icon: BriefcaseBusiness, label: '\u0e18\u0e38\u0e23\u0e01\u0e34\u0e08', tone: 'amber' },
    { icon: TrendingUp, label: '\u0e01\u0e32\u0e23\u0e15\u0e25\u0e32\u0e14', tone: 'rose' },
    { icon: BadgeDollarSign, label: '\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19', tone: 'emerald' },
    { icon: ChartColumn, label: '\u0e01\u0e32\u0e23\u0e25\u0e07\u0e17\u0e38\u0e19', tone: 'cyan' },
    { icon: Bitcoin, label: '\u0e04\u0e23\u0e34\u0e1b\u0e42\u0e15', tone: 'orange' },
    { icon: HeartPulse, label: '\u0e2a\u0e38\u0e02\u0e20\u0e32\u0e1e', tone: 'red' },
    { icon: Leaf, label: '\u0e44\u0e25\u0e1f\u0e4c\u0e2a\u0e44\u0e15\u0e25\u0e4c', tone: 'green' },
    { icon: Globe2, label: '\u0e40\u0e28\u0e23\u0e29\u0e10\u0e01\u0e34\u0e08', tone: 'sky' },
    { icon: Landmark, label: '\u0e01\u0e32\u0e23\u0e40\u0e21\u0e37\u0e2d\u0e07', tone: 'slate' },
    { icon: BrainCircuit, label: '\u0e01\u0e32\u0e23\u0e1e\u0e31\u0e12\u0e19\u0e32\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07', tone: 'pink' },
  ];

  return (
    <div style={{ display: isVisible ? 'block' : 'none' }}>
      <div key={audienceKey} className="animate-fade-in">
        <header className="dashboard-header audience-hero-header" style={{ marginBottom: '28px', paddingTop: '0' }}>
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
          <button onClick={() => setAudienceTab('ai')} className={`audience-tab-btn ${audienceTab === 'ai' ? 'active-ai' : ''}`}>
            <Sparkles size={14} strokeWidth={2.1} />
            {'\u0e41\u0e19\u0e30\u0e19\u0e33\u0e42\u0e14\u0e22 AI'}
          </button>
          <button onClick={() => setAudienceTab('manual')} className={`audience-tab-btn ${audienceTab === 'manual' ? 'active-manual' : ''}`}>
            <Search size={14} strokeWidth={2.1} />
            {'\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e0a\u0e37\u0e48\u0e2d'}
          </button>
        </div>

        {audienceTab === 'ai' && (
          <div className="animate-fade-in">
            <div className="audience-ai-searchbar audience-command-row" style={{ display: 'flex', gap: '12px', marginBottom: '32px', maxWidth: '680px' }}>
              <div className="audience-ai-search-input">
                <input
                  type="text"
                  placeholder={'\u0e2d\u0e22\u0e32\u0e01\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e40\u0e17\u0e04\u0e42\u0e19\u0e42\u0e25\u0e22\u0e35 AI...'}
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSearchAudience()}
                  style={{ background: 'transparent', border: 'none', color: '#fff', flex: 1, fontSize: '14px', outline: 'none' }}
                />
              </div>
              <button onClick={() => handleAiSearchAudience()} disabled={aiSearchLoading} className="btn-sync-premium" style={{ height: '48px', padding: '0 24px' }}>
                {aiSearchLoading ? <RefreshCw size={15} className="animate-spin" /> : '\u0e04\u0e49\u0e19\u0e2b\u0e32'}
              </button>
            </div>

            {aiSearchLoading && aiSearchResults.length === 0 && (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div className="ai-loader-ring" style={{ margin: '0 auto 20px' }}></div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent-secondary)' }} className="animate-pulse">
                  AI ANALYST IS SCANNING...
                </div>
              </div>
            )}

            {!aiSearchLoading && aiSearchResults.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div className="expert-grid" style={{ marginBottom: '24px' }}>
                  {aiSearchResults.map((expert, i) => {
                    const isAdded = watchlist.find((w) => w.username.toLowerCase() === expert.username.toLowerCase());
                    return (
                      <div key={expert.username} className="expert-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div className="ai-pick-pill">
                            <Sparkles size={10} /> AI PICK
                          </div>
                          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                const btn = e.currentTarget;
                                const menu = btn.nextElementSibling;
                                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                              }}
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
                        <img
                          src={`https://unavatar.io/twitter/${expert.username}`}
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
                        <a href={`https://x.com/${expert.username}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '8px', width: 'fit-content' }}>
                          <div className="expert-name" style={{ fontSize: '14px', color: '#fff', fontWeight: '800' }}>{expert.name}</div>
                          <div className="expert-username" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>@{expert.username}</div>
                        </a>
                        <div className="expert-reasoning" style={{ fontSize: '13px', marginBottom: '16px', flex: 1, color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
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

            <div className="audience-category-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '28px' }}>
              <div className="audience-category-heading">Discover By Category</div>
              <div className="audience-category-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.label} onClick={() => { setAiQuery(cat.label); handleAiSearchAudience(cat.label); }} className={`category-btn category-btn-${cat.tone}`}>
                      <span className="category-btn-icon-wrap">
                        <Icon size={18} strokeWidth={2.1} />
                      </span>
                      <span className="category-btn-label">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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
                {'\u25ae \u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e17\u0e35\u0e48\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e2d\u0e22\u0e39\u0e48'} ({watchlist.length})
              </div>
              <div className="watchlist-grid">
                {watchlist.map((user) => (
                  <UserCard key={user.id} user={user} postLists={postLists} onToggleList={handleToggleMemberInList} onRemove={handleRemoveAccountGlobal} />
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
