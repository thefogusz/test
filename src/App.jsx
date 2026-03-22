import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  Undo2, 
  Eye, 
  Heart, 
  Zap, 
  X, 
  Plus, 
  FileCode, 
  Share2, 
  PenTool, 
  Loader2, 
  Filter, 
  Copy,
  List,
  LayoutGrid,
  Activity,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import FeedCard from './components/FeedCard';
import CreateContent from './components/CreateContent';
import {
  curateSearchResults,
  filterTweetsWithinHours,
  getUserInfo,
  fetchWatchlistFeed,
  RECENT_WINDOW_HOURS,
  searchEverything,
} from './services/TwitterService';
import { agentFilterFeed, buildSearchPlan, discoverTopExperts, generateExecutiveSummary, generateGrokBatch } from './services/GrokService';
import { renderMarkdownToHtml } from './utils/markdown';
import './index.css';

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const mergeUniquePostsById = (...collections) => {
  const byId = new Map();

  collections
    .flat()
    .filter(Boolean)
    .forEach((post) => {
      if (!post?.id) return;
      const existing = byId.get(post.id);
      byId.set(post.id, {
        ...existing,
        ...post,
        author: post.author || existing?.author,
      });
    });

  return Array.from(byId.values());
};

const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/;

const hasThaiCharacters = (value) => THAI_CHAR_REGEX.test((value || '').trim());

const hasUsefulThaiSummary = (summary, originalText = '') => {
  const trimmedSummary = (summary || '').trim();
  const trimmedOriginal = (originalText || '').trim();

  if (!trimmedSummary) return false;
  if (trimmedSummary.startsWith('(Grok')) return false;
  if (trimmedOriginal && trimmedSummary === trimmedOriginal) return false;

  return hasThaiCharacters(trimmedSummary);
};

const sanitizeStoredPost = (post) => {
  if (!post || typeof post !== 'object' || post.type === 'article') return post;
  if (!Object.prototype.hasOwnProperty.call(post, 'summary')) return post;
  if (hasUsefulThaiSummary(post.summary, post.text)) return post;

  const { summary: _summary, ...rest } = post;
  return rest;
};

const sanitizeStoredCollection = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map(sanitizeStoredPost);
};

const sanitizeStoredSingle = (item) => {
  if (!item || typeof item !== 'object') return item;
  return sanitizeStoredPost(item);
};

const sanitizeCollectionState = (items) => {
  if (!Array.isArray(items)) return items;

  let changed = false;
  const nextItems = items.map((item) => {
    const sanitized = sanitizeStoredPost(item);
    if (sanitized !== item) changed = true;
    return sanitized;
  });

  return changed ? nextItems : items;
};

const getEngagementTotal = (post) =>
  (parseInt(post?.retweet_count) || 0) +
  (parseInt(post?.reply_count) || 0) +
  (parseInt(post?.like_count) || 0) +
  (parseInt(post?.quote_count) || 0);

const getSearchFallbackResults = (tweets, requestedQuery, isLatestMode) =>
  curateSearchResults(tweets, requestedQuery, {
    latestMode: isLatestMode,
    preferCredibleSources: true,
  });

const mergePlanLabelsIntoQuery = (requestedQuery, topicLabels = []) =>
  [requestedQuery, ...topicLabels].filter(Boolean).join(' ');

