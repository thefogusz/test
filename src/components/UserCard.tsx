import React, { useState } from 'react';
import { ExternalLink, Trash2, Plus } from 'lucide-react';
import type { PostList, WatchlistUser } from '../types/domain';

type UserCardProps = {
  user: WatchlistUser;
  postLists?: PostList[];
  onToggleList?: (listId: string, username: string) => void;
  onRemove?: (userId: string) => void;
};

const UserCard = ({ user, postLists = [], onToggleList, onRemove }: UserCardProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="user-card user-list-item animate-fade-in" style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      padding: '14px',
      background: 'rgba(255,255,255,0.02)', 
      border: '1px solid var(--glass-border)', 
      borderRadius: '18px',
      transition: 'all 0.2s',
      position: 'relative',
      zIndex: showMenu ? 50 : 1,
      width: '100%',
      minWidth: 0,
      overflow: 'visible'
    }}>
      <div className="user-card-top" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <img 
          src={user.profile_image_url ? user.profile_image_url.replace('_normal', '_200x200') : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true&size=128`} 
          style={{ width: '52px', height: '52px', borderRadius: '50%', border: '1px solid var(--bg-700)', flexShrink: 0, objectFit: 'cover' }} 
          alt={user.name}
          onError={e => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=random&color=fff&bold=true&size=128`;
          }}
        />

        <div className="user-card-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: '#fff', lineHeight: '1.25', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{user.username}</div>
          <a
            href={`https://x.com/${user.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="user-card-profile-link"
            style={{ color: 'var(--accent-secondary)', fontSize: '11px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', marginTop: '2px' }}
          >
            X Profile <ExternalLink size={10} />
          </a>
        </div>

        <div className="user-card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {onRemove && (
          <button 
            onClick={() => onRemove(user.id)}
            className="user-card-icon-btn user-card-remove-btn"
            style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={14} />
          </button>
        )}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="user-card-icon-btn"
            style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--bg-700)', border: '1px solid var(--glass-border)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                    const isMember = Array.isArray(list.members) && list.members.some((member) => member?.toLowerCase() === user.username?.toLowerCase());
                    return (
                        <div 
                          key={list.id} 
                          onClick={() => { onToggleList?.(list.id, user.username); setShowMenu(false); }}
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
    </div>
  );
};

export default UserCard;
