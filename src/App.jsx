import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
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
import TopNav from './components/TopNav';
import FeedCard from './components/FeedCard';
import CreateContent from './components/CreateContent';
import { getUserInfo, fetchWatchlistFeed, searchEverything } from './services/TwitterService';
import { agentFilterFeed, generateGrokBatch, expandSearchQuery, discoverTopExperts, generateExecutiveSummary } from './services/GrokService';
import './index.css';

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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

// ---- UserCard: proper component with per-card menu state ----
const UserCard = ({ user, onRemove }) => {
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
          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px 6px', fontSize: '18px', letterSpacing: '1px', lineHeight: 1, borderRadius: '6px' }}
        >···</button>
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'var(--bg-900)', border: '1px solid var(--glass-border)', borderRadius: '10px', zIndex: 100, width: '160px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <button
              onClick={() => { onRemove(user.id); setMenuOpen(false); }}
              style={{ width: '100%', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ✕ ลบออกจากรายการ
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
// ---- End UserCard ----

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
// ---- End ErrorBoundary ----

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
  const [onlyNews] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLatestMode, setIsLatestMode] = useState(false);
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('foro_bookmarks_v1');
    return sanitizeStoredCollection(safeParse(saved, []));
  });
  const [bookmarkTab, setBookmarkTab] = useState('news');
  const [editingArticleId, setEditingArticleId] = useState(null);
  
  // Mobile UI States
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

  // Audience / Smart Discovery state
  const [audienceTab, setAudienceTab] = useState('ai'); // 'ai' | 'manual'
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
 

  // Auto-hide status notifications after 3 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Auto-hide AI reports after 6 seconds
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

  // Handle automatic filtering by List or View
  useEffect(() => {
    if (activeView === 'search') return; // Search manages its own feed results
    
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
      // CRITICAL FIX: Ensure targetAccounts is ALWAYS an array of strings (usernames)
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
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.info(`[Sync] completed in ${duration}s with ${data.length} items`);
      
      if (data.length > 0) {
        setStatus(`พบ ${data.length} ข่าวใหม่! กำลังทยอยแปลและสรุปเป็นภาษาไทย...`);
        
        // Progressive Translation (Streaming effect)
        const CHUNK_SIZE = 10;
        let runningFeed = [...originalFeed]; // Local copy to avoid stale state in loop
        
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          
          // Find posts in chunk that need summarization
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

          // Inject the Translated Chunk into the Feed state
          setOriginalFeed(prev => {
            const postMap = new Map(prev.map(p => [p.id, p]));
            chunk.forEach(newPost => {
              const normalizedNewPost = sanitizeStoredPost(newPost);
              if (postMap.has(newPost.id)) {
                const existing = sanitizeStoredPost(postMap.get(newPost.id));
                postMap.set(newPost.id, {
                  ...existing,
                  ...normalizedNewPost,
                });
              } else {
                postMap.set(newPost.id, normalizedNewPost);
              }
            });
            const nextList = Array.from(postMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            runningFeed = nextList; // Update local copy for next iteration
            return nextList;
          });

          // Inject into Archive
          setReadArchive(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = chunk.filter(p => !existingIds.has(p.id));
            if (newItems.length > 0) return [...newItems, ...prev]; // newest first
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
      setFeed(prev => [...prev, ...data]);
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
    setStatus('AI กำลังประเมินเทรนด์... ค้นหาข้อมูลเชิงลึก');
    try {
      let finalQuery = requestedQuery;
      if (!isMore) {
        setStatus(`[Agent 1/3] กำลังแปลคีย์เวิร์ดขั้นสูงสำหรับ "${requestedQuery}"...`);
        finalQuery = await expandSearchQuery(requestedQuery, isLatestMode);
        console.log("Expanded Query in " + (isLatestMode ? 'Latest' : 'Quality') + " mode:", finalQuery);
      }
      
      // Route to 'Latest' or 'Top' endpoint depending on User Toggle
      setStatus(`[API] กำลังแสกนหาข้อมูลและกวาดล้างเนื้อหาดิบจาก X ทั่วโลก...`);
      const { data, meta } = await searchEverything(finalQuery, isMore ? searchCursor : null, onlyNews, isLatestMode ? 'Latest' : 'Top'); 
      
      let finalData = data;
      if (!isMore && data.length > 0) {
        setStatus(`[Agent 2/3] กำลังกรองสแปมและคัดเลือก 20 โพสต์ระดับคุณภาพ...`);
        const validIds = await agentFilterFeed(data, requestedQuery);
        const cleanData = data.filter(t => validIds.includes(t.id));
        finalData = cleanData.length > 0 ? cleanData : data; // Fallback so we don't display empty
        
        setStatus(`[Agent 3/3] กำลังสังเคราะห์ข้อมูลและเขียน Executive Summary...`);
        const summaryText = await generateExecutiveSummary(finalData.slice(0, 10), requestedQuery);
        setSearchSummary(summaryText);
      }

      const newResults = isMore ? [...searchResults, ...finalData] : finalData;
      setSearchResults(newResults);
      setOriginalSearchResults(newResults);
      setFeed(newResults); 
      setSearchCursor(meta.next_cursor);
      setStatus(`ตรวจสอบพบ ${newResults.length} รายการระดับคุณภาพ`);
      
      if (data.length > 0) {
        setStatus('Grok 4.1 กำลังทยอยแปลผลการค้นหาเป็นภาษาไทย...');
        
        const CHUNK_SIZE = 10;
        // Search Streaming effect
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
           const chunk = data.slice(i, i + CHUNK_SIZE);
           const toSummarize = chunk.filter(t => {
             const existing = newResults.find(p => p.id === t.id);
             return !hasUsefulThaiSummary(existing?.summary || t.summary, existing?.text || t.text);
           });

           if (toSummarize.length > 0) {
             const batchTexts = toSummarize.map(t => t.text);
             const summaries = await generateGrokBatch(batchTexts);
             
             toSummarize.forEach((post, idx) => {
               post.summary = summaries[idx] || post.text;
             });
           }

           // Inject translated chunk
           const updateFeed = (prev) => {
             const postMap = new Map((prev || []).map(p => [p.id, p]));
             chunk.forEach(newPost => {
               const normalizedNewPost = sanitizeStoredPost(newPost);
               if (postMap.has(newPost.id)) {
                 postMap.set(newPost.id, {
                   ...sanitizeStoredPost(postMap.get(newPost.id)),
                   ...normalizedNewPost,
                 });
               }
             });
             // Maintain original array order but update matched items
             return (prev || []).map(p => postMap.get(p.id) || p);
           };

           setSearchResults(updateFeed);
           setOriginalSearchResults(updateFeed);
           setFeed(updateFeed);
         }
        setStatus('แปลการค้นหาเสร็จสิ้น');
      }
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearching(false);
    }
  };

  const resolvePlaceholders = async (nodes) => {
    if (!Array.isArray(nodes)) return;
    const placeholders = nodes.filter(u => u.isPlaceholder);
    if (placeholders.length === 0) return;

    setStatus(`กำลังดึงข้อมูลบัญชี X จำนวน ${placeholders.length} บัญชี...`);
    
    for (const placeholder of placeholders) {
      if (!placeholder.username) continue;
      try {
        const realData = await getUserInfo(placeholder.username);
        if (realData) {
          setWatchlist(current => {
            // Check if user exists (handles race condition where item was just added)
            const exists = current.find(u => u && (u.username || '').toLowerCase() === (placeholder.username || '').toLowerCase());
            if (exists) {
              return current.map(u => 
                (u.username || '').toLowerCase() === (placeholder.username || '').toLowerCase() ? { ...realData, isPlaceholder: false } : u
              );
            }
            return current;
          });
        }
      } catch (err) {
        console.error(`Failed to resolve node: ${placeholder.username}`, err);
      }
      await new Promise(r => setTimeout(r, 300));
    }
    setStatus('ตรวจสอบบัญชีทั้งหมดเรียบร้อยแล้ว');
  };

  useEffect(() => {
    const placeholders = watchlist.filter(u => u.isPlaceholder);
    if (placeholders.length > 0) {
      resolvePlaceholders(placeholders);
    }
  }, []); // eslint-disable-line

  const finalizeListAction = async () => {
    if (!listModal.value) return;
    if (listModal.mode === 'create') {
      const newList = {
        id: Date.now().toString(),
        name: listModal.value,
        color: 'var(--accent-secondary)', // Initial luminous blue
        members: [],
        createdAt: new Date().toISOString()
      };
      setPostLists([...postLists, newList]);
      setActiveListId(newList.id);
      setStatus(`สร้างรายการใหม่เสร็จสิ้น: ${newList.name}`);
    } else {
      try {
        // UTF-8 safe base64 decoding
        const decoded = JSON.parse(decodeURIComponent(escape(atob(listModal.value))));
        if (!decoded.members || !Array.isArray(decoded.members)) {
          throw new Error('Malformed protocol data');
        }
        
        const newList = { 
          ...decoded, 
          id: Date.now().toString(),
          color: decoded.color || 'var(--accent-secondary)',
          createdAt: new Date().toISOString()
        };
        
        if (window.confirm(`ยืนยันนำเข้ารายการ: ${newList.name}\nจำนวนบัญชี: ${newList.members.length}`)) {
          setPostLists([...postLists, newList]);
          setActiveListId(newList.id);
          
          // SYNC TO GLOBAL NODES: Add members to watchlist if they don't exist
          const newItems = [];
          newList.members.forEach(handle => {
            if (!watchlist.find(u => (u.username || '').toLowerCase() === (handle || '').toLowerCase())) {
              newItems.push({ 
                id: handle, 
                username: handle, 
                name: handle, 
                profile_image_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(handle)}&background=random&color=fff&bold=true`, 
                isPlaceholder: true 
              });
            }
          });
          
          if (newItems.length > 0) {
            setWatchlist(prev => [...prev, ...newItems]);
            resolvePlaceholders(newItems);
          }
          setStatus(`นำเข้ารายการ "${newList.name}" สำเร็จ`);
        }
      } catch (err) {
        console.error('Import error:', err);
        // Fallback for raw handles
        if (listModal.value.includes(',') || listModal.value.includes('@')) {
          const handles = listModal.value.replace(/@/g, '').split(/[\s,]+/).filter(Boolean);
          const newList = { id: Date.now().toString(), name: 'Imported List', color: 'var(--accent-secondary)', members: handles, createdAt: new Date().toISOString() };
          setPostLists([...postLists, newList]);
          setActiveListId(newList.id);
          
          const newItems = handles.filter(h => !watchlist.find(w => (w.username || '').toLowerCase() === (h || '').toLowerCase()))
            .map(h => ({ 
              id: h, 
              username: h, 
              name: h, 
              profile_image_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(h)}&background=random&color=fff&bold=true`, 
              isPlaceholder: true 
            }));
          if (newItems.length > 0) {
            setWatchlist(prev => [...prev, ...newItems]);
            resolvePlaceholders(newItems);
          }
          setStatus(`นำเข้ารายชื่อเสร็จสิ้น (${handles.length} บัญชี)`);
        } else {
          setStatus('รหัสไม่ถูกต้อง หรือรูปแบบไม่รองรับ');
        }
      }
    }
    setListModal({ show: false, mode: 'create', value: '' });
  };

  const handleRemoveAccountGlobal = (idOrHandle) => {
    // 1. Resolve handle and id safely
    const target = watchlist.find(u => u.id === idOrHandle || u.username === idOrHandle);
    if (!target) return;
    
    const id = target.id;
    const handle = target.username;

    // 2. Remove from global watchlist
    setWatchlist(prev => prev.filter(w => w.id !== id && w.username !== handle));

    // 3. Remove from ALL post lists
    setPostLists(prev => prev.map(list => ({
      ...list,
      members: list.members.filter(m => (m || '').toLowerCase() !== (handle || '').toLowerCase())
    })));

    setStatus(`ลบ @${handle} ออกจากทุกรายการติดตามแล้ว`);
  };

  const handleDeleteAll = () => {
    if (originalFeed.length === 0) return;
    setDeletedFeed([...originalFeed]);
    setOriginalFeed([]);
    setFeed([]);
    setStatus('ล้างฟีดหน้าหลักแล้ว (คุณสามารถกดย้อนกลับเพื่อเรียกคืนได้ก่อนจะซิงค์ใหม่)');
  };

  const handleUndo = () => {
    if (deletedFeed.length > 0) {
      setOriginalFeed([...deletedFeed]);
      setFeed([...deletedFeed]);
      setDeletedFeed([]);
      setStatus('เรียกคืนฟีดข่าวเรียบร้อย');
    } else if (originalFeed.length > 0) {
      setFeed([...originalFeed]);
      setAiReport('');
      setStatus('ล้างความจำ: กลับสู่ค่าฟีดเริ่มต้น');
    }
  };

  const handleRemoveList = (listId) => {
    setPostLists(prev => prev.filter(l => l.id !== listId));
    if (activeListId === listId) setActiveListId(null);
  };

  const handleUpdateList = (listId, updates) => {
    setPostLists(prev => prev.map(l => l.id === listId ? { ...l, ...updates } : l));
    setStatus('อัปเดตรายการเรียบร้อย');
  };

  const handleAddMember = (listId, handle) => {
    if (!handle) return;
    const cleanHandle = handle.trim().replace(/^@/, '');
    if (!cleanHandle) return;

    setPostLists(prev => prev.map(list => {
      if (list.id === listId) {
        if (list.members.includes(cleanHandle)) {
          setStatus(`@${cleanHandle} มีอยู่ในรายการแล้ว`);
          return list;
        }
        setStatus(`เพิ่ม @${cleanHandle} เข้าใน "${list.name}" แล้ว`);
        return { ...list, members: [...list.members, cleanHandle] };
      }
      return list;
    }));

    // Also add to global watchlist if not exists
    const exists = watchlist.find(u => (u.username || '').toLowerCase() === (cleanHandle || '').toLowerCase());
    if (!exists) {
      const newUser = {
        id: cleanHandle,
        username: cleanHandle,
        name: cleanHandle,
        profile_image_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanHandle)}&background=random&color=fff&bold=true`,
        isPlaceholder: true
      };
      setWatchlist(prev => [...prev, newUser]);
      resolvePlaceholders([newUser]);
    }
  };

  const handleRemoveMember = (handle, listId) => {
    setPostLists(prev => prev.map(list => {
      if (list.id === listId) {
        return { ...list, members: list.members.filter(m => m !== handle) };
      }
      return list;
    }));
    setStatus(`ลบ @${handle} ออกจากรายการแล้ว`);
  };

  const handleShareList = (list) => {
    try {
      const data = {
        name: list.name,
        members: list.members,
        color: list.color
      };
      // UTF-16/UTF-8 safe base64 encoding
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
      
      navigator.clipboard.writeText(code).then(() => {
        setStatus(`FORO: คัดลอกรหัสแชร์รายการ "${list.name}" แล้ว`);
      }).catch((err) => {
        console.error('Clipboard error:', err);
        setStatus(`คัดลอกรหัสล้มเหลว: ${code}`);
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };


  const handleSort = (type) => {
    setActiveFilters(prev => {
      const next = { ...prev, [type]: !prev[type] };
      
      let sorted = [...feed];
      if (next.view || next.engagement) {
        sorted.sort((a, b) => {
          const engagementA = (parseInt(a.retweet_count) || 0) + (parseInt(a.reply_count) || 0) + (parseInt(a.like_count) || 0);
          const engagementB = (parseInt(b.retweet_count) || 0) + (parseInt(b.reply_count) || 0) + (parseInt(b.like_count) || 0);

          const scoreA = (next.view ? (parseInt(a.view_count) || 0) : 0) + (next.engagement ? engagementA : 0);
          const scoreB = (next.view ? (parseInt(b.view_count) || 0) : 0) + (next.engagement ? engagementB : 0);
          return scoreB - scoreA;
        });
      } else {
        // Reset to chronological: find the base to reset to
        if (activeListId) {
          const activeList = postLists.find(l => l.id === activeListId);
          sorted = originalFeed.filter(post => 
            post && post.author && activeList?.members.some(m => (m || '').toLowerCase() === (post.author.username || '').toLowerCase())
          );
        } else {
          sorted = [...originalFeed];
        }
      }
      
      setFeed(sorted);
      setStatus(`อัปเดตการเรียงลำดับ: ${next.view && next.engagement ? 'ยอดวิว + เอนเกจเมนต์' : next.view ? 'ยอดวิว' : next.engagement ? 'เอนเกจเมนต์' : 'ค่าเริ่มต้น'}`);
      return next;
    });
  };

  const handleSearchSort = (type) => {
    setSearchFilters(prev => {
      const next = { ...prev, [type]: !prev[type] };
      let sorted = [...searchResults];
      if (next.view || next.engagement) {
        sorted.sort((a, b) => {
          const engagementA = (parseInt(a.retweet_count) || 0) + (parseInt(a.reply_count) || 0) + (parseInt(a.like_count) || 0);
          const engagementB = (parseInt(b.retweet_count) || 0) + (parseInt(b.reply_count) || 0) + (parseInt(b.like_count) || 0);
          const scoreA = (next.view ? (parseInt(a.view_count) || 0) : 0) + (next.engagement ? engagementA : 0);
          const scoreB = (next.view ? (parseInt(b.view_count) || 0) : 0) + (next.engagement ? engagementB : 0);
          return scoreB - scoreA;
        });
      } else {
        sorted = [...originalSearchResults];
      }
      setSearchResults(sorted);
      return next;
    });
  };

  const handleAiFilter = async () => {
    if (!filterModal.prompt) return;
    setLoading(true);
    setStatus('AI กำลังคัดกรองข่าวตามความต้องการ...');
    try {
      if (originalFeed.length === 0) setOriginalFeed([...feed]);
      const validIds = await agentFilterFeed(feed, filterModal.prompt);
      const filtered = feed.filter(t => validIds.includes(t.id));
      setFeed(filtered);
      setAiReport(`สรุปผล AI: พบ ${filtered.length} รายการที่สอดคล้องกับ "${filterModal.prompt}"`);
      setFilterModal({ show: false, prompt: '' });
    } catch (err) {
      console.error(err);
      setStatus('AI Filter ผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleAiSearchAudience = async (q, isMore = false) => {
    const query = q || aiQuery;
    if (!query.trim()) return;
    
    setAiSearchLoading(true);
    if (!isMore) setAiSearchResults([]); // Clear only if new search
    
    const statusMsg = isMore 
      ? `Grok 4.1 กำลังมองหาผู้เชี่ยวชาญเพิ่มเติมสำหรับ ${query}...` 
      : `Grok 4.1 กำลังวิเคราะห์ผู้เชี่ยวชาญระดับโลกด้าน ${query}...`;
      
    setStatus(statusMsg);
    
    try {
      const exclude = isMore ? (Array.isArray(aiSearchResults) ? aiSearchResults.filter(Boolean).map(e => e.username) : []) : [];
      const experts = await discoverTopExperts(query, exclude);
      
      // Sanitize input array just in case Service filter failed
      const safeExperts = Array.isArray(experts) ? experts.filter(e => e && e.username) : [];
      
      if (isMore) {
        setAiSearchResults(prev => [...(Array.isArray(prev) ? prev : []), ...safeExperts]);
        setStatus('เพิ่มรายชื่อผู้เชี่ยวชาญใหม่เรียบร้อย');
      } else {
        setAiSearchResults(safeExperts);
        setStatus('ค้นพบรายชื่อผู้เชี่ยวชาญชั้นนำเรียบร้อย');
      }
    } catch (e) {
      console.error('AI search error', e);
      setAiSearchResults(prev => Array.isArray(prev) ? prev : []); 
      setStatus('ขออภัย ระบบ AI ไม่ตอบสนองในขณะนี้ กรุณาลองใหม่');
    } finally {
      setAiSearchLoading(false);
    }
  };

  const handleAddExpert = async (expert) => {
    if (!expert?.username) return;
    if (watchlist.find(w => w && (w.username || '').toLowerCase() === (expert.username || '').toLowerCase())) return;
    
    setStatus(`กำลังตรวจสอบข้อมูล @${expert.username}...`);
    try {
      const fullInfo = await getUserInfo(expert.username);
      if (fullInfo) {
        setWatchlist(prev => [...prev, fullInfo]);
        setStatus(`เพิ่ม @${expert.username} เรียบร้อย`);
      } else {
        throw new Error('No user data returned');
      }
    } catch (err) {
      console.error('Verify expert error', err);
      setStatus(`ไม่สามารถเพิ่ม @${expert.username} ได้ (ไม่พบข้อมูลบัญชี)`);
    }
  };

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    if (!manualQuery.trim()) return;
    setManualLoading(true);
    setManualPreview(null);
    try {
      const data = await getUserInfo(manualQuery.trim());
      setManualPreview(data);
    } catch (err) {
      alert(`ไม่พบผู้ใช้: ${err.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setManualLoading(false);
    }
  };

  const handleAddUser = (user) => {
    if (!watchlist.find(w => w.id === user.id)) {
      setWatchlist(prev => [...prev, user]);
    }
    setManualPreview(null);
    setManualQuery('');
  };

  return (
    <div className="foro-layout">
      <Sidebar 
        activeView={activeView}
        onNavClick={(view) => {
          setActiveView(view);
          if (view === 'home' || view === 'read' || view === 'content') {
             setActiveListId(null);
             if (view === 'home') {
               setSearchQuery('');
               setSearchResults([]);
             }
          }
        }}
      />

      {/* MOBILE BACKDROP */}
      {isMobilePostListOpen && (
        <div className="mobile-backdrop" onClick={() => setIsMobilePostListOpen(false)} />
      )}


      <main className="foro-main">
        <TopNav 
          activeView={activeView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          isSearching={isSearching}
        />
        
        <div className="foro-main-scroll">



          {/* ===== HOME VIEW ===== */}
          {activeView === 'home' && (
            <div className="animate-fade-in">
              <header className="dashboard-header" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                {/* Centered Logo for Mobile */}
                <div className="mobile-only-flex" style={{ justifyContent: 'center', width: '100%', marginBottom: '-8px' }}>
                  <img src="logo.png" alt="FO" style={{ height: '24px', width: 'auto' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: '500', letterSpacing: '0.02em' }}>
                      {activeView === 'search' ? 'SEARCH RESULTS' : activeView === 'read' ? 'SELECTED ARTICLES' : 'WATCHLIST FEED'}
                    </div>
                    <h1 style={{ 
                      margin: 0, 
                      fontSize: '32px', 
                      fontWeight: '800', 
                      letterSpacing: '-0.02em', 
                      lineHeight: '1.1',
                      color: activeListId ? (postLists.find(l => l.id === activeListId)?.color || 'inherit') : 'inherit'
                    }}>
                      {activeView === 'search' ? 'ค้นหาคอนเทนต์' : activeView === 'read' ? 'อ่านข่าว' : activeListId ? postLists.find(l => l.id === activeListId)?.name : 'หน้าหลัก'}
                    </h1>
                  </div>

                  <button 
                    className="mobile-only-flex" 
                    onClick={() => setIsMobilePostListOpen(true)}
                    style={{ 
                      background: 'rgba(255,255,255,0.08)', 
                      border: '1px solid var(--glass-border)', 
                      padding: '10px', 
                      borderRadius: '12px', 
                      color: '#fff', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <List size={20} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                  {/* UTILITIES (Left) */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={handleDeleteAll} className="icon-btn-large" title="ล้างฟีดทั้งหมด"><Trash2 size={18} /></button>
                    <button onClick={handleUndo} className="icon-btn-large" title="เรียกคืนฟีดที่ลบ"><Undo2 size={18} /></button>
                  </div>
                  
                  {/* ACTIONS (Right) */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => setFilterModal({ show: true, prompt: '' })} 
                      className={`btn-pill ${aiReport ? 'active' : ''}`}
                      style={{ padding: '10px 16px', fontSize: '13px' }}
                    >
                      <Sparkles size={16} /> AI Filter
                    </button>
                    <button 
                      onClick={handleSync} 
                      disabled={loading} 
                      className="btn-pill primary"
                      style={{ padding: '10px 20px', fontSize: '13px' }}
                    >
                      {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} ซิงค์ข้อมูล
                    </button>
                  </div>
                </div>
              </header>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
                <div className="section-title" style={{ margin: 0 }}>โพสต์ล่าสุด</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => handleSort('view')} className={`btn-pill ${activeFilters.view ? 'active' : ''}`} style={{ height: '30px', padding: '0 14px', fontSize: '11px', whiteSpace: 'nowrap' }}>ยอดวิว</button>
                  <button onClick={() => handleSort('engagement')} className={`btn-pill ${activeFilters.engagement ? 'active' : ''}`} style={{ height: '30px', padding: '0 14px', fontSize: '11px', whiteSpace: 'nowrap' }}>เอนเกจเมนต์</button>
                </div>
              </div>
              <div className="feed-grid">
                {feed.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '80px 0', textAlign: 'center', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    {isSearching ? (
                      <div className="animate-pulse">AI กำลังค้นหาข้อมูลสำหรับ "{searchQuery}"...</div>
                    ) : searchQuery && searchResults.length === 0 ? (
                      <div>ไม่พบข้อมูลสำหรับ "{searchQuery}"</div>
                    ) : status === 'No new updates in the last 24h' ? (
                      'ไม่มีอัปเดตใหม่จากบัญชีที่คุณติดตามในช่วง 24 ชั่วโมงที่ผ่านมา'
                    ) : watchlist.length === 0 ? (
                      'เริ่มโดยการเพิ่มบัญชี X (Twitter) ที่คุณต้องการติดตาม'
                    ) : (
                      "ระบบพร้อมทำงาน กดปุ่ม 'ซิงค์ข้อมูล' เพื่อเริ่มสรุปข่าว"
                    )}
                  </div>
                ) : (
                  feed.map((item, idx) => (
                    <FeedCard key={item.id || idx} tweet={item} 
                      isBookmarked={bookmarks.some(b => b.id === item.id)}
                      onBookmark={handleBookmark}

                      onArticleGen={(it) => {
                        setCreateContentSource(it);
                        setActiveView('content');
                        // Stagger the tab switch so React doesn't batch it with the view change
                        setTimeout(() => setContentTab('create'), 0);
                      }} 
                    />
                  ))
                )}
              </div>

              {nextCursor && !loading && (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <button onClick={handleLoadMore} style={{ padding: '12px 40px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-900)', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                    โหลดข้อมูลเพิ่มเติม
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===== UNIFIED CONTENT VIEW ===== */}
          {activeView === 'content' && (
            <div className="unified-content-view animate-fade-in">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                <button className={`btn-pill ${contentTab === 'search' ? 'primary' : ''}`} onClick={() => setContentTab('search')}>
                  <Search size={16} /> ค้นหาคอนเทนต์
                </button>
                <button className={`btn-pill ${contentTab === 'create' ? 'primary' : ''}`} onClick={() => setContentTab('create')}>
                  <Sparkles size={16} /> สร้างคอนเทนต์
                </button>
              </div>

              {contentTab === 'create' && (
                <div className="animate-fade-in">
                  <ContentErrorBoundary key={createContentSource?.id}>
                    <CreateContent 
                      sourceNode={createContentSource} 
                      onRemoveSource={() => setCreateContentSource(null)}
                      onSaveArticle={(title, content) => {
                        const newArticle = { id: Date.now().toString(), type: 'article', title: title || 'บทความที่ส่งต่อโดย AI', summary: content, created_at: new Date().toISOString() };
                        setBookmarks(prev => [newArticle, ...prev]);
                        setStatus("บันทึกบทความลง Bookmarks แล้ว พร้อมเปิดให้แก้ไขได้อิสระ");
                      }}
                    />
                  </ContentErrorBoundary>
                </div>
              )}

              {contentTab === 'search' && (
                <div className="search-discovery-view animate-fade-in">
              <div className="hero-search-container">
                <h1 className="hero-search-title">ค้นหาคอนเทนต์</h1>
                <p className="hero-search-subtitle">เจาะลึกทุกเรื่องราวจากคลังข้อมูลและโซเชียลมีเดีย</p>
                
                <form onSubmit={(e) => handleSearch(e)} className="hero-search-form">
                  <Search size={20} className="hero-search-icon" />
                  <input
                    type="text"
                    className="hero-search-input"
                    placeholder="พิมพ์คีย์เวิร์ดที่สนใจ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  
                  <div className="hero-search-actions">
                    <button 
                      type="button" 
                      title={isLatestMode ? "ปิดโหมดใหม่ล่าสุด" : "เปิดโหมดใหม่ล่าสุด"}
                      onClick={(e) => { 
                        e.stopPropagation();
                        setIsLatestMode(!isLatestMode); 
                      }} 
                      className={`zap-toggle-btn ${isLatestMode ? 'active' : ''}`}
                    >
                      <Zap size={18} fill={isLatestMode ? "#2997ff" : "none"} />
                    </button>

                    <button type="submit" className="hero-submit-btn" disabled={isSearching}>
                      {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'ค้นหา'}
                    </button>
                  </div>
                </form>

                {!searchQuery && searchResults.length === 0 && (
                  <div className="search-idea-tags">
                    <p>ไอเดียการค้นหาวันนี้:</p>
                    <div className="tags-row">
                      {['แนวโน้มเศรษฐกิจ 2026', 'สรุปข่าว AI', 'รีวิว Gadget ใหม่', 'วิเคราะห์การเมืองไทย'].map(tag => (
                        <button key={tag} className="idea-tag" onClick={() => { 
                          setSearchQuery(tag);
                          handleSearch({ preventDefault: () => {} }, false, tag); 
                        }}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SEARCH RESULTS */}
              {isSearching ? (
                 <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--accent-secondary)' }} />
                    <div className="animate-pulse">AI กำลังรวบรวมข้อมูลสำหรับ "{searchQuery}"...</div>
                 </div>
              ) : searchResults.length > 0 ? (
                <div className="search-results-container">
                  <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', paddingLeft: '8px' }}>ผลการค้นหา "{searchQuery}"</h2>
                  {searchSummary && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.1), rgba(41, 151, 255, 0.05))', border: '1px solid rgba(8, 145, 178, 0.2)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }} className="animate-fade-in">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#2997ff', fontWeight: 'bold' }}>
                        <Sparkles size={18} /> <span>Grok Executive Summary</span>
                      </div>
                      <div 
                        className="markdown-body" 
                        style={{ lineHeight: '1.9', fontSize: '15px', color: 'rgba(255,255,255,0.92)', letterSpacing: '0.01em' }} 
                        dangerouslySetInnerHTML={{ __html: searchSummary ? marked.parse(searchSummary) : '' }} 
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingLeft: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>เรียงตาม:</span>
                    <button onClick={() => handleSearchSort('view')} className={`btn-pill ${searchFilters.view ? 'active' : ''}`} style={{ height: '32px', padding: '0 16px', fontSize: '12px' }}>ยอดวิว</button>
                    <button onClick={() => handleSearchSort('engagement')} className={`btn-pill ${searchFilters.engagement ? 'active' : ''}`} style={{ height: '32px', padding: '0 16px', fontSize: '12px' }}>เอนเกจเมนต์</button>
                  </div>
                  <div className="feed-grid">
                    {searchResults.map((item, idx) => (
                      <FeedCard key={item.id || idx} 
                        tweet={item} 
                        isBookmarked={bookmarks.some(b => b.id === item.id)}
                        onBookmark={handleBookmark}

                        onArticleGen={(it) => {
                          setCreateContentSource(it);
                          setActiveView('content');
                          // Stagger the tab switch so React doesn't batch it with the view change
                          setTimeout(() => setContentTab('create'), 0);
                        }}
                      />
                    ))}
                  </div>
                  {searchCursor && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', marginBottom: '40px' }}>
                       <button onClick={(e) => handleSearch(e, true)} disabled={isSearching} className="btn-pill primary" style={{ padding: '12px 32px' }}>
                          {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'โหลดเพิ่มเติม'}
                       </button>
                    </div>
                  )}
                </div>
              ) : null}
                </div>
              )}
            </div>
          )}

          {/* ===== READ VIEW: THE LIBRARY ===== */}
          {activeView === 'read' && (
            <div className="reader-library-view animate-fade-in">
                <header className="reader-header">
                  <h1 className="reader-title">อ่านข่าว</h1>
                  <p className="reader-subtitle">บทความและข่าวสารที่คุณบันทึกไว้อ่านแบบ Deep Read</p>
                </header>

                {readArchive.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-dim)', marginRight: '4px' }}>เรียงตาม:</span>
                    <button
                      onClick={() => setReadFilters(prev => ({ ...prev, view: !prev.view }))}
                      className={`btn-pill ${readFilters.view ? 'active' : ''}`}
                      style={{ height: '32px', padding: '0 16px', fontSize: '12px' }}
                    >ยอดวิว</button>
                    <button
                      onClick={() => setReadFilters(prev => ({ ...prev, engagement: !prev.engagement }))}
                      className={`btn-pill ${readFilters.engagement ? 'active' : ''}`}
                      style={{ height: '32px', padding: '0 16px', fontSize: '12px' }}
                    >เอนเกจเมนต์</button>
                  </div>
                )}
                
                {readArchive.length === 0 ? (
                  <div className="reader-empty-state">
                     <BookOpen size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                     <p>ยังไม่มีบทความในห้องสมุดของคุณ</p>
                     <button onClick={() => setActiveView('home')} className="reader-explore-btn">สำรวจข่าววันนี้</button>
                  </div>
                ) : (
                  <div className="feed-grid">
                    {[...readArchive]
                      .sort((a, b) => {
                        if (!readFilters.view && !readFilters.engagement) return 0;
                        const engagementA = (parseInt(a.retweet_count) || 0) + (parseInt(a.reply_count) || 0) + (parseInt(a.like_count) || 0);
                        const engagementB = (parseInt(b.retweet_count) || 0) + (parseInt(b.reply_count) || 0) + (parseInt(b.like_count) || 0);
                        const scoreA = (readFilters.view ? (parseInt(a.view_count) || 0) : 0) + (readFilters.engagement ? engagementA : 0);
                        const scoreB = (readFilters.view ? (parseInt(b.view_count) || 0) : 0) + (readFilters.engagement ? engagementB : 0);
                        return scoreB - scoreA;
                      })
                      .map((item, idx) => (
                        <FeedCard key={item.id || idx} 
                          tweet={item} 
                          isBookmarked={bookmarks.some(b => b.id === item.id)}
                          onBookmark={handleBookmark}

                          onArticleGen={(it) => {
                            setCreateContentSource(it);
                            setActiveView('content');
                            setTimeout(() => setContentTab('create'), 0);
                          }}
                        />
                      ))
                    }
                  </div>
                )}
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

                {/* TAB SWITCHER */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', padding: '4px', background: 'var(--bg-800)', borderRadius: '10px', width: 'fit-content' }}>
                  <button
                    onClick={() => setAudienceTab('ai')}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                      background: audienceTab === 'ai' ? 'var(--accent-gradient)' : 'transparent',
                      color: audienceTab === 'ai' ? '#fff' : 'var(--text-muted)',
                      boxShadow: audienceTab === 'ai' ? '0 4px 12px var(--accent-glow-blue)' : 'none',
                    }}
                  >
                    ✨ แนะนำโดย AI
                  </button>
                  <button
                    onClick={() => setAudienceTab('manual')}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                      background: audienceTab === 'manual' ? 'var(--bg-700)' : 'transparent',
                      color: audienceTab === 'manual' ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    🔍 ค้นหาชื่อ
                  </button>
                </div>

                {/* AI TAB */}
                {audienceTab === 'ai' && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', maxWidth: '680px' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-800)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 16px' }}>
                        <span style={{ fontSize: '16px' }}>🎯</span>
                        <input
                          type="text"
                          placeholder="ฉันอยากติดตามเรื่องเทคโนโลยี AI และแนะนำว่าควรติดตามใคร"
                          value={aiQuery}
                          onChange={e => setAiQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAiSearchAudience()}
                          style={{ background: 'transparent', border: 'none', color: '#fff', flex: 1, fontSize: '14px', outline: 'none' }}
                        />
                      </div>
                      <button
                        onClick={() => handleAiSearchAudience()}
                        disabled={aiSearchLoading}
                        style={{ background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 24px', fontWeight: '800', fontSize: '13px', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px var(--accent-glow-blue)', whiteSpace: 'nowrap', transition: 'all 0.3s' }}
                      >
                        {aiSearchLoading ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            SEARCHING...
                          </>
                        ) : (
                          <>SEARCH →</>
                        )}
                      </button>
                    </div>

                    {aiSearchLoading && aiSearchResults.length === 0 && (
                      <div className="animate-fade-in" style={{ padding: '60px 0', textAlign: 'center' }}>
                        <div className="ai-loader-ring" style={{ margin: '0 auto 20px' }}></div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent-secondary)', letterSpacing: '0.05em' }} className="animate-pulse">
                          AI ANALYST IS SCANNING GLOBAL EXPERTS...
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>กำลังค้นหาบุคคลสำคัญระดับโลกที่เชี่ยวชาญด้านนี้เพื่อคุณ</p>
                      </div>
                    )}

                    {!aiSearchLoading && aiSearchResults && aiSearchResults.length > 0 && (
                      <div style={{ marginBottom: '32px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: '800', letterSpacing: '0.05em' }}>▌ AI ANALYST RECOMMENDATIONS ▌</div>
                        <div className="expert-grid" style={{ minHeight: '400px' }}>
                          {Array.isArray(aiSearchResults) && aiSearchResults
                            .filter(e => e && e.username) // Double safety check
                            .map((expert, i) => {
                             const expertUsername = (expert.username || '').toLowerCase();
                             const isAdded = !!watchlist.find(w => w && (w.username || '').toLowerCase() === expertUsername);
                            return (
                              <div key={expert.username} className="expert-card" style={{ animationDelay: `${i * 0.05}s` }}>
                                <div className="ai-pick-pill">
                                  <Sparkles size={10} /> AI PICK
                                </div>
                                <img 
                                  src={`https://unavatar.io/twitter/${expert.username}`} 
                                  alt="" 
                                  style={{ width: '60px', height: '60px', borderRadius: '50%', marginBottom: '12px', border: '2px solid var(--bg-700)' }} 
                                  onError={e => { 
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=random&color=fff&bold=true`; 
                                  }}
                                />
                                <a 
                                  href={`https://twitter.com/${expert.username}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="expert-name-link"
                                  style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                  <div className="expert-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {expert.name} <ExternalLink size={12} style={{ opacity: 0.5 }} />
                                  </div>
                                </a>
                                <div className="expert-username">@{expert.username || 'unknown'}</div>
                                <div className="expert-reasoning">“{expert.reasoning}”</div>
                                <button
                                  onClick={() => handleAddExpert(expert)}
                                  disabled={isAdded}
                                  className={`expert-follow-btn ${isAdded ? 'added' : ''}`}
                                >
                                  {isAdded ? (
                                    <>✓ เพิ่มแล้ว</>
                                  ) : (
                                    <>+ เพิ่มเข้า Watchlist</>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {!aiSearchLoading && aiSearchResults.length > 0 && (
                          <div style={{ textAlign: 'center', marginTop: '32px' }}>
                             <button
                               onClick={() => handleAiSearchAudience(aiQuery, true)}
                               className="btn-pill"
                               style={{ height: '40px', padding: '0 24px', fontSize: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                             >
                               <RefreshCw size={14} /> ค้นหาผู้เชี่ยวชาญเพิ่มเติม
                             </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '28px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', textAlign: 'center', marginBottom: '20px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                        ▌ ลองติดตามผู้เชี่ยวชาญจากหมวดหมู่ที่คุณสนใจ ▌
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.label}
                            onClick={() => { setAiQuery(cat.label); handleAiSearchAudience(cat.label); }}
                            style={{ background: 'var(--bg-800)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}
                            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'var(--bg-700)'; }}
                            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-800)'; }}
                          >
                            <span style={{ fontSize: '22px' }}>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MANUAL TAB */}
                {audienceTab === 'manual' && (
                  <div className="animate-fade-in" style={{ maxWidth: '560px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>ค้นหาด้วย X Username โดยตรง</div>
                    <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-800)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '10px 16px' }}>
                        <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                          type="text"
                          placeholder="กรอก X Username (เช่น elonmusk)"
                          value={manualQuery}
                          onChange={e => setManualQuery(e.target.value)}
                          style={{ background: 'transparent', border: 'none', color: '#fff', flex: 1, fontSize: '14px', outline: 'none' }}
                          autoFocus
                        />
                      </div>
                      <button type="submit" disabled={manualLoading} className="btn-sync-premium" style={{ height: '44px', padding: '0 24px', flexShrink: 0 }}>
                        {manualLoading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                        ค้นหา
                      </button>
                    </form>

                    {manualPreview && (
                      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                        <img 
                          src={manualPreview.profile_image_url} 
                          alt="" 
                          style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid var(--bg-700)', flexShrink: 0 }} 
                          onError={e => { 
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(manualPreview.name)}&background=random&color=fff&bold=true`; 
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>{manualPreview.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>@{manualPreview.username}</div>
                          {manualPreview.description && <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.5' }}>{manualPreview.description}</div>}
                        </div>
                        <button
                          onClick={() => handleAddUser(manualPreview)}
                          disabled={!!watchlist.find(w => w.id === manualPreview.id)}
                          style={{ background: watchlist.find(w => w.id === manualPreview.id) ? 'var(--bg-700)' : 'var(--accent-gradient-orange)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: '700', fontSize: '14px', cursor: watchlist.find(w => w.id === manualPreview.id) ? 'default' : 'pointer', flexShrink: 0 }}
                        >
                          {watchlist.find(w => w.id === manualPreview.id) ? '✓ ติดตามแล้ว' : '+ เพิ่ม'}
                        </button>
                      </div>
                    )}

                    {watchlist.length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px' }}>บัญชีที่ติดตามอยู่ ({watchlist.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {watchlist.map(u => (
                            <div key={u.id} className="watchlist-item" style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              gap: '12px', 
                              padding: '12px 16px', 
                              borderRadius: '12px', 
                              background: 'var(--bg-800)',
                              border: '1px solid var(--glass-border)',
                              transition: 'all 0.2s'
                            }}>
                              <div style={{ width: 'fit-content', minWidth: 0 }}>
                                <a 
                                  href={`https://x.com/${u.username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}
                                  className="hover-underline"
                                >
                                  <img 
                                    src={u.profile_image_url} 
                                    alt="" 
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--glass-border)', flexShrink: 0 }} 
                                    onError={e => { 
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&bold=true`; 
                                    }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                      {u.name} <ExternalLink size={12} style={{ opacity: 0.4 }} />
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>@{u.username}</div>
                                  </div>
                                </a>
                              </div>

                              <button 
                                onClick={() => handleRemoveAccountGlobal(u.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', padding: '8px', cursor: 'pointer', transition: 'color 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'}
                                title="ลบบัญชีนี้"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
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
              <header className="dashboard-header" style={{ marginBottom: '8px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>บัญชีที่คุณกำลังติดตาม</h1>
                <p style={{ color: 'var(--text-muted)' }}>ผู้คนล่าสุดที่ติดตามข่าวสาร</p>
              </header>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
                {watchlist.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onRemove={handleRemoveAccountGlobal}
                  />
                ))}
                {watchlist.length === 0 && (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                    ยังไม่ได้ติดตามบัญชีใด — ค้นหาและเพิ่มได้จากแถบด้านขวา
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== BOOKMARKS VIEW ===== */}
          {activeView === 'bookmarks' && (
            <div className="animate-fade-in">
              <header className="dashboard-header" style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Bookmarks</h1>
                <p style={{ color: 'var(--text-muted)' }}>คลังข้อมูลส่วนตัว แยกประเภทการจัดเก็บข่าวสดและบทความ</p>
              </header>

              {/* BOOKMARK ZONES TAB */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '4px', background: 'var(--bg-800)', borderRadius: '10px', width: 'fit-content' }}>
                <button
                  onClick={() => setBookmarkTab('news')}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                    background: bookmarkTab === 'news' ? 'var(--accent-gradient)' : 'transparent',
                    color: bookmarkTab === 'news' ? '#fff' : 'var(--text-muted)',
                    boxShadow: bookmarkTab === 'news' ? '0 4px 12px var(--accent-glow-blue)' : 'none',
                  }}
                >
                  📰 ข่าว (Feeds)
                </button>
                <button
                  onClick={() => setBookmarkTab('article')}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                    background: bookmarkTab === 'article' ? 'var(--accent-gradient)' : 'transparent',
                    color: bookmarkTab === 'article' ? '#fff' : 'var(--text-muted)',
                    boxShadow: bookmarkTab === 'article' ? '0 4px 12px var(--accent-glow-blue)' : 'none',
                  }}
                >
                  📝 บทความ (Articles)
                </button>
              </div>
              
              {bookmarks.filter(b => bookmarkTab === 'news' ? b.type !== 'article' : b.type === 'article').length === 0 ? (
                <div style={{ padding: '80px 0', textAlign: 'center', border: '1px dashed var(--glass-border)', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', color: 'var(--text-muted)' }}>
                  {bookmarkTab === 'news' ? 'คุณยังไม่ได้กดบุ๊กมาร์กข่าวใดๆ จากฟีด' : 'สร้างบทความจากระบบ AI แล้วบันทึกไว้ในสเปซนี้เพื่อกลับมาแก้ไขสิ!'}
                </div>
              ) : (
                <div className={bookmarkTab === 'news' ? "feed-grid" : "article-grid"} style={bookmarkTab === 'article' ? { display: 'flex', flexDirection: 'column', gap: '20px'} : {}}>
                  {bookmarks.filter(b => bookmarkTab === 'news' ? b.type !== 'article' : b.type === 'article').map((item, idx) => (
                    bookmarkTab === 'news' ? (
                      <FeedCard key={item.id || idx} 
                        tweet={item} 
                        isBookmarked={true}
                        onBookmark={handleBookmark}

                        onArticleGen={(it) => {
                          setCreateContentSource(it);
                          setActiveView('content');
                          setTimeout(() => setContentTab('create'), 0);
                        }}
                      />
                    ) : (
                      <div key={item.id} className="animate-fade-in" style={{ background: 'var(--bg-800)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', boxShadow: editingArticleId === item.id ? '0 8px 32px rgba(41, 151, 255, 0.1)' : 'none', transition: 'box-shadow 0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingArticleId === item.id ? '20px' : '16px' }}>
                          <h3 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PenTool size={18} className="text-accent" /> {item.title || 'บทความ'}
                          </h3>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setEditingArticleId(editingArticleId === item.id ? null : item.id)} className="btn-mini-ghost" style={{ background: editingArticleId === item.id ? 'var(--accent-secondary)' : 'transparent', color: editingArticleId === item.id ? '#fff' : 'inherit' }}>
                              {editingArticleId === item.id ? '✓ บันทึกฉบับร่าง' : '📝 แก้ไขเนื้อหา'}
                            </button>
                            <button onClick={() => { if(window.confirm('ยืนยันลบบทความนี้?')) setBookmarks(prev => prev.filter(p => p.id !== item.id)) }} className="btn-mini-ghost" style={{ color: '#ef4444' }}>
                              <Trash2 size={14} /> ลบ
                            </button>
                          </div>
                        </div>
                        {editingArticleId === item.id ? (
                          <textarea 
                            value={item.summary}
                            onChange={(e) => setBookmarks(prev => prev.map(p => p.id === item.id ? { ...p, summary: e.target.value } : p))}
                            style={{ width: '100%', minHeight: '340px', background: 'var(--bg-900)', border: '1px solid var(--accent-secondary)', color: '#fff', padding: '20px', borderRadius: '12px', fontSize: '15px', lineHeight: '1.7', outline: 'none', resize: 'vertical' }}
                          />
                        ) : (
                          <div className="markdown-body" style={{ color: 'var(--text-main)', fontSize: '15px', lineHeight: '1.8' }}>
                            <div dangerouslySetInnerHTML={{ __html: marked.parse(item.summary) }} />
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {listModal.show && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '400px' }}>
            <button onClick={() => setListModal({ ...listModal, show: false })} className="modal-close-btn">
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>
              {listModal.mode === 'create' ? 'สร้าง Post List' : 'นำเข้า Post List'}
            </h2>
            <input 
              className="custom-forge-input"
              style={{ minHeight: 'auto', marginBottom: '20px' }}
              placeholder={listModal.mode === 'create' ? "ชื่อรายการติดตาม (เช่น คริปโต, การเมือง, เทคโนโลยี)" : "วางรหัสแชร์รายการที่นี่..."}
              value={listModal.value}
              onChange={(e) => setListModal({ ...listModal, value: e.target.value })}
              autoFocus
            />
            <button onClick={finalizeListAction} className="forge-action-btn">
              {listModal.mode === 'create' ? <Plus size={16} /> : <FileCode size={16} />}
              {listModal.mode === 'create' ? 'ยืนยันการสร้าง' : 'นำเข้ารายการ'}
            </button>
          </div>
        </div>
      )}

      {filterModal.show && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
             <button onClick={() => setFilterModal({ show: false, prompt: '' })} className="modal-close-btn">
                <X size={20} />
             </button>
             <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={24} className="text-accent" /> AI Filter
             </h2>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>กำหนดเงื่อนไขและคีย์เวิร์ดสำหรับการคัดกรองข่าว...</p>
                <span style={{ fontSize: '10px', color: 'var(--accent-secondary)', fontWeight: '800', background: 'rgba(0,112,243,0.1)', padding: '4px 8px', borderRadius: '4px' }}>MODEL: GROK 4.1</span>
             </div>
             <textarea 
                className="custom-forge-input"
                placeholder="เช่น 'ข่าวที่เกี่ยวกับ Layer 2 และ ZK Proofs' หรือ 'ข่าวการเมืองที่สำคัญ'..."
                value={filterModal.prompt}
                onChange={(e) => setFilterModal({ ...filterModal, prompt: e.target.value })}
                autoFocus
             />
             <button onClick={handleAiFilter} className="forge-action-btn">
                <Filter size={16} /> เริ่มคัดกรองข้อมูล
             </button>
          </div>
        </div>
      )}

      {status && (
        <div className="status-toast" style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: 'white', color: 'black', padding: '10px 20px', borderRadius: '100px', fontSize: '11px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 2000 }}>
          {status}
        </div>
      )}

      <RightSidebar 
        watchlist={watchlist} 
        postLists={postLists}
        activeListId={activeListId}
        onSelectList={setActiveListId}
        onCreateList={() => setListModal({ show: true, mode: 'create', value: '' })}
        onImportList={() => setListModal({ show: true, mode: 'import', value: '' })}
        onRemoveList={handleRemoveList}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onUpdateList={handleUpdateList}
        onShareList={handleShareList}
        onRemoveAccount={handleRemoveAccountGlobal}
        isMobileOpen={isMobilePostListOpen}
        onCloseMobile={() => setIsMobilePostListOpen(false)}
      />
    </div>
  );
};

export default App;
