import { Home, BookOpen, Users, Bookmark, PenTool, RefreshCw, Loader2 } from 'lucide-react';
import { AI_WORKSPACES } from '../config/aiWorkspaces';
import type { ActiveView } from '../types/domain';

type SidebarProps = {
  activeView?: ActiveView;
  onNavClick: (view: ActiveView) => void;
  backgroundTasks?: Record<string, boolean>;
};

const Sidebar = ({ activeView, onNavClick, backgroundTasks = {} }: SidebarProps) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ padding: '24px 16px 20px', display: 'flex', alignItems: 'center', minHeight: '80px' }}>
        <img src="logo.png" alt="RO Logo" style={{ height: '36px', width: '72px', display: 'block' }} loading="eager" />
        {(backgroundTasks.syncing || backgroundTasks.generating || backgroundTasks.searching || backgroundTasks.filtering) && (
          <div style={{ marginLeft: 'auto', background: 'rgba(41, 151, 255, 0.1)', color: 'var(--accent-secondary)', padding: '4px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Loader2 size={10} className="animate-spin" /> WORKING...
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeView === 'home' || !activeView ? 'active' : ''}`}
          onClick={() => onNavClick('home')}
        >
          <Home size={24} fill={activeView === 'home' || !activeView ? 'currentColor' : 'none'} />
          <span className="nav-text">{AI_WORKSPACES.langChain.title}</span>
          {backgroundTasks.syncing && <RefreshCw size={14} className="animate-spin nav-item-spinner" style={{ marginLeft: 'auto', color: 'var(--accent-secondary)' }} />}
        </button>

        <button
          className={`nav-item ${activeView === 'content' ? 'active' : ''}`}
          onClick={() => onNavClick('content')}
        >
          <PenTool size={24} />
          <span className="nav-text">{AI_WORKSPACES.langGraph.shortTitle}</span>
          {(backgroundTasks.generating || backgroundTasks.searching) && <Loader2 size={14} className="animate-spin nav-item-spinner" style={{ marginLeft: 'auto', color: 'var(--accent-secondary)' }} />}
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
          {backgroundTasks.audienceSearch && <Loader2 size={14} className="animate-spin nav-item-spinner" style={{ marginLeft: 'auto', color: 'var(--accent-secondary)' }} />}
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