// ---- UserCard: proper component with per-card menu state ----
const UserCard = ({ user, onRemove, postLists = [], onToggleList }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpen]);

  return (
    <div
      style={{ background: 'var(--bg-800)', borderRadius: '16px', border: '1px solid var(--card-border)', padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
    >
      {/* 3-dot menu */}
      <div style={{ position: 'absolute', top: '10px', right: '10px' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          style={{ background: 'var(--bg-800)', border: '1px solid var(--glass-border)', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px 8px', fontSize: '14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
        >
          <Plus size={14} />
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '8px', background: 'var(--bg-900)', border: '1px solid var(--glass-border)', borderRadius: '12px', zIndex: 100, width: '200px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--glass-border)', fontSize: '11px', fontWeight: '800', color: 'var(--accent-secondary)' }}>ADD TO LIST</div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {postLists.length === 0 && (
                <div style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-dim)' }}>ยังไม่มี Post List</div>
              )}
              {postLists.map(list => {
                const isMember = list.members.some(m => m.toLowerCase() === user.username.toLowerCase());
                return (
                  <button
                    key={list.id}
                    onClick={() => { onToggleList(list.id, user.username); setMenuOpen(false); }}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: isMember ? 'var(--accent-secondary)' : '#fff', cursor: 'pointer', padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{list.name}</span>
                    {isMember && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-secondary)' }} />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { onRemove(user.id); setMenuOpen(false); }}
              style={{ width: '100%', background: 'rgba(239,68,68,0.05)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '12px 14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}
            >
              ✕ Remove from Feed
            </button>
          </div>
        )}
      </div>

      <img
        src={user.profile_image_url}
        alt={user.name}
        style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', objectFit: 'cover', border: '2px solid var(--bg-700)' }}
        onError={e => { 
          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`; 
        }}
      />
      <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{user.username}</div>

      <a
        href={`https://x.com/${user.username}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%', padding: '8px 0', background: 'var(--bg-700)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', textDecoration: 'none', transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-700)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Profile
      </a>
    </div>
  );
};

// ---- ErrorBoundary: contains crashes in CreateContent without nuking the full app ----
class ContentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ContentErrorBoundary] Caught crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>มีบางอย่างผิดพลาดระหว่างแสดงผล</h3>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>เนื้อหาอาจถูกสร้างเรียบร้อยแล้ว เพียงแต่ Markdown Renderer ขัดข้อง</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            style={{ padding: '10px 24px', borderRadius: '999px', background: '#2997ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
          >
            ลองอีกครั้ง
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('foro_watchlist_v2');
    const parsed = safeParse(saved, []);
    return Array.isArray(parsed) ? parsed.filter(u => u && u.username) : [];
  });
  
  const [feed, setFeed] = useState([]);
  const [originalFeed, setOriginalFeed] = useState(() => {
    const saved = localStorage.getItem('foro_home_feed_v1');
    return sanitizeStoredCollection(safeParse(saved, []));
  });
  const [deletedFeed, setDeletedFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [aiReport, setAiReport] = useState('');
  const [activeFilters, setActiveFilters] = useState({ view: false, like: false });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [originalSearchResults, setOriginalSearchResults] = useState([]);
  const [searchSummary, setSearchSummary] = useState('');
  const [searchFilters, setSearchFilters] = useState({ view: false, engagement: false });
  const [isSearching, setIsSearching] = useState(false);
  const [searchCursor, setSearchCursor] = useState(null);
  const [activeSearchPlan, setActiveSearchPlan] = useState(null);
  const [onlyNews] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLatestMode, setIsLatestMode] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isLiveSearching, setIsLiveSearching] = useState(false);

  const commonKeywords = [
    'AI Trends 2026', 'สรุปข่าว AI รายวัน', 'Web3 & Crypto News', 
    'วิเคราะห์การเมืองไทย', 'Tech Industry Updates', 'Sustainability & ESG',
    'Global Economy Outlook', 'รีวิว Gadget ล่าสุด', 'Startup Funding News',
    'Cybersecurity Alerts', 'Future of Work', 'Space Exploration'
  ];

  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('foro_bookmarks_v1');
    return sanitizeStoredCollection(safeParse(saved, []));
  });
  const [bookmarkTab, setBookmarkTab] = useState('news');
  const [editingArticleId, setEditingArticleId] = useState(null);
  
  const [isMobilePostListOpen, setIsMobilePostListOpen] = useState(false);
  const [readArchive, setReadArchive] = useState(() => {
    const saved = localStorage.getItem('foro_read_archive_v1');
    return sanitizeStoredCollection(safeParse(saved, []));
  });

  const [createContentSource, setCreateContentSource] = useState(() => {
    const saved = localStorage.getItem('foro_attached_source_v1');
    return sanitizeStoredSingle(safeParse(saved, null));
  });

  const [postLists, setPostLists] = useState(() => {
    const saved = localStorage.getItem('foro_postlists_v2');
    return safeParse(saved, []);
  });
  const [activeListId, setActiveListId] = useState(null);
  const [activeView, setActiveView] = useState('home');
  const [contentTab, setContentTab] = useState('search');
  const [listModal, setListModal] = useState({ show: false, mode: 'create', value: '' });
  const [filterModal, setFilterModal] = useState({ show: false, prompt: '' });
  const [readFilters, setReadFilters] = useState({ view: false, engagement: false });

  const [audienceTab, setAudienceTab] = useState('ai'); 
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [manualQuery, setManualQuery] = useState('');
  const [manualPreview, setManualPreview] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('foro_watchlist_v2', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('foro_postlists_v2', JSON.stringify(postLists));
  }, [postLists]);

   useEffect(() => {
     localStorage.setItem('foro_bookmarks_v1', JSON.stringify(bookmarks));
   }, [bookmarks]);

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (aiReport) {
      const timer = setTimeout(() => setAiReport(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [aiReport]);

  useEffect(() => {
    localStorage.setItem('foro_read_archive_v1', JSON.stringify(readArchive));
  }, [readArchive]);

  useEffect(() => {
    localStorage.setItem('foro_home_feed_v1', JSON.stringify(originalFeed));
  }, [originalFeed]);

  useEffect(() => {
    if (createContentSource) {
      localStorage.setItem('foro_attached_source_v1', JSON.stringify(createContentSource));
    } else {
      localStorage.removeItem('foro_attached_source_v1');
    }
  }, [createContentSource]);

  useEffect(() => {
    setOriginalFeed(prev => sanitizeCollectionState(prev));
    setReadArchive(prev => sanitizeCollectionState(prev));
    setBookmarks(prev => sanitizeCollectionState(prev));
    setCreateContentSource(prev => sanitizeStoredSingle(prev));
  }, []);

  useEffect(() => {
    if (activeView === 'search') return; 
    
    if (activeListId) {
      const activeList = postLists.find(l => l.id === activeListId);
      if (activeList) {
        const filtered = originalFeed.filter(post => 
          post && post.author && activeList.members.some(m => (m || '').toLowerCase() === (post.author.username || '').toLowerCase())
        );
        setFeed(filtered);
      }
    } else if (activeView === 'home') {
      const watchlistHandles = watchlist.map(w => (w.username || '').toLowerCase()).filter(Boolean);
      const filtered = originalFeed.filter(post => 
        post && post.author && (post.author.username || '').toLowerCase() && 
        watchlistHandles.includes((post.author.username || '').toLowerCase())
      );
      setFeed(filtered);
    }
  }, [activeListId, originalFeed, activeView, postLists, watchlist]);

  const handleSync = async () => {
    if (watchlist.length === 0) {
      setStatus('กรุณาเพิ่มบัญชีที่ต้องการติดตามก่อนซิงค์ข้อมูล');
      return;
    }
    setLoading(true);
    setStatus('กำลังเชื่อมต่อฐานข้อมูล... ดึงฟีดข่าวล่าสุด');
    const startTime = Date.now();
    try {
      const activeList = activeListId ? postLists.find(l => l.id === activeListId) : null;
      const rawAccounts = activeList ? activeList.members : watchlist;
      const targetAccounts = Array.isArray(rawAccounts) 
        ? rawAccounts.map(u => typeof u === 'string' ? u : u.username).filter(Boolean)
        : [];

      if (targetAccounts.length === 0) {
        setStatus(activeList ? 'Post List นี้ยังไม่มีสมาชิกให้ซิงค์' : 'กรุณาเพิ่มบัญชีที่ต้องการติดตามก่อนซิงค์ข้อมูล');
        return;
      }
      
      const { data, meta } = await fetchWatchlistFeed(targetAccounts, '', 'Latest');
      setNextCursor(meta.next_cursor);
      
      if (data.length > 0) {
        setStatus(`พบ ${data.length} ข่าวใหม่! กำลังทยอยแปลและสรุปเป็นภาษาไทย...`);
        const CHUNK_SIZE = 10;
        let runningFeed = [...originalFeed]; 
        
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          const toSummarize = chunk.filter(t => {
            const existing = runningFeed.find(p => p.id === t.id);
            return !hasUsefulThaiSummary(existing?.summary || t.summary, existing?.text || t.text);
          });

          if (toSummarize.length > 0) {
            const batchTexts = toSummarize.map(t => t.text);
            const summaries = await generateGrokBatch(batchTexts);
            toSummarize.forEach((post, idx) => {
              post.summary = summaries[idx] || post.text;
            });
          }

          setOriginalFeed(prev => {
            const postMap = new Map(prev.map(p => [p.id, p]));
            chunk.forEach(newPost => {
              const normalizedNewPost = sanitizeStoredPost(newPost);
              if (postMap.has(newPost.id)) {
                postMap.set(newPost.id, { ...sanitizeStoredPost(postMap.get(newPost.id)), ...normalizedNewPost });
              } else {
                postMap.set(newPost.id, normalizedNewPost);
              }
            });
            const nextList = Array.from(postMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            runningFeed = nextList;
            return nextList;
          });

          setReadArchive(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = chunk.filter(p => !existingIds.has(p.id));
            if (newItems.length > 0) return [...newItems, ...prev];
            return prev;
          });
        }
      }
      setStatus('อัปเดตข้อมูลเรียบร้อย');
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = (tweet, isSaving) => {
    if (isSaving) {
      setBookmarks(prev => {
        if (prev.find(p => p.id === tweet.id)) return prev;
        return [tweet, ...prev];
      });
    } else {
      setBookmarks(prev => prev.filter(p => p.id !== tweet.id));
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const activeList = activeListId ? postLists.find(l => l.id === activeListId) : null;
      const targetAccounts = activeList ? activeList.members : watchlist;
      const { data, meta } = await fetchWatchlistFeed(targetAccounts, nextCursor, 'Latest');
      setOriginalFeed(prev => [...prev, ...data]);
      setNextCursor(meta.next_cursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e, isMore = false, overrideQuery = '') => {
    if (e) e.preventDefault();
    const requestedQuery = overrideQuery || searchQuery;
    if (!requestedQuery && !isMore) return;
    setIsSearching(true);
    if (!isMore) setSearchSummary('');
    setStatus(`AI กำลังค้นหาข้อมูลสำหรับ "${requestedQuery}"...`);

    try {
      let searchPlan = activeSearchPlan;
      if (!isMore) {
        searchPlan = await buildSearchPlan(requestedQuery, isLatestMode);
        setActiveSearchPlan(searchPlan);
      }
      
      const planQueries = !isMore && searchPlan?.queries?.length > 0 ? searchPlan.queries : [requestedQuery];
      const rankingQuery = mergePlanLabelsIntoQuery(requestedQuery, searchPlan?.topicLabels || []);

      let data = [];
      let meta = { next_cursor: null };

      if (isLatestMode) {
        const response = await searchEverything(planQueries[0], isMore ? searchCursor : null, onlyNews, 'Latest');
        data = filterTweetsWithinHours(response.data, RECENT_WINDOW_HOURS);
        meta = response.meta;
      } else {
        const response = await searchEverything(planQueries[0], isMore ? searchCursor : null, onlyNews, 'Top');
        data = response.data;
        meta = response.meta;
      }

      if (data.length > 0) {
        const validIds = await agentFilterFeed(data, rankingQuery);
        const cleanData = data.filter(t => validIds.includes(t.id));
        
        if (!isMore) {
          const summaryText = await generateExecutiveSummary(cleanData.slice(0, 5), requestedQuery);
          setSearchSummary(summaryText);
        }

        const nextResults = isMore ? mergeUniquePostsById(searchResults, cleanData) : cleanData;
        setSearchResults(nextResults);
        setOriginalSearchResults(nextResults);
        setSearchCursor(meta.next_cursor);
        
        // Progressive Translation for results...
        const CHUNK_SIZE = 5;
        for (let i = 0; i < cleanData.length; i += CHUNK_SIZE) {
          const chunk = cleanData.slice(i, i + CHUNK_SIZE);
          const batchTexts = chunk.map(t => t.text);
          const summaries = await generateGrokBatch(batchTexts);
          
          setSearchResults(prev => prev.map(p => {
            const idx = chunk.findIndex(c => c.id === p.id);
            if (idx !== -1) return { ...p, summary: summaries[idx] || p.text };
            return p;
          }));
        }
      }
      setStatus(`ค้นพบ ${data.length} รายการ`);
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearching(false);
      setIsLiveSearching(false);
    }
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3 || activeView !== 'content' || contentTab !== 'search') {
      setSuggestions([]);
      return;
    }
    const filteredSuggestions = commonKeywords.filter(kw => 
      kw.toLowerCase().includes(searchQuery.toLowerCase()) && kw.toLowerCase() !== searchQuery.toLowerCase()
    ).slice(0, 5);
    setSuggestions(filteredSuggestions);

    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 3) {
        setIsLiveSearching(true);
        handleSearch(null, false, searchQuery);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQuery, activeView, contentTab]);

  const resolvePlaceholders = async (nodes) => {
    for (const placeholder of nodes) {
      if (!placeholder.username) continue;
      try {
        const realData = await getUserInfo(placeholder.username);
        if (realData) {
          setWatchlist(current => current.map(u => 
            (u.username || '').toLowerCase() === (placeholder.username || '').toLowerCase() ? { ...realData, isPlaceholder: false } : u
          ));
        }
      } catch (err) { console.error(err); }
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const finalizeListAction = async () => {
    if (!listModal.value) return;
    if (listModal.mode === 'create') {
      const newList = { id: Date.now().toString(), name: listModal.value, color: 'var(--accent-secondary)', members: [], createdAt: new Date().toISOString() };
      setPostLists([...postLists, newList]);
      setActiveListId(newList.id);
    } else {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(listModal.value))));
        const newList = { ...decoded, id: Date.now().toString(), createdAt: new Date().toISOString() };
        setPostLists([...postLists, newList]);
      } catch (err) { console.error(err); }
    }
    setListModal({ show: false, mode: 'create', value: '' });
  };

  const handleRemoveAccountGlobal = (id) => {
    const target = watchlist.find(u => u.id === id);
    if (!target) return;
    setWatchlist(prev => prev.filter(w => w.id !== id));
    setPostLists(prev => prev.map(l => ({ ...l, members: l.members.filter(m => m.toLowerCase() !== target.username.toLowerCase()) })));
  };

  const handleDeleteAll = () => {
    setDeletedFeed([...originalFeed]);
    setOriginalFeed([]);
    setFeed([]);
  };

  const handleUndo = () => {
    if (deletedFeed.length > 0) {
      setOriginalFeed([...deletedFeed]);
      setDeletedFeed([]);
    }
  };

  const handleRemoveList = (id) => {
    setPostLists(prev => prev.filter(l => l.id !== id));
    if (activeListId === id) setActiveListId(null);
  };

  const handleUpdateList = (id, updates) => setPostLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

  const handleAddMember = (listId, handle) => {
    const cleanHandle = handle.trim().replace(/^@/, '');
    setPostLists(prev => prev.map(l => l.id === listId ? { ...l, members: [...new Set([...l.members, cleanHandle.toLowerCase()])] } : l));
    if (!watchlist.find(u => u.username.toLowerCase() === cleanHandle.toLowerCase())) {
      const newUser = { id: cleanHandle, username: cleanHandle, name: cleanHandle, profile_image_url: '', isPlaceholder: true };
      setWatchlist(prev => [...prev, newUser]);
      resolvePlaceholders([newUser]);
    }
  };

  const handleRemoveMember = (handle, listId) => setPostLists(prev => prev.map(l => l.id === listId ? { ...l, members: l.members.filter(m => m.toLowerCase() !== handle.toLowerCase()) } : l));

  const handleShareList = (list) => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify({ name: list.name, members: list.members, color: list.color }))));
    navigator.clipboard.writeText(code).then(() => setStatus('คัดลอกรหัสแชร์แล้ว'));
  };

  const handleSort = (type) => {
    setActiveFilters(prev => {
      const next = { ...prev, [type]: !prev[type] };
      const sorted = [...feed].sort((a, b) => {
        const scoreA = (next.view ? (parseInt(a.view_count) || 0) : 0) + (next.engagement ? getEngagementTotal(a) : 0);
        const scoreB = (next.view ? (parseInt(b.view_count) || 0) : 0) + (next.engagement ? getEngagementTotal(b) : 0);
        return scoreB - scoreA;
      });
      setFeed(sorted);
      return next;
    });
  };

  const handleSearchSort = (type) => {
    setSearchFilters(prev => {
      const next = { ...prev, [type]: !prev[type] };
      const sorted = [...searchResults].sort((a, b) => {
        const scoreA = (next.view ? (parseInt(a.view_count) || 0) : 0) + (next.engagement ? getEngagementTotal(a) : 0);
        const scoreB = (next.view ? (parseInt(b.view_count) || 0) : 0) + (next.engagement ? getEngagementTotal(b) : 0);
        return scoreB - scoreA;
      });
      setSearchResults(sorted);
      return next;
    });
  };

  const handleAiFilter = async () => {
    if (!filterModal.prompt) return;
    setLoading(true);
    const validIds = await agentFilterFeed(feed, filterModal.prompt);
    setFeed(feed.filter(t => validIds.includes(t.id)));
    setFilterModal({ show: false, prompt: '' });
    setLoading(false);
  };

  const handleAiSearchAudience = async (q, isMore = false) => {
    const query = q || aiQuery;
    setAiSearchLoading(true);
    const experts = await discoverTopExperts(query);
    setAiSearchResults(isMore ? [...aiSearchResults, ...experts] : experts);
    setAiSearchLoading(false);
  };

  const handleAddExpert = async (expert) => {
    const full = await getUserInfo(expert.username);
    if (full) setWatchlist(prev => [full, ...prev]);
  };

  const handleToggleMemberInList = (listId, handle) => {
    const cleanHandle = (handle || '').trim().replace(/^@/, '').toLowerCase();
    if (!cleanHandle) return;

    setPostLists(prev => prev.map(l => {
      if (l.id !== listId) return l;
      const alreadyIn = l.members.some(m => m.toLowerCase() === cleanHandle);
      if (alreadyIn) {
        return { ...l, members: l.members.filter(m => m.toLowerCase() !== cleanHandle) };
      } else {
        return { ...l, members: [...l.members, cleanHandle] };
      }
    }));
  };

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    setManualLoading(true);
    const data = await getUserInfo(manualQuery);
    setManualPreview(data);
    setManualLoading(false);
  };

  const handleAddUser = (user) => {
    setWatchlist(prev => [user, ...prev]);
    setManualPreview(null);
    setManualQuery('');
  };

  return (
    <div className="foro-layout">
      <Sidebar 
        activeView={activeView}
        onNavClick={(view) => {
          setActiveView(view);
          setActiveListId(null);
          if (view === 'home') { setSearchQuery(''); setSearchResults([]); }
        }}
      />

      {isMobilePostListOpen && (
        <div className="mobile-backdrop" onClick={() => setIsMobilePostListOpen(false)} />
      )}

      <main className="foro-main">
        <div className="foro-main-scroll">

          {/* ===== HOME VIEW ===== */}
          {activeView === 'home' && (
            <div className="animate-fade-in">
              <header className="dashboard-header" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                <div className="mobile-only-flex" style={{ justifyContent: 'center', width: '100%', marginBottom: '-8px' }}>
                  <img src="logo.png" alt="FO" style={{ height: '24px', width: 'auto' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: '500' }}>WATCHLIST FEED</div>
                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: activeListId ? (postLists.find(l => l.id === activeListId)?.color || 'inherit') : 'inherit' }}>
                      {activeListId ? postLists.find(l => l.id === activeListId)?.name : 'หน้าหลัก'}
                    </h1>
                  </div>
                  <button className="mobile-only-flex icon-btn-large" onClick={() => setIsMobilePostListOpen(true)}><List size={20} /></button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleDeleteAll} className="icon-btn-large"><Trash2 size={18} /></button>
                    <button onClick={handleUndo} className="icon-btn-large"><Undo2 size={18} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setFilterModal({ show: true, prompt: '' })} className="btn-pill">AI Filter</button>
                    <button onClick={handleSync} disabled={loading} className="btn-pill primary">
                      {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} ซิงค์ข้อมูล
                    </button>
                  </div>
                </div>
              </header>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div className="section-title">โพสต์ล่าสุด</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleSort('view')} className={`btn-pill ${activeFilters.view ? 'active' : ''}`}>ยอดวิว</button>
                  <button onClick={() => handleSort('engagement')} className={`btn-pill ${activeFilters.engagement ? 'active' : ''}`}>เอนเกจเมนต์</button>
                </div>
              </div>
              <div className="feed-grid">
                {feed.length === 0 ? (
                  <div className="empty-state-card">
                    {watchlist.length === 0 ? 'เริ่มโดยการเพิ่มบัญชีที่ต้องการติดตาม' : 'กดปุ่มซิงค์ข้อมูลเพื่อสรุปข่าว'}
                  </div>
                ) : (
                  feed.map((item, idx) => (
                    <FeedCard key={item.id || idx} tweet={item} 
                      isBookmarked={bookmarks.some(b => b.id === item.id)}
                      onBookmark={handleBookmark}
                      onArticleGen={(it) => { setCreateContentSource(it); setActiveView('content'); setTimeout(() => setContentTab('create'), 0); }} 
                    />
                  ))
                )}
              </div>
              {nextCursor && !loading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <button onClick={handleLoadMore} className="btn-pill">โหลดเพิ่มเติม</button>
                </div>
              )}
            </div>
          )}

          {/* ===== UNIFIED CONTENT VIEW ===== */}
          {activeView === 'content' && (
            <div className="unified-content-view animate-fade-in">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                <button className={`btn-pill ${contentTab === 'search' ? 'primary' : ''}`} onClick={() => setContentTab('search')}>
                  <Search size={16} /> ค้นหา
                </button>
                <button className={`btn-pill ${contentTab === 'create' ? 'primary' : ''}`} onClick={() => setContentTab('create')}>
                  <Sparkles size={16} /> สร้างบทความ
                </button>
              </div>

              {contentTab === 'create' && (
                <div className="animate-fade-in">
                  <ContentErrorBoundary key={createContentSource?.id}>
                    <CreateContent 
                      sourceNode={createContentSource} 
                      onRemoveSource={() => setCreateContentSource(null)}
                      onSaveArticle={(title, content) => {
                        const newArt = { id: Date.now().toString(), type: 'article', title: title || 'บทความ AI', summary: content, created_at: new Date().toISOString() };
                        setBookmarks(prev => [newArt, ...prev]);
                      }}
                    />
                  </ContentErrorBoundary>
                </div>
              )}

              {contentTab === 'search' && (
                <div className="search-discovery-view animate-fade-in">
                  <div className="hero-search-container">
                    <h1 className="hero-search-title">ค้นหาคอนเทนต์</h1>
                    <div className="hero-search-wrapper">
                      <form onSubmit={(e) => { e.preventDefault(); handleSearch(e); setShowSuggestions(false); }} className="hero-search-form">
                        <Search size={20} className="hero-search-icon" />
                        <input
                          type="text"
                          className="hero-search-input"
                          placeholder="พิมพ์คีย์เวิร์ดที่สนใจ..."
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); setActiveSuggestionIndex(-1); }}
                          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') setActiveSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                            else if (e.key === 'ArrowUp') setActiveSuggestionIndex(prev => Math.max(prev - 1, -1));
                            else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                              const sel = suggestions[activeSuggestionIndex];
                              setSearchQuery(sel); handleSearch(null, false, sel); setShowSuggestions(false);
                            }
                          }}
                        />
                        <div className="hero-search-actions">
                          {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSuggestions([]); }} className="hero-clear-btn"><X size={16} /></button>}
                          <button type="submit" className="hero-submit-btn" disabled={isSearching}>
                            {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'ค้นหา'}
                          </button>
                        </div>
                      </form>
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="search-suggestions-dropdown">
                          {suggestions.map((item, idx) => (
                            <div key={item} className={`suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`} onClick={() => { setSearchQuery(item); handleSearch(null, false, item); setShowSuggestions(false); }}>
                              <Search size={14} className="suggestion-icon" /><span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isLiveSearching && !isSearching && <div className="searching-indicator"><RefreshCw size={12} className="animate-spin" /> กำลังประมวลผลการค้นหา...</div>}
                    </div>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="search-results-container">
                      {searchSummary && <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(searchSummary) }} />}
                      <div className="feed-grid">
                        {searchResults.map((item, idx) => <FeedCard key={item.id || idx} tweet={item} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== READ VIEW ===== */}
          {activeView === 'read' && (
            <div className="reader-library-view animate-fade-in">
              <header className="reader-header">
                <h1 className="reader-title">อ่านข่าว</h1>
                <p className="reader-subtitle">บทความและข่าวสารที่คุณบันทึกไว้อ่านแบบ Deep Read</p>
                {activeListId && <div className="active-list-pills">กำลังกรองตาม: {postLists.find(l => l.id === activeListId)?.name}</div>}
              </header>

              {readArchive.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <button onClick={() => setReadFilters(p => ({ ...p, view: !p.view }))} className={`btn-pill ${readFilters.view ? 'active' : ''}`}>ยอดวิว</button>
                  <button onClick={() => setReadFilters(p => ({ ...p, engagement: !p.engagement }))} className={`btn-pill ${readFilters.engagement ? 'active' : ''}`}>เอนเกจเมนต์</button>
                </div>
              )}
              
              <div className="feed-grid">
                {readArchive
                  .filter(item => {
                    if (!activeListId) return true;
                    const activeList = postLists.find(l => l.id === activeListId);
                    if (!activeList) return true;
                    return item && item.author && activeList.members.some(m => m.toLowerCase() === item.author.username?.toLowerCase());
                  })
                  .sort((a, b) => {
                    const scoreA = (readFilters.view ? (parseInt(a.view_count) || 0) : 0) + (readFilters.engagement ? getEngagementTotal(a) : 0);
                    const scoreB = (readFilters.view ? (parseInt(b.view_count) || 0) : 0) + (readFilters.engagement ? getEngagementTotal(b) : 0);
                    return scoreB - scoreA;
                  })
                  .map((item, idx) => (
                    <FeedCard key={item.id || idx} tweet={item} isBookmarked={bookmarks.some(b => b.id === item.id)} onBookmark={handleBookmark} />
                  ))
                }
                {readArchive.length === 0 && <div className="empty-state-card">ยังไม่มีบทความในห้องสมุด</div>}
              </div>
            </div>
          )}

          {/* ===== AUDIENCE VIEW: SMART TARGET DISCOVERY ===== */}
          {activeView === 'audience' && (() => {
            const CATEGORIES = [
              { icon: '⚙️', label: 'เทคโนโลยี' }, { icon: '🤖', label: 'AI' },
              { icon: '💼', label: 'ธุรกิจ' }, { icon: '📈', label: 'การตลาด' },
              { icon: '💹', label: 'การเงิน' }, { icon: '📊', label: 'การลงทุน' },
              { icon: '₿', label: 'คริปโต' }, { icon: '🏥', label: 'สุขภาพ' },
              { icon: '🌿', label: 'ไลฟ์สไตล์' }, { icon: '🌐', label: 'เศรษฐกิจ' },
              { icon: '🏛️', label: 'การเมือง' }, { icon: '🧠', label: 'การพัฒนาตัวเอง' },
            ];

            return (
              <div className="animate-fade-in">
                <header style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '22px' }}>⚡</span>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em' }}>Smart Target Discovery</h1>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginLeft: '32px' }}>ค้นหาและเพิ่มแหล่งข้อมูลที่ตรงกับความสนใจของคุณ</p>
                </header>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', padding: '4px', background: 'var(--bg-800)', borderRadius: '10px', width: 'fit-content' }}>
                  <button onClick={() => setAudienceTab('ai')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', background: audienceTab === 'ai' ? 'var(--accent-gradient)' : 'transparent', color: audienceTab === 'ai' ? '#fff' : 'var(--text-muted)' }}>✨ แนะนำโดย AI</button>
                  <button onClick={() => setAudienceTab('manual')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', background: audienceTab === 'manual' ? 'var(--bg-700)' : 'transparent', color: audienceTab === 'manual' ? '#fff' : 'var(--text-muted)' }}>🔍 ค้นหาชื่อ</button>
                </div>

                {audienceTab === 'ai' && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', maxWidth: '680px' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-800)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 16px' }}>
                        <span style={{ fontSize: '16px' }}>🎯</span>
                        <input type="text" placeholder="ฉันอยากติดตามเรื่องเทคโนโลยี AI..." value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiSearchAudience()} style={{ background: 'transparent', border: 'none', color: '#fff', flex: 1, fontSize: '14px', outline: 'none' }} />
                      </div>
                      <button onClick={() => handleAiSearchAudience()} disabled={aiSearchLoading} className="btn-sync-premium" style={{ height: '48px', padding: '0 24px' }}>
                        {aiSearchLoading ? <RefreshCw size={15} className="animate-spin" /> : 'SEARCH →'}
                      </button>
                    </div>

                    {aiSearchLoading && aiSearchResults.length === 0 && (
                      <div style={{ padding: '60px 0', textAlign: 'center' }}>
                        <div className="ai-loader-ring" style={{ margin: '0 auto 20px' }}></div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent-secondary)' }} className="animate-pulse">AI ANALYST IS SCANNING...</div>
                      </div>
                    )}

                    {!aiSearchLoading && aiSearchResults.length > 0 && (
                      <div className="expert-grid" style={{ marginBottom: '32px' }}>
                        {aiSearchResults.map((expert, i) => {
                          const isAdded = watchlist.find(w => w.username.toLowerCase() === expert.username.toLowerCase());
                          return (
                            <div key={expert.username} className="expert-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div className="ai-pick-pill"><Sparkles size={10} /> AI PICK</div>
                                <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
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
                                  <div className="discovery-menu" style={{ display: 'none', position: 'absolute', right: 0, top: '100%', marginTop: '8px', background: 'var(--bg-900)', border: '1px solid var(--glass-border)', borderRadius: '12px', zIndex: 100, width: '180px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-border)', fontSize: '10px', fontWeight: '800', color: 'var(--accent-secondary)' }}>ADD TO LIST</div>
                                    {postLists.map(list => {
                                      const isMember = list.members.some(m => m.toLowerCase() === expert.username.toLowerCase());
                                      return (
                                        <button
                                          key={list.id}
                                          onClick={() => { handleToggleMemberInList(list.id, expert.username); }}
                                          style={{ width: '100%', background: 'transparent', border: 'none', color: isMember ? 'var(--accent-secondary)' : '#fff', cursor: 'pointer', padding: '8px 12px', textAlign: 'left', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}
                                        >
                                          {list.name}
                                          {isMember && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-secondary)' }} />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              <img src={`https://unavatar.io/twitter/${expert.username}`} style={{ width: '56px', height: '56px', borderRadius: '50%', marginBottom: '12px', border: '2px solid var(--bg-700)' }} onError={e => e.target.src = `https://ui-avatars.com/api/?name=${expert.name}`} />
                              <div className="expert-name" style={{ fontSize: '16px' }}>{expert.name}</div>
                              <div className="expert-username" style={{ marginBottom: '12px' }}>@{expert.username}</div>
                              <div className="expert-reasoning" style={{ fontSize: '12px', marginBottom: '20px', flex: 1 }}>“{expert.reasoning}”</div>
                              <button onClick={() => handleAddExpert(expert)} disabled={isAdded} className={`expert-follow-btn ${isAdded ? 'added' : ''}`} style={{ padding: '8px', fontSize: '12px' }}>{isAdded ? '✓ เพิ่มแล้ว' : '+ เพิ่มเข้า Watchlist'}</button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '28px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', textAlign: 'center', marginBottom: '20px', color: 'var(--text-muted)' }}>▌ DISCOVER BY CATEGORY ▌</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                        {CATEGORIES.map(cat => (
                          <button key={cat.label} onClick={() => { setAiQuery(cat.label); handleAiSearchAudience(cat.label); }} className="category-btn">
                            <span style={{ fontSize: '22px' }}>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {audienceTab === 'manual' && (
                  <div className="animate-fade-in" style={{ maxWidth: '560px' }}>
                    <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                      <div className="custom-input-wrapper">
                        <Search size={16} />
                        <input placeholder="กรอก X Username..." value={manualQuery} onChange={e => setManualQuery(e.target.value)} />
                      </div>
                      <button type="submit" className="btn-sync-premium">ค้นหา</button>
                    </form>
                    {manualPreview && (
                      <div className="preview-card" style={{ padding: '16px', borderRadius: '16px' }}>
                        <img src={manualPreview.profile_image_url} style={{ width: '50px', height: '50px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '14px' }}>{manualPreview.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>@{manualPreview.username}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleAddUser(manualPreview)} className="btn-pill primary" style={{ height: '32px', padding: '0 16px', fontSize: '12px' }}>+ เพิ่ม</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}


          {/* ===== FOLLOWING VIEW ===== */}
          {activeView === 'following' && (
            <div className="animate-fade-in">
              <header className="dashboard-header">
                <h1 style={{ fontSize: '32px', fontWeight: '800' }}>บัญชีที่คุณกำลังติดตาม</h1>
                <p style={{ color: 'var(--text-muted)' }}>จัดการแหล่งข้อมูลและบุคคลต้นทางทั้งหมด</p>
              </header>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
                {watchlist.map(user => (
                  <UserCard 
                    key={user.id} 
                    user={user} 
                    postLists={postLists}
                    onToggleList={handleToggleMemberInList}
                    onRemove={handleRemoveAccountGlobal} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* ===== BOOKMARKS VIEW ===== */}
          {activeView === 'bookmarks' && (
            <div className="animate-fade-in">
              <header className="dashboard-header">
                <h1 style={{ fontSize: '32px', fontWeight: '800' }}>Bookmarks</h1>
                <p style={{ color: 'var(--text-muted)' }}>คลังข้อมูลที่คุณบันทึกไว้แยกตามประเภท</p>
              </header>

              <div style={{ display: 'flex', gap: '8px', margin: '24px 0', padding: '4px', background: 'var(--bg-800)', borderRadius: '10px', width: 'fit-content' }}>
                <button onClick={() => setBookmarkTab('news')} className={`btn-pill ${bookmarkTab === 'news' ? 'primary' : ''}`}>📰 ข่าว</button>
                <button onClick={() => setBookmarkTab('article')} className={`btn-pill ${bookmarkTab === 'article' ? 'primary' : ''}`}>📝 บทความ</button>
              </div>
              
              <div className="feed-grid">
                {bookmarks.filter(b => bookmarkTab === 'news' ? b.type !== 'article' : b.type === 'article').map((item, idx) => (
                   bookmarkTab === 'news' ? (
                     <FeedCard key={item.id || idx} tweet={item} isBookmarked={true} onBookmark={handleBookmark} />
                   ) : (
                     <div key={item.id} className="article-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ margin: 0 }}>{item.title}</h3>
                          <button onClick={() => setBookmarks(prev => prev.filter(p => p.id !== item.id))} className="btn-mini-ghost text-red">ลบ</button>
                        </div>
                        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(item.summary) }} />
                     </div>
                   )
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {listModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <input value={listModal.value} onChange={e => setListModal({ ...listModal, value: e.target.value })} />
            <button onClick={finalizeListAction}>ยืนยัน</button>
            <button onClick={() => setListModal({ ...listModal, show: false })}>ยกเลิก</button>
          </div>
        </div>
      )}

      {filterModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <textarea value={filterModal.prompt} onChange={e => setFilterModal({ ...filterModal, prompt: e.target.value })} />
            <button onClick={handleAiFilter}>กรองข้อมูล</button>
          </div>
        </div>
      )}

      {status && (
        <div className="status-toast" style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: '#fff', color: '#000', padding: '12px 24px', borderRadius: '100px', fontSize: '12px', fontWeight: '900', letterSpacing: '0.05em', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 9999 }}>
          {status.toUpperCase()}
        </div>
      )}

      <RightSidebar 
        watchlist={watchlist} postLists={postLists} activeListId={activeListId}
        onSelectList={setActiveListId} onCreateList={() => setListModal({ show: true, mode: 'create', value: '' })}
        onImportList={() => setListModal({ show: true, mode: 'import', value: '' })}
        onRemoveList={handleRemoveList} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}
        onUpdateList={handleUpdateList} onShareList={handleShareList} onRemoveAccount={handleRemoveAccountGlobal}
        isMobileOpen={isMobilePostListOpen} onCloseMobile={() => setIsMobilePostListOpen(false)}
      />
    </div>
  );
};

export default App;
