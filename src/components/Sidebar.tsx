import { Bookmark, BookOpen, CreditCard, House, Loader2, RefreshCw, SquarePen, UsersRound } from 'lucide-react';
import { AI_WORKSPACES } from '../config/aiWorkspaces';
import { type MeteredFeature, type PlanId } from '../config/pricingPlans';
import type { ActiveView } from '../types/domain';
import logoSrc from '../assets/logo.png?inline';
import PlanPanel from './PlanPanel';

const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 642;
const LOGO_DISPLAY_HEIGHT = 36;

type SidebarProps = {
  activeView?: ActiveView;
  onNavClick: (view: ActiveView) => void;
  backgroundTasks?: Record<string, boolean>;
  activePlanId: PlanId;
  planName: string;
  planPriceLabel: string;
  remainingUsage: Record<MeteredFeature, number>;
  usageLimits: Record<MeteredFeature, number>;
  dailyUsage: Record<MeteredFeature, number>;
  onSwitchPlan: (planId: PlanId) => void;
  onResetUsage: () => void;
  onOpenPricing: () => void;
  planNotice?: { title: string; body: string; tone?: string } | null;
  onClearPlanNotice: () => void;
};

type NavItemConfig = {
  view: ActiveView;
  label: string;
  Icon: typeof House;
  isActive: (activeView?: ActiveView) => boolean;
  isBusy?: (backgroundTasks: Record<string, boolean>) => boolean;
  spinner?: 'refresh' | 'loader';
  fillActive?: boolean;
  hideOnMobile?: boolean;
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
  {
    view: 'pricing',
    label: 'Pricing',
    Icon: CreditCard,
    isActive: (activeView) => activeView === 'pricing',
    hideOnMobile: true,
  },
];

const Sidebar = ({
  activeView,
  onNavClick,
  backgroundTasks = {},
  activePlanId,
  planName: _planName,
  planPriceLabel: _planPriceLabel,
  remainingUsage,
  usageLimits,
  dailyUsage: _dailyUsage,
  onSwitchPlan,
  onResetUsage,
  onOpenPricing,
  planNotice,
  onClearPlanNotice,
}: SidebarProps) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ padding: '24px 16px 20px', display: 'flex', alignItems: 'center', minHeight: '80px' }}>
        <img
          src={logoSrc}
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
        {NAV_ITEMS.map(({ view, label, Icon, isActive, isBusy, spinner = 'loader', fillActive = false, hideOnMobile = false }) => {
          const active = isActive(activeView);
          const busy = isBusy?.(backgroundTasks);

          return (
            <button
              key={view}
              className={`nav-item nav-item-${view} ${hideOnMobile ? 'mobile-hidden' : ''} ${active ? 'active' : ''}`.trim()}
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

      <div className="sidebar-footer">
        <PlanPanel
          activePlanId={activePlanId}
          remainingUsage={remainingUsage}
          usageLimits={usageLimits}
          onSwitchPlan={onSwitchPlan}
          onResetUsage={onResetUsage}
          onOpenPricing={onOpenPricing}
          planNotice={planNotice}
          onClearPlanNotice={onClearPlanNotice}
        />
      </div>
    </aside>
  );
};

export default Sidebar;
