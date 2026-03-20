import React from 'react';
import { Home, BookOpen, Search, Users, UserCheck, Bookmark, PenTool } from 'lucide-react';

const Sidebar = ({ activeView, onNavClick }) => {
  return (
    <aside className="sidebar">
      {/* Brand Logo */}
      <div className="sidebar-logo" style={{ padding: '24px 16px 20px', display: 'flex', alignItems: 'center' }}>
        <img src="logo.png" alt="RO Logo" style={{ height: '36px', width: 'auto' }} />
      </div>

      {/* Top Section - Navigation Links */}
      <nav className="sidebar-nav">
        <button 
          className={`nav-item ${activeView === 'home' || !activeView ? 'active' : ''}`}
          onClick={() => onNavClick('home')}
        >
          <Home size={24} fill={activeView === 'home' || !activeView ? "currentColor" : "none"} />
          <span className="nav-text">ข่าววันนี้</span>
        </button>
        <button 
          className={`nav-item ${activeView === 'content' ? 'active' : ''}`}
          onClick={() => onNavClick('content')}
        >
          <PenTool size={24} />
          <span className="nav-text">คอนเทนต์</span>
        </button>
        <button 
          className={`nav-item ${activeView === 'read' ? 'active' : ''}`}
          onClick={() => onNavClick('read')}
        >
          <BookOpen size={24} />
          <span className="nav-text">อ่านข่าว</span>
        </button>

        <button 
          className={`nav-item ${activeView === 'audience' ? 'active' : ''}`}
          onClick={() => onNavClick('audience')}
        >
          <Users size={24} />
          <span className="nav-text">กลุ่มเป้าหมาย</span>
        </button>
        <button 
          className={`nav-item ${activeView === 'following' ? 'active' : ''}`}
          onClick={() => onNavClick('following')}
        >
          <UserCheck size={24} />
          <span className="nav-text">คนที่คุณติดตาม</span>
        </button>
        <button 
          className={`nav-item ${activeView === 'bookmarks' ? 'active' : ''}`}
          onClick={() => onNavClick('bookmarks')}
        >
          <Bookmark size={24} />
          <span className="nav-text">Bookmarks</span>
        </button>
      </nav>

    </aside>
  );
};

export default Sidebar;

