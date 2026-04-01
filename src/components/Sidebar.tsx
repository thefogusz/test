import { Bookmark, LibraryBig, Loader2, Newspaper, RefreshCw, SquarePen, UsersRound } from 'lucide-react';
import { AI_WORKSPACES } from '../config/aiWorkspaces';
import type { ActiveView } from '../types/domain';

type SidebarProps = {
  activeView?: ActiveView;
  onNavClick: (view: ActiveView) => void;
  backgroundTasks?: Record<string, boolean>;
};

type NavItemConfig = {
  view: ActiveView;
  label: string;
  Icon: typeof Newspaper;
  isActive: (activeView?: ActiveView) => boolean;
  isBusy?: (backgroundTasks: Record<string, boolean>) => boolean;
  spinner?: 'refresh' | 'loader';
};

const NAV_ITEMS: NavItemConfig[] = [
  {
    view: 'home',
    label: AI_WORKSPACES.langChain.title,
    Icon: Newspaper,
    isActive: (activeView) => activeView === 'home' || !activeView,
    isBusy: (backgroundTasks) => Boolean(backgroundTasks.syncing),
    spinner: 'refresh',
  },
  {
    view: 'content',
    label: AI_WORKSPACES.langGraph.shortTitle,
    Icon: SquarePen,
    isActive: (activeView) => activeView === 'content',
    isBusy: (backgroundTasks) => Boolean(backgroundTasks.generating || backgroundTasks.searching),
    spinner: 'loader',
  },
  {
    view: 'read',
    label: 'อ่านข่าว',
    Icon: LibraryBig,
    isActive: (activeView) => activeView === 'read',
  },
  {
    view: 'audience',
    label: 'กลุ่มเป้าหมาย',
    Icon: UsersRound,
    isActive: (activeView) => activeView === 'audience',
    isBusy: (backgroundTasks) => Boolean(backgroundTasks.audienceSearch),
    spinner: 'loader',
  },
  {
    view: 'bookmarks',
    label: 'Bookmarks',
    Icon: Bookmark,
    isActive: (activeView) => activeView === 'bookmarks',
  },
];

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
        {NAV_ITEMS.map(({ view, label, Icon, isActive, isBusy, spinner = 'loader' }) => {
          const active = isActive(activeView);
          const busy = isBusy?.(backgroundTasks);

          return (
            <button
              key={view}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => onNavClick(view)}
            >
              <span className="nav-icon-shell" aria-hidden="true">
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <span className="nav-text">{label}</span>
              {busy && (
                spinner === 'refresh'
                  ? <RefreshCw size={14} className="animate-spin nav-item-spinner" style={{ marginLeft: 'auto', color: 'var(--accent-secondary)' }} />
                  : <Loader2 size={14} className="animate-spin nav-item-spinner" style={{ marginLeft: 'auto', color: 'var(--accent-secondary)' }} />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
