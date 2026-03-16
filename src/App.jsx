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
  Activity
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import FeedCard from './components/FeedCard';
import { getUserInfo, fetchWatchlistFeed, searchEverything } from './services/TwitterService';
import { researchContext } from './services/GeminiService';
import { generateArticle, agentFilterFeed, generateGrokBatch, expandSearchQuery } from './services/GrokService';
import './index.css';

const App = () => {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('foro_watchlist_v2');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [feed, setFeed] = useState([]);
  const [originalFeed, setOriginalFeed] = useState([]);
  const [deletedFeed, setDeletedFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [syncDuration, setSyncDuration] = useState(null);
  const [liveTimer, setLiveTimer] = useState(0);
  const [lastStats, setLastStats] = useState('');
  const [aiReport, setAiReport] = useState('');
  const [activeFilters, setActiveFilters] = useState({ view: false, like: false });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCursor, setSearchCursor] = useState(null);
  const [onlyNews, setOnlyNews] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLatestMode, setIsLatestMode] = useState(false); // Default to False (High Quality/Top)

  const [forgeTarget, setForgeTarget] = useState(null);
  const [isForging, setIsForging] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [forgeOptions, setForgeOptions] = useState({ format: 'social', customPrompt: '' });

  const [postLists, setPostLists] = useState(() => {
    const saved = localStorage.getItem('foro_postlists_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeListId, setActiveListId] = useState(null);
  const [listModal, setListModal] = useState({ show: false, mode: 'create', value: '' });
  const [filterModal, setFilterModal] = useState({ show: false, prompt: '' });

  useEffect(() => {
    localStorage.setItem('foro_watchlist_v2', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('foro_postlists_v2', JSON.stringify(postLists));
  }, [postLists]);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => setLiveTimer(prev => prev + 1), 1000);
    } else {
      setLiveTimer(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSync = async () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    setStatus('กำลังเชื่อมต่อฐานข้อมูล... ดึงฟีดข่าวล่าสุด');
    const startTime = Date.now();
    try {
      const activeList = activeListId ? postLists.find(l => l.id === activeListId) : null;
      const targetAccounts = activeList ? activeList.members : watchlist;
      
      const { data, meta } = await fetchWatchlistFeed(targetAccounts, '', isLatestMode ? 'Latest' : 'Top');
      setFeed(data);
      setOriginalFeed(data);
      setNextCursor(meta.next_cursor);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      setSyncDuration(duration);
      setLastStats(`${data.length} Signals`);
      
      if (data.length > 0) {
        setStatus('Grok 4.1 กำลังวิเคราะห์และสรุปประเด็น...');
        const batchToSummarize = data.map(t => t.text);
        const summaries = await generateGrokBatch(batchToSummarize);
        const updatedFeed = data.map((t, i) => ({ ...t, summary: summaries[i] }));
        setFeed(updatedFeed);
        setOriginalFeed(updatedFeed);
      }
      
      setStatus('อัปเดตข้อมูลเรียบร้อย');
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const activeList = activeListId ? postLists.find(l => l.id === activeListId) : null;
      const targetAccounts = activeList ? activeList.members : watchlist;
      const { data, meta } = await fetchWatchlistFeed(targetAccounts, nextCursor, isLatestMode ? 'Latest' : 'Top');
      setFeed([...feed, ...data]);
      setNextCursor(meta.next_cursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e, isMore = false) => {
    if (e) e.preventDefault();
    if (!searchQuery && !isMore) return;
    setIsSearching(true);
    setStatus('AI กำลังประเมินเทรนด์... ค้นหาข้อมูลเชิงลึก');
    try {
      let finalQuery = searchQuery;
      if (!isMore) {
        setStatus(`กำลังค้นหาข้อมูลเชิงลึกสำหรับ "${searchQuery}"...`);
        finalQuery = await expandSearchQuery(searchQuery);
        console.log("Expanded Query:", finalQuery);
      }
      
      // Always prioritize 'Top' for search results as per instruction
      const { data, meta } = await searchEverything(finalQuery, isMore ? searchCursor : null, onlyNews, 'Top'); 
      const newResults = isMore ? [...searchResults, ...data] : data;
      setSearchResults(newResults);
      setFeed(newResults); 
      setSearchCursor(meta.next_cursor);
      setStatus(`พบ ${newResults.length} รายการที่เกี่ยวข้อง`);
      
      if (data.length > 0 && !isMore) {
        setStatus('Grok 4.1 กำลังสรุปผลการค้นหาเป็นภาษาไทย...');
        const batchToSummarize = data.map(t => t.text);
        const summaries = await generateGrokBatch(batchToSummarize);
        const updatedData = data.map((t, i) => ({ ...t, summary: summaries[i] }));
        setSearchResults(updatedData);
        setFeed(updatedData); 
        setOriginalFeed(updatedData); // CRITICAL: Fix sort reset bug
      }
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearching(false);
    }
  };

  const handleForge = async (format) => {
    setIsForging(true);
    setForgeOptions({ ...forgeOptions, format });
    try {
      const result = await generateArticle(forgeTarget.text, format, forgeOptions.customPrompt);
      setGeneratedContent(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsForging(false);
    }
  };

  const resolvePlaceholders = async (nodes) => {
    const placeholders = nodes.filter(u => u.isPlaceholder);
    if (placeholders.length === 0) return;

    setStatus(`กำลังดึงข้อมูลบัญชี X จำนวน ${placeholders.length} บัญชี...`);
    
    for (const placeholder of placeholders) {
      try {
        const realData = await getUserInfo(placeholder.username);
        setWatchlist(current => current.map(u => 
          u.username === placeholder.username ? { ...realData, isPlaceholder: false } : u
        ));
      } catch (err) {
        console.error(`Failed to resolve node: ${placeholder.username}`, err);
      }
      // Small delay to be polite to API
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
        members: [],
        createdAt: new Date().toISOString()
      };
      setPostLists([...postLists, newList]);
      setActiveListId(newList.id);
      setStatus(`Matrix Created: ${newList.name}`);
    } else {
      try {
        const decoded = JSON.parse(atob(listModal.value));
        if (!decoded.members || !Array.isArray(decoded.members)) {
          throw new Error('Malformed protocol data');
        }
        
        const newList = { 
          ...decoded, 
          id: Date.now().toString(),
          createdAt: new Date().toISOString()
        };
        
        // Show confirmation with details
        const confirmMsg = `Importing Protocol: ${newList.name}\nTotal Accounts: ${newList.members.length}\n\nMembers:\n${newList.members.slice(0, 5).join(', ')}${newList.members.length > 5 ? '...' : ''}\n\nInitialize this Matrix?`;
        
        if (window.confirm(confirmMsg)) {
          setPostLists([...postLists, newList]);
          setActiveListId(newList.id);
          
          // SYNC TO GLOBAL NODES: Add members to watchlist if they don't exist
          const newWatchlistItems = [];
          newList.members.forEach(handle => {
            const exists = watchlist.find(u => u.username.toLowerCase() === handle.toLowerCase());
            if (!exists) {
              newWatchlistItems.push({
                id: handle, // Use handle as ID for placeholder
                username: handle,
                name: handle,
                profile_image_url: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
                isPlaceholder: true
              });
            }
          });
          
          if (newWatchlistItems.length > 0) {
            setWatchlist(prev => [...prev, ...newWatchlistItems]);
            resolvePlaceholders(newWatchlistItems);
          }
          
          setStatus(`Matrix Integrated: ${newList.name} (${newList.members.length} Nodes Synchronized)`);
        }
      } catch (err) {
        alert('Invalid or Corrupt Matrix Protocol Code.');
        console.error('Import Fault:', err);
      }
    }
    setListModal({ show: false, mode: 'create', value: '' });
  };

  const handleDeleteAll = () => {
    if (feed.length === 0) return;
    setDeletedFeed(prev => [...feed]);
    setFeed([]);
    setStatus('ล้างฟีดทั้งหมดแล้ว');
  };

  const handleRemoveList = (listId) => {
    setPostLists(prev => prev.filter(l => l.id !== listId));
    if (activeListId === listId) setActiveListId(null);
    setStatus('ลบรายการเรียบร้อยแล้ว');
  };

  const handleShareList = (list) => {
    const handles = list.members.join(', @');
    const text = handles ? `@${handles}` : '(ไม่มีสมาชิก)';
    navigator.clipboard.writeText(text).then(() => {
      setStatus(`คัดลอก ${list.members.length} บัญชีจาก "${list.name}" แล้ว`);
    }).catch(() => {
      setStatus(`รายชื่อ "${list.name}": ${text}`);
    });
  };

  const handleUndo = () => {
    if (deletedFeed.length > 0) {
      setFeed([...deletedFeed]);
      setDeletedFeed([]);
      setStatus('เรียกคืนข่าวที่ลบเรียบร้อย');
    } else if (originalFeed.length > 0) {
      setFeed(originalFeed);
      setAiReport('');
      setStatus('Signal Restore: Matrix Reset');
    }
  };

  const handleSort = (type) => {
    setActiveFilters(prev => {
      const next = { ...prev, [type]: !prev[type] };
      
      let sorted = [...feed];
      if (next.view || next.engagement) {
        sorted.sort((a, b) => {
          // Engagement = retweet + comment
          const engagementA = parseInt(a.retweet_count || 0) + parseInt(a.reply_count || 0);
          const engagementB = parseInt(b.retweet_count || 0) + parseInt(b.reply_count || 0);

          const scoreA = (next.view ? parseInt(a.view_count || 0) : 0) + (next.engagement ? engagementA : 0);
          const scoreB = (next.view ? parseInt(b.view_count || 0) : 0) + (next.engagement ? engagementB : 0);
          return scoreB - scoreA;
        });
      } else {
        // Reset to chronological if no filters
        sorted = [...originalFeed];
      }
      
      setFeed(sorted);
      setStatus(`อัปเดตการเรียงลำดับ: ${next.view && next.engagement ? 'ยอดวิว + เอนเกจเมนต์' : next.view ? 'ยอดวิว' : next.engagement ? 'เอนเกจเมนต์' : 'ค่าเริ่มต้น'}`);
      return next;
    });
  };

  const handleAiFilter = async () => {
    if (!filterModal.prompt) return;
    setLoading(true);
    setStatus('AI กำลังคัดกรองข่าวตามความต้องการ...');
    try {
      if (originalFeed.length === 0) setOriginalFeed([...feed]);
      const filtered = await agentFilterFeed(feed, filterModal.prompt);
      setFeed(filtered);
      setAiReport(`Signal Synthesis: ${filtered.length} matches identified for "${filterModal.prompt}"`);
      setFilterModal({ show: false, prompt: '' });
    } catch (err) {
      console.error(err);
      setStatus('AI Filter ผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="foro-layout">
      <Sidebar 
        watchlist={watchlist} 
        onAdd={(u) => {
          if (!watchlist.find(w => w.id === u.id)) {
            setWatchlist([...watchlist, u]);
          }
          if (activeListId) {
            setPostLists(postLists.map(l => {
              if (l.id === activeListId && !l.members.includes(u.username)) {
                return { ...l, members: [...l.members, u.username] };
              }
              return l;
            }));
          }
        }}
        onRemoveAccount={(id) => {
          // Functional setState to avoid stale closure
          setWatchlist(prev => {
            const acc = prev.find(u => u.id === id || u.username === id);
            const usernameToRemove = acc ? acc.username : id;
            // Cascade delete from all post lists
            setPostLists(lists => lists.map(l => ({
              ...l,
              members: l.members.filter(m => m !== usernameToRemove)
            })));
            return prev.filter(u => u.id !== id && u.username !== id);
          });
          setStatus('ลบบัญชีเรียบร้อย');
        }}
        postLists={postLists}
        activeListId={activeListId}
        onSelectList={setActiveListId}
        onCreateList={() => setListModal({ show: true, mode: 'create', value: '' })}
        onImportList={() => setListModal({ show: true, mode: 'import', value: '' })}
        onRemoveList={handleRemoveList}
        onShareList={handleShareList}
        onRemoveMember={(username, listId) => {
          setPostLists(prev => prev.map(l => {
            if (l.id === listId) return { ...l, members: l.members.filter(m => m !== username) };
            return l;
          }));
        }}
      />

      <main className="foro-main">
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', fontWeight: '500', letterSpacing: '0' }}>
              {activeListId ? postLists.find(l => l.id === activeListId)?.name : 'รายการที่ติดตาม'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', letterSpacing: '-0.02em', lineHeight: '1.2', whiteSpace: 'nowrap' }}>
                {activeListId ? postLists.find(l => l.id === activeListId)?.name : 'หน้าหลัก'}
              </h1>
              <div className="control-group">
                 <button onClick={handleDeleteAll} className="icon-btn-large" title="ล้างฟีดทั้งหมด"><Trash2 size={16} /></button>
                 <button onClick={handleUndo} className="icon-btn-large" title="เรียกคืนฟีดที่ลบ"><Undo2 size={16} /></button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: loading ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {loading ? `กำลังซิงค์... (${liveTimer}s)` : lastStats ? `อัปเดต: ${lastStats}` : ''}
            </div>
            
            <div className="feed-management-zone-v2" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button 
                onClick={() => setFilterModal({ show: true, prompt: '' })} 
                className="btn-ai-filter-premium"
                style={{ height: '48px', padding: '0 24px' }}
              >
                <Sparkles size={18} /> AI Filter
              </button>

              <button 
                onClick={handleSync} 
                disabled={loading || watchlist.length === 0} 
                className="btn-sync-premium"
                style={{ height: '48px', padding: '0 32px' }}
              >
                {loading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                ซิงค์ข้อมูล
              </button>
            </div>
          </div>
        </header>

        <section className="command-center animate-fade-in">
          <div className="search-discovery-zone">
            <form onSubmit={(e) => handleSearch(e)} className="universal-search-container">
              <Search size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="ค้นหาอะไรก็ได้..."
                className="universal-search-input"
                style={{ fontSize: '15px', padding: '10px 0' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              <button 
                type="submit" 
                className="btn-discover-premium"
                disabled={isSearching || !searchQuery}
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                ค้นหา
              </button>

              <div className="search-controls" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <button 
                  className={`mode-btn ${isLatestMode ? 'active' : ''}`}
                  onClick={() => setIsLatestMode(!isLatestMode)}
                  type="button"
                  title={isLatestMode ? "ข่าวสารล่าสุด" : "คัดกรองเฉพาะคุณภาพสูง"}
                  style={{ minWidth: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  <Zap size={14} fill={isLatestMode ? "currentColor" : "none"} />
                  ล่าสุด
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="filter-shelf-container animate-fade-in" style={{ marginBottom: '32px' }}>
             <div className="sort-label">เรียงตาม:</div>
             <div className="simple-filter-group" style={{ display: 'flex', gap: '24px' }}>
                <button onClick={() => handleSort('view')} className={`sort-action-btn ${activeFilters.view ? 'active' : ''}`}>
                  <div className="filter-icon"><Eye size={14} /></div> ยอดวิว
                </button>
                <button onClick={() => handleSort('engagement')} className={`sort-action-btn ${activeFilters.engagement ? 'active' : ''}`}>
                  <div className="filter-icon"><Activity size={14} /></div> เอนเกจเมนต์
                </button>
             </div>
        </section>
        
        {status && (
          <div style={{ marginBottom: '24px', padding: '0 12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-secondary)', fontWeight: '700', letterSpacing: '0.05em' }}>{status}</span>
          </div>
        )}

        {aiReport && (
          <div className="ai-report-banner animate-fade-in" style={{ marginBottom: '32px' }}>
             <div className="zap-glow"><Sparkles size={16} /></div>
             <span>{aiReport}</span>
             <button onClick={() => setAiReport('')} className="close-btn"><X size={14} /></button>
          </div>
        )}

        {generatedContent && (
          <section className="forge-workspace-section animate-slide-up" style={{ marginBottom: '48px' }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--accent-secondary)', padding: '8px', borderRadius: '10px', boxShadow: '0 0 20px rgba(0,112,243,0.4)' }}>
                  <PenTool size={20} color="white" />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>INTELLIGENCE FORGE</h2>
                  <div style={{ fontSize: '10px', color: 'var(--accent-secondary)', fontWeight: '800', letterSpacing: '0.1em' }}>USER CONTENT GENERATOR V1.0</div>
                </div>
              </div>
              <button onClick={() => setGeneratedContent(null)} className="icon-btn-large" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="forge-document">
              <div className="forge-doc-header">
                <h3>{forgeTarget?.author?.name || 'Intelligence Report'}</h3>
                <div style={{ fontSize: '11px', opacity: 0.5 }}>Source: @{forgeTarget?.author?.username} &bull; Generated via Grok 4.1</div>
              </div>
              
              <div className="forge-doc-body">
                 {isForging ? (
                   <div style={{ padding: '60px 0', textAlign: 'center' }}>
                     <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--accent-secondary)' }} />
                     <div style={{ fontWeight: '600' }}>Grok 4.1 กำลังสร้างเนื้อหาเชิงลึก...</div>
                   </div>
                 ) : (
                   <div className="content-render" style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                     {generatedContent}
                   </div>
                 )}
              </div>
              
              <div className="forge-doc-footer" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '12px' }}>
                 <button onClick={() => { navigator.clipboard.writeText(generatedContent); setStatus('คัดลอกเนื้อหาเรียบร้อย'); }} className="forge-action-btn" style={{ flex: 1, background: 'var(--accent-secondary)', color: 'var(--bg-950)' }}>
                   <Copy size={14} /> คัดลอกข้อความ
                 </button>
                 <button onClick={() => setGeneratedContent(null)} className="forge-action-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}>
                    ปิดหน้าต่าง
                 </button>
              </div>
            </div>
          </section>
        )}

        <div className="section-title" style={{ margin: '0 0 20px 0' }}>โพสต์ล่าสุด</div>
        <div className="feed-grid">
          {feed.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '100px 0', textAlign: 'center', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
              {isSearching ? (
                <div className="animate-pulse">AI กำลังค้นหาข้อมูลสำหรับ "{searchQuery}"...</div>
              ) : searchQuery && searchResults.length === 0 ? (
                <div>ไม่พบข้อมูลสำหรับ "{searchQuery}" ลองใช้คำค้นหาที่กว้างขึ้น</div>
              ) : status === 'No new updates in the last 24h' ? (
                "ไม่มีอัปเดตใหม่จากบัญชีที่คุณติดตามในช่วง 24 ชั่วโมงที่ผ่านมา"
              ) : watchlist.length === 0 ? (
                "เริ่มโดยการเพิ่มบัญชี X (Twitter) ที่คุณต้องการติดตาม" 
              ) : (
                "ระบบพร้อมทำงาน กดปุ่ม 'ซิงค์ข้อมูลล่าสุด' เพื่อเริ่มสรุปข่าว"
              )}
            </div>
          ) : (
            feed.map((item, idx) => (
              <FeedCard key={item.id || idx} tweet={item} 
                onElevate={async (it) => {
                  setStatus('Model: Gemini 3 | Researching context...');
                  const research = await researchContext(it.text);
                  const enrichedSummary = `${it.summary}\n\n[DEEP INTEL - Gemini 3]: ${research}`;
                  setFeed(prev => prev.map(p => p.id === it.id ? {...p, summary: enrichedSummary} : p));
                  setStatus('Matrix: Intelligence Elevated via Gemini 3');
                }}
                onArticleGen={(it) => setForgeTarget(it)} 
              />
            ))
          )}
        </div>

        {nextCursor && !loading && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <button 
              onClick={handleLoadMore}
              className="action-link"
              style={{ padding: '12px 40px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-900)', color: 'white', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              โหลดข้อมูลเพิ่มเติม
            </button>
          </div>
        )}
      </main>

      {forgeTarget && !generatedContent && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <button onClick={() => setForgeTarget(null)} className="modal-close-btn">
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <PenTool size={24} className="text-accent" /> Content Forge
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
              <span>สร้างเนื้อหาจากโพสต์ของ: <strong>@{forgeTarget.author?.username}</strong></span>
            </p>

            <div className="forge-options-grid">
              <button onClick={() => { handleForge('long-form'); }} className={`forge-opt ${forgeOptions.format === 'long-form' ? 'active' : ''}`}>
                <div className="opt-title">บทวิเคราะห์เชิงลึก</div>
                <div className="opt-desc">รายงานแบบละเอียดพร้อมข้อมูลเชิงเทคนิค</div>
              </button>
              <button onClick={() => { handleForge('social'); }} className={`forge-opt ${forgeOptions.format === 'social' ? 'active' : ''}`}>
                <div className="opt-title">สรุปสั้นๆ สำหรับโซเชียล</div>
                <div className="opt-desc">ย่อใจความสำคัญเพื่อโพสต์ลง X/LinkedIn</div>
              </button>
              <button onClick={() => { handleForge('analytical'); }} className={`forge-opt ${forgeOptions.format === 'analytical' ? 'active' : ''}`}>
                <div className="opt-title">วิเคราะห์เชิงบริบท</div>
                <div className="opt-desc">สรุปเหตุและผล พร้อมแนวโน้มที่ควรจับตามดู</div>
              </button>
            </div>

            <div style={{ marginTop: '20px' }}>
              <div className="section-label">Custom Command</div>
              <textarea 
                className="custom-forge-input"
                placeholder="Enter custom forging protocol (e.g., 'Write in aggressive VC style')..."
                value={forgeOptions.customPrompt}
                onChange={(e) => setForgeOptions({...forgeOptions, customPrompt: e.target.value})}
              />
              <button 
                onClick={() => handleForge('custom')}
                disabled={isForging}
                className="forge-action-btn"
              >
                {isForging ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                Forge New Intelligence
              </button>
            </div>
          </div>
        </div>
      )}

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
              placeholder={listModal.mode === 'create' ? "ชื่อรายการติดตาม (เช่น คริปโต, การเมือง, เทคโนโลยี)" : "วางข้อมูลบัญชีหรือไฟล์รายชื่อที่นี่..."}
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
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Define filtration parameters for the Matrix...</p>
                <span style={{ fontSize: '10px', color: 'var(--accent-secondary)', fontWeight: '800', background: 'rgba(0,112,243,0.1)', padding: '4px 8px', borderRadius: '4px' }}>MODEL: GROK 4.1</span>
             </div>
             <textarea 
                className="custom-forge-input"
                placeholder="e.g., 'Signals related to Layer 2 and ZK Proofs' or 'High sentiment geopolitical shifts'..."
                value={filterModal.prompt}
                onChange={(e) => setFilterModal({ ...filterModal, prompt: e.target.value })}
                autoFocus
             />
             <button onClick={handleAiFilter} className="forge-action-btn">
                <Filter size={16} /> EXECUTE FILTRATION
             </button>
          </div>
        </div>
      )}

      {status && (loading || status.startsWith('FORO') || status.startsWith('Matrix')) && (
        <div style={{ position: 'fixed', bottom: '32px', right: '32px', background: 'white', color: 'black', padding: '10px 20px', borderRadius: '100px', fontSize: '11px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 2000 }}>
          {status}
        </div>
      )}
    </div>
  );
};

export default App;
