import { Bookmark, BookOpen, House, Loader2, RefreshCw, SquarePen, UsersRound } from 'lucide-react';
import { AI_WORKSPACES } from '../config/aiWorkspaces';
import type { ActiveView } from '../types/domain';

const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 642;
const LOGO_DISPLAY_HEIGHT = 36;

type SidebarProps = {
  activeView?: ActiveView;
  onNavClick: (view: ActiveView) => void;
  backgroundTasks?: Record<string, boolean>;
};

type NavItemConfig = {
  view: ActiveView;
  label: string;
  Icon: typeof House;
  isActive: (activeView?: ActiveView) => boolean;
  isBusy?: (backgroundTasks: Record<string, boolean>) => boolean;
  spinner?: 'refresh' | 'loader';
  fillActive?: boolean;
};

const NAV_ITEMS: NavItemConfig[] = [
  {
    view: 'home',
    label: AI_WORKSPACES.langChain.title,
    Icon: House,
    isActive: (activeView) => activeView === 'home' || !activeView,
    isBusy: (backgroundTasks) => Boolean(backgroundTasks.syncing),
    spinner: 'refresh',
    fillActive: true,
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
    Icon: BookOpen,
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
        <img
          src="logo.png"
          alt="RO Logo"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          style={{
            height: `${LOGO_DISPLAY_HEIGHT}px`,
            width: 'auto',
            aspectRatio: `${LOGO_WIDTH} / ${LOGO_HEIGHT}`,
            display: 'block',
          }}
          loading="eager"
          decoding="async"
        />
        {(backgroundTasks.syncing || backgroundTasks.generating || backgroundTasks.searching || backgroundTasks.filtering) && (
          <div style={{ marginLeft: 'auto', background: 'rgba(41, 151, 255, 0.1)', color: 'var(--accent-secondary)', padding: '4px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Loader2 size={10} className="animate-spin" /> WORKING...
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ view, label, Icon, isActive, isBusy, spinner = 'loader', fillActive = false }) => {
          const active = isActive(activeView);
          const busy = isBusy?.(backgroundTasks);

          return (
            <button
              key={view}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => onNavClick(view)}
            >
              <span className="nav-icon-shell" aria-hidden="true">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.15 : 1.95}
                  fill={active && fillActive ? 'currentColor' : 'none'}
                />
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
