import React, { useState } from 'react';
import { Search, UserPlus, Trash2, Plus, FileCode, Share2, List, LayoutGrid, Copy, ArrowRight, Loader2, X } from 'lucide-react';
import { getUserInfo } from '../services/TwitterService';

const Sidebar = ({ 
  watchlist, 
  onRemoveAccount,
  onAdd, 
  postLists = [], 
  activeListId, 
  onSelectList, 
  onCreateList, 
  onImportList,
  onRemoveList,
  onShareList,
  onAddToList,
  onRemoveMember
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewUser, setPreviewUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    setPreviewUser(null);
    try {
      const data = await getUserInfo(searchQuery);
      setPreviewUser(data);
    } catch (err) {
      console.error('Matrix Node Search Fault:', err);
      alert(`Matrix Node Error: ${err.message || 'Node not found or API issue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (previewUser) {
      onAdd(previewUser);
      setPreviewUser(null);
      setSearchQuery('');
    }
  };

  const handleListClick = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      onSelectList(id);
    }
  };

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 8px' }}>
        <div style={{ 
          width: '36px', height: '36px', 
          background: 'var(--accent-secondary)', 
          borderRadius: '10px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontWeight: '900', color: 'white',
          boxShadow: '0 4px 12px rgba(0, 112, 243, 0.4)'
        }}>F</div>
        <span style={{ fontWeight: '800', fontSize: '20px', letterSpacing: '-0.04em' }}>FORO INTEL</span>
      </div>

      <nav className="sidebar-nav">
        <button 
          className={`nav-item ${!activeListId ? 'active' : ''}`} 
          onClick={() => { onSelectList(null); setExpandedId(null); }}
        >
          <LayoutGrid size={16} /> Main Dashboard
        </button>
      </nav>

      <div className="section-title">รายการติดตาม (Lists)</div>
      <div style={{ padding: '0 8px', marginBottom: '16px' }}>
        <button onClick={onCreateList} className="forge-action-btn" style={{ background: 'var(--accent-secondary)', color: 'var(--bg-950)', fontWeight: '700' }}>
          <Plus size={16} /> สร้างใหม่
        </button>
        <button onClick={onImportList} className="forge-action-btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}>
          <FileCode size={16} /> นำเข้ารายชื่อ
        </button>
      </div>
      
      <div style={{ overflowY: 'auto', flex: 1, padding: '0 2px' }}>
        {postLists.map(list => (
          <React.Fragment key={list.id}>
            <div 
              className={`watchlist-item ${activeListId === list.id ? 'active' : ''}`}
              onClick={() => onSelectList(list.id)}
              style={{ marginBottom: expandedId === list.id ? '4px' : '8px', cursor: 'pointer' }}
            >
              <div 
                onClick={(e) => { e.stopPropagation(); handleListClick(list.id); }}
                style={{ display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px', background: expandedId === list.id ? 'rgba(0,112,243,0.1)' : 'transparent' }}
                title="Toggle Members"
              >
                <List size={14} color={expandedId === list.id ? 'var(--accent-secondary)' : 'var(--text-muted)'} />
              </div>
              <div style={{ flex: 1, minWidth: 0, marginLeft: '8px' }}>
                <div className="truncate" style={{ fontWeight: '600', fontSize: '13px' }}>{list.name}</div>
                <div style={{ fontSize: '10px', opacity: 0.6 }}>{list.members.length} accounts</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={(e) => { e.stopPropagation(); onShareList(list); }} className="btn-remove">
                  <Share2 size={12} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onRemoveList(list.id); }} className="btn-remove">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            
            {expandedId === list.id && list.members.length > 0 && (
              <div style={{ padding: '0 8px 12px 28px', display: 'flex', flexDirection: 'column', gap: '4px' }} className="animate-fade-in">
                {list.members.map(handle => (
                  <div key={handle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>@{handle}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveMember(handle, list.id); }} 
                      className="btn-remove"
                      style={{ padding: '2px' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}

        <div className="section-title" style={{ marginTop: '24px' }}>บัญชีที่ติดตาม (Accounts)</div>
        <form onSubmit={handleSearch} style={{ margin: '0 8px 16px', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="custom-forge-input"
              style={{ minHeight: 'auto', padding: '8px 12px 8px 32px', marginBottom: 0, borderRadius: '8px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา X Username"
            />
          </div>
          <button type="submit" disabled={loading} className="icon-btn-large" style={{ width: '36px', height: '36px', background: 'var(--accent-secondary)', color: 'var(--bg-950)', border: 'none' }}>
            {loading ? <Loader2 className="animate-spin" size={14} /> : <ArrowRight size={14} />}
          </button>
        </form>

        {previewUser && (
          <div style={{ margin: '0 8px 16px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <img src={previewUser.profile_image_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
              <div style={{ overflow: 'hidden' }}>
                <div className="truncate" style={{ fontWeight: '600', fontSize: '12px' }}>{previewUser.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>@{previewUser.username}</div>
              </div>
            </div>
            <button onClick={handleAdd} className="forge-action-btn" style={{ padding: '6px', fontSize: '11px', background: 'var(--accent-secondary)', color: 'var(--bg-950)', fontWeight: '700' }}>
              <Plus size={12} /> {activeListId ? 'เพิ่มเข้าบัญชีนี้' : 'ติดตามบัญชีนี้'}
            </button>
          </div>
        )}

        {watchlist.map(user => (
          <div key={user.id} className="watchlist-item">
            <img src={user.profile_image_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--glass-border)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate" style={{ fontWeight: '500', fontSize: '11px' }}>{user.name}</div>
              <div style={{ fontSize: '9px', opacity: 0.5 }}>@{user.username}</div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {activeListId && !postLists.find(l => l.id === activeListId)?.members.some(m => m.toLowerCase() === user.username.toLowerCase()) && (
                <button onClick={() => onAddToList(user.username)} className="btn-remove" title="Add to Active List">
                  <Plus size={12} color="var(--accent-secondary)" />
                </button>
              )}
              <button onClick={() => onRemoveAccount(user.id)} className="btn-remove" title="ลบออกจากรายชื่อ">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="premium-footer">
        PROTOCOL V2.0 &bull; PRESTIGE
      </div>
    </aside>
  );
};

export default Sidebar;
