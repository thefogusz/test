import React, { useState } from 'react';
import { Plus, Trash2, X, FileCode, List, Library, Share2 } from 'lucide-react';

const normalizeHandle = (value) => (value || '').trim().replace(/^@/, '').toLowerCase();

const getMatchPriority = (user, query) => {
  const normalizedQuery = normalizeHandle(query);
  const username = normalizeHandle(user?.username);
  const name = (user?.name || '').trim().toLowerCase();

  if (!normalizedQuery) return 0;
  if (username === normalizedQuery) return 0;
  if (username.startsWith(normalizedQuery)) return 1;
  if (name.startsWith(normalizedQuery)) return 2;
  if (username.includes(normalizedQuery)) return 3;
  if (name.includes(normalizedQuery)) return 4;
  return 5;
};

const getAvailableAccounts = (watchlist, members) => {
  const memberHandles = new Set(
    (Array.isArray(members) ? members : [])
      .map(normalizeHandle)
      .filter(Boolean),
  );
  const seenHandles = new Set();

  return (Array.isArray(watchlist) ? watchlist : []).filter((user) => {
    const handle = normalizeHandle(user?.username);
    if (!handle || memberHandles.has(handle) || seenHandles.has(handle)) {
      return false;
    }

    seenHandles.add(handle);
    return true;
  });
};

