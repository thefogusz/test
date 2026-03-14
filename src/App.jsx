import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { fetchForoFeed, getThreadContext } from './services/TwitterService';
import { generateForoSummary, agentFilterFeed, generateContentArticle, generateGeminiBatch } from './services/GeminiService';
import { RefreshCw, MessageSquare, ExternalLink, PenTool, Sparkles, X } from 'lucide-react';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '24h';
  const now = new Date();
  const date = new Date(timestamp);
  
  // Handling case where timestamp might be in seconds or milliseconds
  if (isNaN(date.getTime())) return '24h';
  
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)}s`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

const FeedCard = ({ tweet, onArticleGen }) => {
  return (
    <div className="feed-card animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={tweet.author?.profile_image_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px' }}>{tweet.author?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              @{tweet.author?.username} • {formatRelativeTime(tweet.createdAt || tweet.created_at || tweet.created_at_src)}
            </div>
          </div>
        </div>
      </div>

      <div className="summary-box">
        <div className="summary-label">
          <Sparkles size={12} /> Gemini Intelligence
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
          {tweet.summary || 'Analyzing intelligence...'}
        </p>
      </div>

      <div className="original-text">
        "{tweet.text}"
      </div>

      <div className="card-actions">
        <a 
          href={`https://x.com/${tweet.author?.username}/status/${tweet.id}`} 
          target="_blank" 
          rel="noreferrer"
          className="action-link"
        >
          <ExternalLink size={14} /> View on X
        </a>
        <button 
          onClick={() => onArticleGen(tweet)}
          className="action-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
        >
          <PenTool size={14} /> Create Content
        </button>
      </div>
    </div>
  );
};



const App = () => {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('foro-watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [syncDuration, setSyncDuration] = useState(null);
  const [agentPrompt, setAgentPrompt] = useState('');
  const [article, setArticle] = useState(null);


  useEffect(() => {
    const normalized = watchlist.map(user => ({
      ...user,
      username: user.username || user.userName || '',
      profile_image_url: user.profile_image_url || user.profilePicture || ''
    }));
    
    if (JSON.stringify(normalized) !== JSON.stringify(watchlist)) {
      setWatchlist(normalized);
    }
    localStorage.setItem('foro-watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const handleSync = async () => {
    const handles = watchlist.map(u => u.username).filter(h => h && h !== 'undefined');
    if (handles.length === 0) {
      setStatus('No valid accounts in watchlist');
      return;
    }

    setLoading(true);
    setStatus('Syncing latest tweets...');
    setSyncDuration(null);

    const startTime = performance.now();
    
    try {
      const tweets = await fetchForoFeed(handles);
      if (!tweets || tweets.length === 0) {
        setStatus('No new updates in the last 24h');
        setFeed([]);
        setLoading(false);
        return;
      }

      setStatus(`Analyzing ${tweets.length} stories in SUPER TURBO mode...`);
      
      // 1. Direct Content Mapping (Bypassing Thread Context for Speed)
      const storyContents = tweets.map(t => t.text);

      // 2. Batch Summarization (Gemini Standalone for Max Speed)
      setStatus('FORO Gemini 3.1 Flash Lite: Processing Intel...');
      
      const geminiStart = performance.now();
      const geminiSummaries = await generateGeminiBatch(storyContents);
      console.log(`⏱️ Gemini Sync Finish: ${((performance.now() - geminiStart)/1000).toFixed(2)}s`);

      // 3. Construct Enriched Feed
      const enrichedFeed = tweets.map((t, idx) => {
        const rawAuthor = t.author || {};
        const author = {
          id: rawAuthor.id,
          name: rawAuthor.name || rawAuthor.displayName || '',
          username: rawAuthor.username || rawAuthor.userName || rawAuthor.screen_name || '',
          profile_image_url: rawAuthor.profile_image_url || rawAuthor.profilePicture || rawAuthor.profile_image_url_https || rawAuthor.avatar || ''
        };
        return { 
          ...t, 
          author, 
          summary: geminiSummaries[idx],
          fullStory: storyContents[idx] 
        };
      });
      
      setFeed(enrichedFeed);
      
      
      setSyncDuration(((performance.now() - startTime) / 1000).toFixed(2));
      setStatus('FORO Updated');
    } catch (err) {
      console.error(err);
      setStatus('Error syncing feed');
    } finally {
      setLoading(false);
    }
  };

  const handleAgentAction = async (e) => {
    e.preventDefault();
    if (!agentPrompt || feed.length === 0) return;
    setLoading(true);
    try {
      const filtered = await agentFilterFeed(feed, agentPrompt);
      setFeed(filtered);
      setAgentPrompt('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="foro-layout">
      <Sidebar 
        watchlist={watchlist} 
        onAdd={(u) => setWatchlist([...watchlist, u])}
        onRemove={(id) => setWatchlist(watchlist.filter(u => u.id !== id))}
      />

      <main className="foro-main">
        <div className="dashboard-header">
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>FORO Intelligence</div>
            <h1 style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '-1px' }}>Your Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                {syncDuration ? `Sync Time: ${syncDuration}s` : 'Last Updated'}
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>Just now</div>
            </div>
            <button onClick={handleSync} disabled={loading || watchlist.length === 0} className="btn-sync">
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Sync Intelligence
            </button>
          </div>
        </div>

        <form onSubmit={handleAgentAction} className="agent-form">
          <input
            type="text"
            placeholder="Command FORO Agent: e.g., 'Only show Sora updates'"
            className="agent-input"
            value={agentPrompt}
            onChange={(e) => setAgentPrompt(e.target.value)}
          />
          <Sparkles className="agent-icon" size={20} />
        </form>



        <div className="feed-grid">
          {feed.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '120px 0', textAlign: 'center', border: '2px dashed var(--bg-800)', borderRadius: '24px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px' }}>
              {status === 'No new updates in the last 24h' 
                ? "Checking finished: No new updates from your watchlist in the last 24h."
                : watchlist.length === 0 
                  ? "Start by adding accounts to your Watchlist" 
                  : "Watchlist ready. Click Sync to fetch intelligence."}
            </div>
          ) : (
            feed.map((item, idx) => (
              <FeedCard key={item.id || idx} tweet={item} onArticleGen={async (it) => {
                setLoading(true);
                const art = await generateContentArticle(it);
                setArticle(art);
                setLoading(false);
              }} />
            ))
          )}
        </div>
      </main>

      {article && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <button onClick={() => setArticle(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PenTool size={24} /> Content Forge
            </h2>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '16px', border: '1px solid var(--bg-800)', maxHeight: '60vh', overflowY: 'auto', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
              {article}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(article); alert('Copied to clipboard!'); }} style={{ width: '100%', marginTop: '24px', background: 'white', color: 'black', fontWeight: '800', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>
              Copy Content
            </button>
          </div>
        </div>
      )}

      {status && (loading || status === 'FORO Updated') && (
        <div style={{ position: 'fixed', bottom: '32px', right: '32px', background: 'white', color: 'black', padding: '8px 16px', borderRadius: '100px', fontSize: '10px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
          {status}
        </div>
      )}
    </div>
  );
};

export default App;
