import React from 'react';
import {
  Bookmark,
  BookOpen,
  CreditCard,
  House,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  SquarePen,
  User,
  UsersRound,
} from 'lucide-react';
import { AI_WORKSPACES } from '../config/aiWorkspaces';
import { type MeteredFeature, type PlanId } from '../config/pricingPlans';
import type { ActiveView, ContentTab, PostList } from '../types/domain';
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
  plusAccess?: {
    activatedAt: string;
    expiresAt: string;
    source?: 'checkout' | 'manual';
  } | null;
  planName: string;
  planPriceLabel: string;
  remainingUsage: Record<MeteredFeature, number>;
  usageLimits: Record<MeteredFeature, number>;
  dailyUsage: Record<MeteredFeature, number>;
  onSwitchPlan: (planId: PlanId) => void;
  onOpenPricing: () => void;
  planNotice?: { title: string; body: string; tone?: string } | null;
  onClearPlanNotice: () => void;
  postLists: PostList[];
  currentActiveList?: PostList | null;
  onOpenMobilePostList: () => void;
  onOpenMobileFeed: () => void;
  onOpenMobileFilter: () => void;
  isHomeFilterActive?: boolean;
  contentTab: ContentTab;
  onOpenMobileSearch: () => void;
  onOpenMobileCreate: () => void;
  onOpenMobileRead: () => void;
  onOpenMobileBookmarks: () => void;
};

type NavItemConfig = {
  view: ActiveView;
  label: string;
  mobileLabel?: string;
  Icon: typeof House;
  mobileIcon?: typeof House;
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
    mobileLabel: 'หน้าหลัก',
    Icon: House,
    isActive: (activeView) => activeView === 'home' || !activeView,
    isBusy: (backgroundTasks) => Boolean(backgroundTasks.syncing),
    spinner: 'refresh',
    fillActive: true,
  },
  {
    view: 'content',
    label: AI_WORKSPACES.langGraph.shortTitle,
    mobileLabel: 'ค้นหา',
    Icon: SquarePen,
    mobileIcon: Search,
    isActive: (activeView) => activeView === 'content',
    isBusy: (backgroundTasks) => Boolean(backgroundTasks.generating || backgroundTasks.searching),
    spinner: 'loader',
  },
  {
    view: 'read',
    label: 'อ่านข่าว',
    mobileLabel: 'อ่านข่าว',
    Icon: BookOpen,
    isActive: (activeView) => activeView === 'read',
  },
  {
    view: 'audience',
    label: 'การติดตาม',
    Icon: UsersRound,
    isActive: (activeView) => activeView === 'audience',
    isBusy: (backgroundTasks) => Boolean(backgroundTasks.audienceSearch),
    spinner: 'loader',
    hideOnMobile: true,
  },
  {
    view: 'bookmarks',
    label: 'Bookmarks',
    Icon: Bookmark,
    isActive: (activeView) => activeView === 'bookmarks',
    hideOnMobile: true,
  },
  {
    view: 'pricing',
    label: 'Pricing',
    mobileLabel: 'โปรไฟล์',
    Icon: CreditCard,
    mobileIcon: User,
    isActive: (activeView) => activeView === 'pricing',
  },
];

