import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FEATURE_LABELS, formatPlanLimit, type MeteredFeature, type PlanId } from '../config/pricingPlans';
import plusUserProfileSrc from '../assets/plus-userprofile.png';

type PlanNotice = {
  title: string;
  body: string;
  tone?: string;
} | null | undefined;

type PlanPanelProps = {
  activePlanId: PlanId;
  remainingUsage: Record<MeteredFeature, number>;
  usageLimits: Record<MeteredFeature, number>;
  onSwitchPlan: (planId: PlanId) => void | Promise<void>;
  onResetUsage: () => void;
  onOpenPricing: () => void;
  planNotice?: PlanNotice;
  onClearPlanNotice: () => void;
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

const PlanPanel = ({
  activePlanId,
  remainingUsage,
  usageLimits,
  onSwitchPlan,
  onResetUsage,
  onOpenPricing,
  planNotice,
  onClearPlanNotice,
  defaultOpen = false,
  className = '',
}: PlanPanelProps) => {
  const [isTesterOpen, setIsTesterOpen] = useState(defaultOpen);

  useEffect(() => {
    if (planNotice) {
      setIsTesterOpen(true);
    }
  }, [planNotice]);

  const isPlanPanelOpen = isTesterOpen || Boolean(planNotice);
  const isPlusPlan = activePlanId === 'plus';
  const profileName = MOCK_USER_NAMES[activePlanId] ?? MOCK_USER_NAMES.free;
  const profileInitials = MOCK_USER_INITIALS[activePlanId] ?? MOCK_USER_INITIALS.free;
  const profileCaption = MOCK_USER_CAPTIONS[activePlanId] ?? MOCK_USER_CAPTIONS.free;

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
    <div className={`sidebar-plan-panel compact ${isPlanPanelOpen ? 'open' : ''} ${isPlusPlan ? 'plan-plus' : ''} ${className}`.trim()}>
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
  );
};

export default PlanPanel;