const RightSidebar = ({
  watchlist,
  postLists,
  activeListId,
  onSelectList,
  onCreateList,
  onImportList,
  onRemoveList,
  onAddMember,
  onRemoveMember,
  onUpdateList,
  onShareList,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const [addHandle, setAddHandle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const COLORS = [
    '#2997ff', // Electric Blue
    '#00d2ff', // Cyan
    '#34c759', // Green
    '#ff3b30', // Red
    '#ff9500', // Orange
    '#af52de', // Purple
    '#ff2d55', // Pink
  ];

  const handleListClick = (id) => {
    if (activeListId === id) {
      onSelectList(null);
    } else {
      onSelectList(id);
    }
  };

  const handleStartEdit = (e, list) => {
    e.stopPropagation();
    setEditingId(list.id);
    setEditingName(list.name);
  };

  const handleSaveName = (id) => {
    if (editingName.trim()) {
      onUpdateList(id, { name: editingName.trim() });
    }
    setEditingId(null);
  };

  return (
    <aside className={`right-sidebar ${isMobileOpen ? 'mobile-visible' : ''}`}>
      {/* SHEET HANDLE (Only for mobile sheet) */}
      <div className="sheet-handle mobile-only-flex" />

      {/* Header */}
      <div className="right-sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', transition: 'color 0.2s', cursor: 'pointer' }} onMouseOver={e=>e.currentTarget.style.color='#fff'} onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'}>
          <Library size={24} />
          <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, letterSpacing: '-0.01em', color: '#fff' }}>Post list</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
          {isMobileOpen && (
            <button 
              onClick={onCloseMobile}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex', marginRight: '8px' }}
            >
              <X size={18} />
            </button>
          )}
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)} 
            title="จัดการ Post List" 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%', transition: 'all 0.2s' }} 
            onMouseOver={e=>{e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.1)'}} 
            onMouseOut={e=>{e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='transparent'}}
          >
            <Plus size={20} />
          </button>
          
          {showAddMenu && (
            <>
              <div 
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                onClick={() => setShowAddMenu(false)} 
              />
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-900)', border: '1px solid var(--glass-border)', borderRadius: '10px', zIndex: 999, width: '160px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                <button
                  onClick={() => { onCreateList(); setShowAddMenu(false); }}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Plus size={14} /> สร้าง Post List
                </button>
                <button
                  onClick={() => { onImportList(); setShowAddMenu(false); }}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <FileCode size={14} /> นำเข้าด้วยรหัส
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="right-sidebar-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        
        {/* Create Action (Replaced Import) */}
        <div style={{ marginBottom: '16px' }}>
          <button onClick={onCreateList} className="btn-pill" style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}>
            <Plus size={14} /> สร้าง Post List
          </button>
        </div>

        {/* POST LISTS (Playlists style) */}
        <div className="list-container" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: postLists.length === 0 ? 1 : 'none' }}>
          {postLists.map(list => {
            const normalizedMembers = new Set(
              (Array.isArray(list.members) ? list.members : [])
                .map(normalizeHandle)
                .filter(Boolean),
            );
            const availableAccounts = getAvailableAccounts(watchlist, list.members);
            const normalizedQuery = normalizeHandle(addHandle);
            const matchingAccounts = (normalizedQuery
              ? availableAccounts.filter((user) => {
                  const username = normalizeHandle(user?.username);
                  const name = (user?.name || '').trim().toLowerCase();
                  return username.includes(normalizedQuery) || name.includes(normalizedQuery);
                })
              : availableAccounts
            ).sort((left, right) => {
              const priorityDiff = getMatchPriority(left, normalizedQuery) - getMatchPriority(right, normalizedQuery);
              if (priorityDiff !== 0) return priorityDiff;
              return (left?.name || left?.username || '').localeCompare(right?.name || right?.username || '');
            });
            const exactMatch = normalizedQuery
              ? matchingAccounts.find((user) => normalizeHandle(user?.username) === normalizedQuery)
              : null;
            const singleMatch = matchingAccounts.length === 1 ? matchingAccounts[0] : null;
            const canAddManually = normalizedQuery && !normalizedMembers.has(normalizedQuery) && matchingAccounts.length === 0;
            const helperText = !normalizedQuery
              ? `Browse all ${availableAccounts.length} available accounts from your watchlist.`
              : exactMatch
                ? `Press Enter to add @${exactMatch.username}.`
                : singleMatch
                  ? `Press Enter to add @${singleMatch.username}.`
                  : canAddManually
                    ? `No watchlist match found. Press Enter to add @${normalizedQuery} manually.`
                    : `Found ${matchingAccounts.length} matching accounts in your watchlist.`;
            const handleSubmitAdd = () => {
              if (!normalizedQuery) return;

              if (exactMatch) {
                onAddMember(list.id, exactMatch.username);
                setAddHandle('');
                return;
              }

              if (singleMatch) {
                onAddMember(list.id, singleMatch.username);
                setAddHandle('');
                return;
              }

              if (canAddManually) {
                onAddMember(list.id, normalizedQuery);
                setAddHandle('');
              }
            };

            return (
            <React.Fragment key={list.id}>
              <div 
                className={`spotify-list-item ${activeListId === list.id ? 'active' : ''}`}
                onClick={() => handleListClick(list.id)}
                style={{ 
                  padding: '8px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: 'pointer', 
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                  background: activeListId === list.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: '1px solid transparent',
                  borderColor: activeListId === list.id ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
                onMouseOver={e => { if(activeListId !== list.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseOut={e => { if(activeListId !== list.id) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Color Picker & Cover Icon */}
                <div 
                  className="list-cover" 
                   onClick={(e) => { 
                     e.stopPropagation(); 
                     if (expandedId === list.id) {
                        setExpandedId(null); 
                        setAddHandle('');
                        onSelectList(null);
                      } else {
                        setExpandedId(list.id); 
                        setAddHandle('');
                        onSelectList(list.id); 
                      }
                    }} 
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '8px', 
                    background: list.color || 'var(--bg-700)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0, 
                    boxShadow: `0 4px 12px ${list.color ? list.color + '44' : 'rgba(0,0,0,0.3)'}`, 
                    position: 'relative',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <List size={22} color="rgba(255,255,255,0.9)" />
                </div>

                <div className="list-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {editingId === list.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => handleSaveName(list.id)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveName(list.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ 
                        background: 'rgba(255,255,255,0.1)', 
                        border: 'none', 
                        borderRadius: '4px', 
                        color: '#fff', 
                        fontSize: '15px', 
                        fontWeight: '600', 
                        padding: '4px 8px', 
                        outline: 'none',
                        width: '100%'
                      }}
                    />
                  ) : (
                    <div 
                      className="list-name" 
                      onDoubleClick={(e) => handleStartEdit(e, list)}
                      style={{ 
                        fontWeight: '700', 
                        fontSize: '15px', 
                        color: activeListId === list.id ? (list.color || 'var(--accent-blue)') : '#fff', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        marginBottom: '2px',
                        transition: 'color 0.2s'
                      }}
                    >
                      {list.name}
                    </div>
                  )}
                  <div className="list-meta" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
                    List • {list.members.length} accounts
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {confirmDeleteId === list.id ? (
                    <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => { onRemoveList(list.id); setConfirmDeleteId(null); }}
                        style={{ background: '#ef4444', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', padding: '4px 8px', fontWeight: '800' }}
                      >Delete</button>
                      <button 
                        onClick={() => setConfirmDeleteId(null)}
                        style={{ background: 'var(--bg-700)', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', padding: '4px 8px' }}
                      >No</button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onShareList(list); }} 
                        className="action-hover-btn" 
                        title="แชร์ Post List"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '8px', cursor: 'pointer', opacity: activeListId === list.id ? 1 : 0, transition: 'all 0.2s' }} 
                        onMouseOver={e=>e.currentTarget.style.color='var(--accent-blue)'} 
                        onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'}
                      >
                        <Share2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(list.id); }} 
                        className="action-hover-btn" 
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '8px', cursor: 'pointer', opacity: activeListId === list.id ? 1 : 0, transition: 'all 0.2s' }} 
                        onMouseOver={e=>e.currentTarget.style.color='#ef4444'} 
                        onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Color Swatches - shown ONLY when expanded */}
              {expandedId === list.id && (
                <div style={{ display: 'flex', gap: '6px', padding: '4px 12px 12px 60px' }}>
                  {COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={(e) => { e.stopPropagation(); onUpdateList(list.id, { color: c }); }}
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '50%', 
                        background: c, 
                        border: list.color === c ? '2px solid #fff' : 'none', 
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Spotify-Style Expanded Members View */}
              {expandedId === list.id && (
                <div className="list-members-container" style={{ padding: '0 8px 16px 12px' }}>
                  
                  {/* Search/Add Input - Spotify Style */}
                  <div style={{ position: 'relative', marginBottom: '16px', padding: '0 4px' }}>
                    <input 
                      type="text" 
                      placeholder="Search your watchlist or type @handle" 
                      value={addHandle}
                      onChange={(e) => setAddHandle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSubmitAdd();
                        }
                      }}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '4px', padding: '10px 14px', fontSize: '13px', color: '#fff', outline: 'none' }}
                    />
                    <div style={{ marginTop: '8px', padding: '0 2px', fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                      {helperText}
                    </div>
                  </div>

                  {/* Current Members List */}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '20px' }}>
                     {list.members.length > 0 && list.members.map(handle => {
                       const userAcc = watchlist.find(u => normalizeHandle(u?.username) === normalizeHandle(handle));
                       return (
                         <div key={handle} className="member-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                           <img 
                             src={userAcc?.profile_image_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'} 
                             alt={handle}
                             style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                             onError={e => { 
                               e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(handle)}&background=random&color=fff&bold=true`; 
                             }}
                           />
                           <div style={{ flex: 1, minWidth: 0 }}>
                             <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userAcc?.name || handle}</div>
                             <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>@{handle}</div>
                           </div>
                           <button onClick={() => onRemoveMember(handle, list.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                             <X size={16} />
                           </button>
                         </div>
                       );
                    })}
                  </div>

                   {/* Available Accounts */}
                   {(availableAccounts.length > 0 || canAddManually || normalizedQuery) && (
                     <div className="animate-fade-in">
                       <div style={{ padding: '0 8px 12px', fontSize: '14px', fontWeight: '800', color: '#fff', letterSpacing: '-0.01em' }}>
                         {normalizedQuery ? `Matching accounts (${matchingAccounts.length})` : `Available accounts (${availableAccounts.length})`}
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                         {matchingAccounts.map(u => (
                           <div key={u.id} className="suggestion-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                             <img 
                               src={u.profile_image_url} 
                              alt={u.username}
                              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', opacity: 0.8 }}
                              onError={e => { 
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&bold=true`; 
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{u.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>@{u.username}</div>
                            </div>
                             <button 
                               onClick={() => {
                                 onAddMember(list.id, u.username);
                                 setAddHandle('');
                               }}
                               style={{ border: '1px solid var(--text-dim)', background: 'transparent', borderRadius: '999px', color: '#fff', padding: '6px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                               onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                               onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent'; }}
                             >Add</button>
                           </div>
                         ))}
                         {matchingAccounts.length === 0 && !canAddManually && (
                           <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                             No matching watchlist accounts for "{addHandle.trim()}".
                           </div>
                         )}
                         {canAddManually && (
                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                             <div style={{ minWidth: 0 }}>
                               <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Add @{normalizedQuery} manually</div>
                               <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>This account is not in your watchlist yet.</div>
                             </div>
                             <button
                               onClick={() => handleSubmitAdd()}
                               style={{ border: '1px solid var(--text-dim)', background: 'transparent', borderRadius: '999px', color: '#fff', padding: '6px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                               onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                               onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent'; }}
                             >
                               Add
                             </button>
                           </div>
                         )}
                       </div>
                     </div>
                   )}
                 </div>
               )}
             </React.Fragment>
          )})}
          
          {/* Centered Empty State for List */}
          {postLists.length === 0 && (
             <div className="empty-state-list" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px 80px', textAlign: 'center', gap: '16px' }}>
              <Library size={48} style={{ color: 'var(--bg-700)' }} />
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>ไม่มีรายการ Post list</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>สร้างใหม่เพื่อจัดระเบียบแหล่งข้อมูลของคุณ</div>
              <button onClick={onCreateList} className="btn-pill primary" style={{ marginTop: '8px', padding: '0 32px' }}>สร้างลิสต์</button>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
};

export default RightSidebar;
