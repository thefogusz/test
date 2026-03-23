import React, { useState } from 'react';
import { ExternalLink, Trash2, Plus } from 'lucide-react';

const UserCard = ({ user, postLists = [], onToggleList, onRemove }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="user-list-item animate-fade-in" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      padding: '8px 12px', 
      background: 'rgba(255,255,255,0.02)', 
      border: '1px solid var(--glass-border)', 
      borderRadius: '12px',
      transition: 'all 0.2s',
      position: 'relative',
      zIndex: showMenu ? 50 : 1,
      width: '100%',
      minWidth: 0,
      overflow: 'visible'
    }}>
      <img 
        src={user.profile_image_url ? user.profile_image_url.replace('_normal', '_200x200') : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true&size=128`} 
        style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid var(--bg-700)', flexShrink: 0, objectFit: 'cover' }} 
        alt={user.name}
        onError={e => e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true&size=128`}
      />
      
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: '800', fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>@{user.username}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a
            href={`https://x.com/${user.username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-secondary)', fontSize: '10px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            X Profile <ExternalLink size={10} />
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        {onRemove && (
          <button 
            onClick={() => onRemove(user.id)}
            style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={14} />
          </button>
        )}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--bg-700)', border: '1px solid var(--glass-border)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={16} style={{ transform: showMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          
          {showMenu && (
            <>
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
                onClick={() => setShowMenu(false)}
              />
              <div className="discovery-menu" style={{ 
                display: 'block',
                position: 'absolute', 
                top: '100%', 
                right: 0, 
                marginTop: '8px', 
                zIndex: 100, 
                minWidth: '180px'
              }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>ADD TO POST LIST</div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {postLists.map(list => {
                    const isMember = list.usernames?.includes(user.username);
                    return (
                        <div 
                          key={list.id} 
                          onClick={() => { onToggleList(user.username, list.id); setShowMenu(false); }}
                          className={`discovery-menu-item ${isMember ? 'active' : ''}`}
                        >
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>{list.name}</span>
                          {isMember && <Trash2 size={12} />}
                        </div>
                    );
                  })}
                  {postLists.length === 0 && <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>ไม่มีรายการปลิสต์</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
