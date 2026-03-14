import React, { useState } from 'react';
import { Search, UserPlus, Trash2 } from 'lucide-react';
import { getUserInfo } from '../services/TwitterService';

const Sidebar = ({ watchlist, onRemove, onAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewUser, setPreviewUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setLoading(true);
    setError('');
    setPreviewUser(null);
    
    try {
      const data = await getUserInfo(searchQuery);
      setPreviewUser(data);
    } catch (err) {
      setError('User not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (previewUser) {
      onAdd({
        id: previewUser.id,
        username: previewUser.username,
        name: previewUser.name,
        profile_image_url: previewUser.profile_image_url,
        description: previewUser.description
      });
      setPreviewUser(null);
      setSearchQuery('');
    }
  };

  return (
    <div className="foro-sidebar">
      <div className="logo-container">
        <div className="logo-box">F</div>
        <span className="logo-text">FORO</span>
      </div>

      <form onSubmit={handleSearch} className="search-container">
        <input
          type="text"
          placeholder="Search Twitter @handle"
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="search-icon" size={16} />
      </form>

      {loading && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Searching...</div>}
      {error && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '16px' }}>{error}</div>}

      {previewUser && (
        <div className="preview-card animate-fade-in">
          <div className="user-info-flex">
            <img src={previewUser.profile_image_url} alt="" className="avatar-lg" />
            <div style={{ overflow: 'hidden' }}>
              <div className="truncate" style={{ fontWeight: '700', fontSize: '14px' }}>{previewUser.name}</div>
              <div className="truncate" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{previewUser.username}</div>
            </div>
          </div>
          <p className="line-clamp-2" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {previewUser.description}
          </p>
          <button onClick={handleAdd} className="btn-add">
            <UserPlus size={14} /> Add to Watchlist
          </button>
        </div>
      )}

      <div className="watchlist-section">
        <h3 className="section-label">Watchlist</h3>
        {watchlist.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0 8px' }}>Nothing added yet</div>
        ) : (
          watchlist.map(user => (
            <div key={user.id} className="watchlist-item">
              <img src={user.profile_image_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: '13px', fontWeight: '600' }}>{user.name}</div>
                <div className="truncate" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>@{user.username}</div>
              </div>
              <button onClick={() => onRemove(user.id)} className="btn-remove">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--bg-800)', fontSize: '10px', color: 'var(--text-muted)' }}>
        FORO v1.0 • AI AGGREGATOR
      </div>
    </div>
  );
};

export default Sidebar;
