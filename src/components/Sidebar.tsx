import { useEffect, useState } from 'react';
import { Bookmark, BookOpen, ChevronDown, CreditCard, House, Loader2, RefreshCw, SquarePen, UsersRound } from 'lucide-react';
import { AI_WORKSPACES } from '../config/aiWorkspaces';
import { FEATURE_LABELS, formatPlanLimit, type MeteredFeature, type PlanId } from '../config/pricingPlans';
import type { ActiveView } from '../types/domain';
import logoSrc from '../assets/logo.png?inline';
import plusUserProfileSrc from '../assets/plus-userprofile.png';

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
  },
];

const MOCK_USER_NAMES: Record<PlanId, string> = {
  free: 'Foro Free',
  plus: 'Foro Plus',
  admin: 'Foro Admin',
};

const MOCK_USER_INITIALS: Record<PlanId, string> = {
  free: 'FG',
  plus: 'FP',
  admin: 'FA',
};

const MOCK_USER_CAPTIONS: Record<PlanId, string> = {
  free: 'Mockup · Free',
  plus: 'Mockup · Plus',
  admin: 'Internal mockup',
};

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
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const isPlanPanelOpen = isTesterOpen;
  const isPlusPlan = activePlanId === 'plus';
  const profileName = MOCK_USER_NAMES[activePlanId] ?? MOCK_USER_NAMES.free;
  const profileInitials = MOCK_USER_INITIALS[activePlanId] ?? MOCK_USER_INITIALS.free;
  const profileCaption = MOCK_USER_CAPTIONS[activePlanId] ?? MOCK_USER_CAPTIONS.free;

  useEffect(() => {
    if (planNotice) {
      setIsTesterOpen(true);
    }
  }, [planNotice]);

  const renderProfileAvatar = () => (
    <div className={`sidebar-user-avatar ${isPlusPlan ? 'has-image is-plus' : ''}`}>
      {isPlusPlan ? (
        <img
          src={plusUserProfileSrc}
          alt={`${profileName} avatar`}
          className="sidebar-user-avatar-image"
          loading="eager"
          decoding="async"
        />
      ) : (
        profileInitials
      )}
    </div>
  );

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

      <div className="sidebar-footer">
        <div className={`sidebar-plan-panel compact ${isPlanPanelOpen ? 'open' : ''} ${isPlusPlan ? 'plan-plus' : ''}`}>
          <button
            className={`sidebar-user-summary ${isPlusPlan ? 'is-plus' : ''}`}
            onClick={() => setIsTesterOpen((current) => !current)}
            aria-expanded={isPlanPanelOpen}
          >
            <div className="sidebar-user-summary-main">
              {renderProfileAvatar()}
              <div className="sidebar-user-copy">
                <div className="sidebar-user-name">{profileName}</div>
                <div className="sidebar-user-role">{profileCaption}</div>
              </div>
            </div>
            <div className="sidebar-user-summary-meta">
              <div className="sidebar-user-plan-badge">{activePlanId}</div>
              <ChevronDown size={14} className={`sidebar-user-chevron ${isPlanPanelOpen ? 'open' : ''}`} />
            </div>
          </button>

          {isPlanPanelOpen && (
            <div className="sidebar-user-mock">
              <div className="sidebar-user-mode-row">
                {(['free', 'plus', 'admin'] as PlanId[]).map((planId) => (
                  <button
                    key={planId}
                    className={`sidebar-mode-chip ${activePlanId === planId ? 'active' : ''}`}
                    onClick={() => onSwitchPlan(planId)}
                  >
                    {planId}
                  </button>
                ))}
              </div>

              <div className="sidebar-user-stats compact">
                {(['feed', 'search', 'generate'] as MeteredFeature[]).map((feature) => (
                  <div key={feature} className="sidebar-user-stat compact">
                    <span>{FEATURE_LABELS[feature]}</span>
                    <strong>
                      {Number.isFinite(remainingUsage[feature]) ? remainingUsage[feature] : formatPlanLimit(remainingUsage[feature])}
                    </strong>
                    <small>/ {formatPlanLimit(usageLimits[feature])}</small>
                  </div>
                ))}
              </div>

              {planNotice && (
                <div className={`sidebar-plan-notice ${planNotice.tone === 'warn' ? 'warn' : ''}`}>
                  <div className="sidebar-plan-notice-title">{planNotice.title}</div>
                  <div className="sidebar-plan-notice-body">{planNotice.body}</div>
                  <button className="sidebar-plan-notice-link" onClick={onClearPlanNotice}>
                    ปิดข้อความนี้
                  </button>
                </div>
              )}

              <div className="sidebar-user-actions compact">
                <button className="btn-pill" onClick={onResetUsage} style={{ width: '100%', justifyContent: 'center' }}>
                  Reset usage
                </button>
                <button className="btn-pill primary" onClick={onOpenPricing} style={{ width: '100%', justifyContent: 'center' }}>
                  เปิดหน้า Pricing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