const Sidebar = ({
  activeView,
  onNavClick,
  backgroundTasks = {},
  activePlanId,
  plusAccess,
  planName: _planName,
  planPriceLabel: _planPriceLabel,
  remainingUsage,
  usageLimits,
  dailyUsage: _dailyUsage,
  onSwitchPlan,
  onOpenPricing,
  planNotice,
  onClearPlanNotice,
  postLists: _postLists,
  currentActiveList,
  onOpenMobilePostList,
  onOpenMobileFeed,
  onOpenMobileFilter,
  isHomeFilterActive = false,
  contentTab,
  onOpenMobileSearch,
  onOpenMobileCreate,
  onOpenMobileRead,
  onOpenMobileBookmarks,
}: SidebarProps) => {
  const featuredPostList = currentActiveList || null;
  const featuredPostListColor = featuredPostList?.color || 'rgba(41, 151, 255, 0.76)';
  const featuredPostListAccentStyle = featuredPostList
    ? { '--active-list-accent': featuredPostListColor }
    : undefined;

  return (
    <aside className="sidebar">
      {activeView === 'home' && (
        <div className="mobile-postlist-launch-shell mobile-only-flex">
          <button
            type="button"
            className={`mobile-postlist-main ${featuredPostList ? 'home-active-list-accent' : ''}`.trim()}
            style={featuredPostListAccentStyle}
            onClick={onOpenMobilePostList}
            aria-label={featuredPostList ? `Open post list ${featuredPostList.name}` : 'Open post list'}
          >
            <span className="mobile-postlist-cover" style={{ background: featuredPostListColor }}>
              <span className="mobile-postlist-cover-inner" />
            </span>
            <span className="mobile-postlist-copy">
              <span className="mobile-postlist-title">{featuredPostList?.name || 'ทั้งหมด'}</span>
            </span>
          </button>

          <div className="mobile-postlist-actions">
            <button
              type="button"
              className={`mobile-postlist-mini-btn ${isHomeFilterActive ? 'active' : ''}`.trim()}
              onClick={onOpenMobileFilter}
              aria-label="Open filter"
            >
              <Sparkles size={13} />
              <span>Filter</span>
            </button>

            <button
              type="button"
              className={`mobile-postlist-mini-btn mobile-postlist-mini-btn-feed ${activeView === 'home' ? 'active' : ''}`.trim()}
              onClick={() => {
                if (activeView === 'home') {
                  window.dispatchEvent(new CustomEvent('foro:refreshFeed'));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                onOpenMobileFeed();
              }}
              aria-label="Open feed"
            >
              <RefreshCw size={13} strokeWidth={2.2} />
              <span>Feed</span>
            </button>
          </div>
        </div>
      )}

      {activeView === 'content' && (
        <div
          className="mobile-context-switcher mobile-context-switcher-profile mobile-only-flex"
          aria-label="Search navigation"
        >
          <div className="mobile-context-nav-group">
            <button
              type="button"
              className={`mobile-context-btn ${contentTab === 'search' ? 'active' : ''}`.trim()}
              onClick={onOpenMobileSearch}
              aria-pressed={contentTab === 'search'}
            >
              <Search size={15} />
              <span>ค้นหา</span>
            </button>
            <button
              type="button"
              className={`mobile-context-btn ${contentTab === 'create' ? 'active' : ''}`.trim()}
              onClick={onOpenMobileCreate}
              aria-pressed={contentTab === 'create'}
            >
              <SquarePen size={15} />
              <span>สร้างคอนเทนต์</span>
            </button>
          </div>
        </div>
      )}

      {(activeView === 'read' || activeView === 'bookmarks') && (
        <div className="mobile-postlist-launch-shell mobile-only-flex" aria-label="Library navigation">
          <button
            type="button"
            className="mobile-postlist-main"
            onClick={onOpenMobilePostList}
            aria-label={featuredPostList ? `Open post list ${featuredPostList.name}` : 'Open post list'}
          >
            <span className="mobile-postlist-cover" style={{ background: featuredPostListColor }}>
              <span className="mobile-postlist-cover-inner" />
            </span>
            <span className="mobile-postlist-copy">
              <span className="mobile-postlist-title">{featuredPostList?.name || 'ทั้งหมด'}</span>
            </span>
          </button>

          <div className="mobile-postlist-actions mobile-postlist-actions-library">
            <button
              type="button"
              className={`mobile-postlist-mini-btn ${activeView === 'read' ? 'active' : ''}`.trim()}
              onClick={onOpenMobileRead}
              aria-pressed={activeView === 'read'}
              aria-label="อ่านข่าว"
            >
              <BookOpen size={13} />
              <span>อ่าน</span>
            </button>
            <button
              type="button"
              className={`mobile-postlist-mini-btn ${activeView === 'bookmarks' ? 'active' : ''}`.trim()}
              onClick={onOpenMobileBookmarks}
              aria-pressed={activeView === 'bookmarks'}
              aria-label="บันทึก"
            >
              <Bookmark size={13} />
              <span>บันทึก</span>
            </button>
          </div>
        </div>
      )}

      <div
        className="sidebar-logo"
        style={{ padding: '24px 16px 20px', display: 'flex', alignItems: 'center', minHeight: '80px' }}
      >
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
        {(backgroundTasks.syncing ||
          backgroundTasks.generating ||
          backgroundTasks.searching ||
          backgroundTasks.filtering) && (
          <div
            style={{
              marginLeft: 'auto',
              background: 'rgba(41, 151, 255, 0.1)',
              color: 'var(--accent-secondary)',
              padding: '4px 8px',
              borderRadius: '100px',
              fontSize: '10px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Loader2 size={10} className="animate-spin" /> WORKING...
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(
          ({
            view,
            label,
            mobileLabel,
            Icon,
            mobileIcon,
            isActive,
            isBusy,
            spinner = 'loader',
            fillActive = false,
            hideOnMobile = false,
          }) => {
            const active = isActive(activeView);
            const busy = isBusy?.(backgroundTasks);
            const MobileIcon = mobileIcon || Icon;

            return (
              <button
                key={view}
                className={`nav-item nav-item-${view} ${hideOnMobile ? 'mobile-hidden' : ''} ${active ? 'active' : ''}`.trim()}
                onClick={() => onNavClick(view)}
                aria-label={mobileLabel || label}
              >
                <span className="nav-icon-shell" aria-hidden="true">
                  <Icon
                    className="nav-icon-desktop"
                    size={20}
                    strokeWidth={active ? 2.15 : 1.95}
                    fill={active && fillActive ? 'currentColor' : 'none'}
                  />
                  <MobileIcon
                    className="nav-icon-mobile"
                    size={20}
                    strokeWidth={active ? 2.15 : 1.95}
                    fill={active && fillActive ? 'currentColor' : 'none'}
                  />
                </span>
                <span className="nav-text" data-mobile-label={mobileLabel || label}>
                  {label}
                </span>
                {busy &&
                  (spinner === 'refresh' ? (
                    <RefreshCw
                      size={14}
                      className="animate-spin nav-item-spinner"
                      style={{ marginLeft: 'auto', color: 'var(--accent-secondary)' }}
                    />
                  ) : (
                    <Loader2
                      size={14}
                      className="animate-spin nav-item-spinner"
                      style={{ marginLeft: 'auto', color: 'var(--accent-secondary)' }}
                    />
                  ))}
              </button>
            );
          },
        )}
      </nav>

      <div className="sidebar-footer">
        <PlanPanel
          activePlanId={activePlanId}
          plusAccess={plusAccess}
          remainingUsage={remainingUsage}
          usageLimits={usageLimits}
          onSwitchPlan={onSwitchPlan}
          onOpenPricing={onOpenPricing}
          planNotice={planNotice}
          onClearPlanNotice={onClearPlanNotice}
        />
      </div>
    </aside>
  );
};

export default Sidebar;
