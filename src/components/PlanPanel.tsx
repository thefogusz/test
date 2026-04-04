import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  FEATURE_LABELS,
  formatPlanLimit,
  type MeteredFeature,
  type PlanId,
} from '../config/pricingPlans';
import plusUserProfileSrc from '../assets/plus-userprofile.png';

type PlanNotice = {
  title: string;
  body: string;
  tone?: string;
} | null | undefined;

type PlusAccess = {
  activatedAt: string;
  expiresAt: string;
  source?: 'checkout' | 'manual';
} | null;

type PlanPanelProps = {
  activePlanId: PlanId;
  remainingUsage: Record<MeteredFeature, number>;
  usageLimits: Record<MeteredFeature, number>;
  onSwitchPlan: (planId: PlanId) => void | Promise<void>;
  onResetUsage: () => void;
  onOpenPricing: () => void;
  planNotice?: PlanNotice;
  onClearPlanNotice: () => void;
  plusAccess?: PlusAccess;
  defaultOpen?: boolean;
  className?: string;
};

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
  free: 'Mockup - Free',
  plus: 'Mockup - Plus',
  admin: 'Internal mockup',
};

const getPlusAccessBadgeLabel = (plusAccess?: PlusAccess) => {
  if (!plusAccess?.expiresAt) return null;

  const expiresAtMs = Date.parse(plusAccess.expiresAt);
  if (!Number.isFinite(expiresAtMs)) return null;

  const diffMs = expiresAtMs - Date.now();
  if (diffMs <= 0) return 'หมดอายุแล้ว';

  const now = new Date();
  const expiresAt = new Date(expiresAtMs);
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 1) return 'ถึงวันนี้';
  if (diffDays === 2) return 'ถึงพรุ่งนี้';

  const sameYear = now.getFullYear() === expiresAt.getFullYear();
  const dateLabel = new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(expiresAt);

  return `ถึง ${dateLabel}`;
};

const PlanPanel = ({
  activePlanId,
  remainingUsage,
  usageLimits,
  onSwitchPlan,
  onResetUsage,
  onOpenPricing,
  plusAccess,
  defaultOpen = false,
  className = '',
}: PlanPanelProps) => {
  const [isTesterOpen, setIsTesterOpen] = useState(defaultOpen);

  const isPlusPlan = activePlanId === 'plus';
  const isPlanPanelOpen = isTesterOpen;
  const profileName = MOCK_USER_NAMES[activePlanId] ?? MOCK_USER_NAMES.free;
  const profileInitials = MOCK_USER_INITIALS[activePlanId] ?? MOCK_USER_INITIALS.free;
  const profileCaption = MOCK_USER_CAPTIONS[activePlanId] ?? MOCK_USER_CAPTIONS.free;
  const plusAccessBadgeLabel = useMemo(
    () => (isPlusPlan ? getPlusAccessBadgeLabel(plusAccess) : null),
    [isPlusPlan, plusAccess],
  );

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
    <div
      className={`sidebar-plan-panel compact ${isPlanPanelOpen ? 'open' : ''} ${
        isPlusPlan ? 'plan-plus' : ''
      } ${className}`.trim()}
    >
      <button
        className={`sidebar-user-summary ${isPlusPlan ? 'is-plus' : ''}`}
        onClick={() => setIsTesterOpen((current) => !current)}
        aria-expanded={isPlanPanelOpen}
      >
        <div className="sidebar-user-summary-main">
          {renderProfileAvatar()}
          <div className="sidebar-user-copy">
            <div className="sidebar-user-name">{profileName}</div>
            <div className="sidebar-user-meta-row">
              <div className="sidebar-user-role">{profileCaption}</div>
              {plusAccessBadgeLabel && (
                <span className="sidebar-plus-days-badge">{plusAccessBadgeLabel}</span>
              )}
            </div>
          </div>
        </div>
        <div className="sidebar-user-summary-meta">
          <div className="sidebar-user-plan-badge">{activePlanId}</div>
          <ChevronDown
            size={14}
            className={`sidebar-user-chevron ${isPlanPanelOpen ? 'open' : ''}`}
          />
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
                  {Number.isFinite(remainingUsage[feature])
                    ? remainingUsage[feature]
                    : formatPlanLimit(remainingUsage[feature])}
                </strong>
                <small>/ {formatPlanLimit(usageLimits[feature])}</small>
              </div>
            ))}
          </div>

          <div className="sidebar-user-actions compact">
            <button
              className="btn-pill"
              onClick={onResetUsage}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Reset usage
            </button>
            <button
              className="btn-pill primary"
              onClick={onOpenPricing}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              เปิดหน้า Pricing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanPanel;
