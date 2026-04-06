import { createElement, useEffect, useState } from 'react';
import { Check, CreditCard, Shield, Sparkles, X } from 'lucide-react';
import {
  FEATURE_HINTS,
  FEATURE_LABELS,
  PLAN_DEFINITIONS,
  formatPlanLimit,
  type MeteredFeature,
  type PlanId,
} from '../config/pricingPlans';

type PricingWorkspaceProps = {
  isVisible: boolean;
  activePlanId: PlanId;
  dailyUsage: Record<MeteredFeature, number>;
  remainingUsage: Record<MeteredFeature, number>;
  onSelectPlan: (planId: PlanId) => void;
  isCheckoutLoading?: boolean;
  onOpenContent: () => void;
};

const FEATURE_ORDER: MeteredFeature[] = ['feed', 'search', 'generate'];
const PUBLIC_PLAN_IDS: PlanId[] = ['free', 'plus'];
const OBJECT_KEYS = ['watchlist', 'postLists'] as const;
const STRIPE_BUY_BUTTON_ID = 'buy_btn_1TIdPdCGBiAw3E86dhqAoTWe';
const STRIPE_BUY_BUTTON_SCRIPT_ID = 'stripe-buy-button-script';

const PLAN_PILL_ICON: Record<PlanId, typeof Shield> = {
  free: CreditCard,
  plus: Sparkles,
  admin: Shield,
};

const PLAN_FEATURES: Record<'free' | 'plus', string[]> = {
  free: [
    'เริ่มใช้ Feed, Search และ Generate ได้ทันที',
    'เหมาะกับการใช้ Foro จัดการแหล่งข้อมูลประจำวัน',
    'บันทึก bookmarks และ drafts ได้ไม่จำกัด',
  ],
  plus: [
    'เพิ่มโควตา Search และ Generate สำหรับงานโปร',
    'เหมาะกับการสร้างคอนเทนต์ตลอดทั้งวัน',
    'ขยายพื้นที่จัดการ Watchlist และ Post Lists',
  ],
};

const ensureStripeBuyButtonScript = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STRIPE_BUY_BUTTON_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = STRIPE_BUY_BUTTON_SCRIPT_ID;
  script.async = true;
  script.src = 'https://js.stripe.com/v3/buy-button.js';
  document.body.appendChild(script);
};

const PricingWorkspace = ({
  isVisible,
  activePlanId,
  dailyUsage,
  remainingUsage,
  onSelectPlan,
  isCheckoutLoading = false,
}: PricingWorkspaceProps) => {
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const currentPlan = PLAN_DEFINITIONS[activePlanId];
  const CurrentPlanIcon = PLAN_PILL_ICON[activePlanId] ?? CreditCard;
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
  const isBuyModalVisible = isVisible && isBuyModalOpen;

  useEffect(() => {
    if (!isBuyModalVisible) return undefined;

    ensureStripeBuyButtonScript();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isBuyModalVisible]);

  useEffect(() => {
    if (isVisible || !isBuyModalOpen) return undefined;

    const closeTimer = window.setTimeout(() => {
      setIsBuyModalOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [isBuyModalOpen, isVisible]);

  const openBuyModal = () => {
    setIsBuyModalOpen(true);
  };

  const handlePlanAction = (planId: PlanId) => {
    if (planId === 'plus') {
      openBuyModal();
      return;
    }

    onSelectPlan(planId);
  };

  return (
    <>
      <div
        className="pricing-shell pricing-shell-minimal animate-fade-in"
        style={{ display: isVisible ? 'block' : 'none' }}
      >
        <section className="pricing-band pricing-band-tinted pricing-minimal-header">
          <div className="pricing-minimal-topline">
            <span className="pricing-section-kicker">แพ็กเกจ FORO</span>
            <span className="pricing-current-plan-pill">
              <CurrentPlanIcon size={14} />
              {currentPlan.name}
            </span>
          </div>

          <div className="pricing-minimal-head">
            <div className="pricing-minimal-copy">
              <h1 className="pricing-minimal-title">เลือกแพ็กที่เหมาะกับคุณ</h1>
              <p className="pricing-minimal-subtitle">
                เลือกตามปริมาณการใช้งานต่อวัน พื้นที่จัดการงาน และความต่อเนื่องของ workflow
                ที่คุณต้องการ
              </p>
            </div>

            {/* Redundant Plus button removed */}
          </div>

          <div className="pricing-usage-strip">
            {FEATURE_ORDER.map((feature) => {
              const limit = currentPlan.usage[feature];
              const remaining = remainingUsage[feature];
              const used = dailyUsage[feature];
              const progress = Number.isFinite(limit)
                ? Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))
                : 0;

              return (
                <div key={feature} className="pricing-usage-tile">
                  <div className="pricing-usage-tile-top">
                    <span>{FEATURE_LABELS[feature]}</span>
                    <strong>
                      {Number.isFinite(remaining)
                        ? `${remaining}/${formatPlanLimit(limit)}`
                        : 'Unlimited'}
                    </strong>
                  </div>
                  <div className="pricing-meter-track compact">
                    <div className="pricing-meter-fill" style={{ width: `${progress}%` }} />
                  </div>
                  {/* FEATURE_HINTS removed as per request to keep UI clean */}
                </div>
              );
            })}
          </div>
        </section>

        <section className="pricing-band pricing-band-plain">
          <div className="pricing-plan-grid">
            {PUBLIC_PLAN_IDS.map((planId) => {
              const plan = PLAN_DEFINITIONS[planId];
              const isCurrent = activePlanId === planId;

              return (
                <article
                  key={planId}
                  className={`pricing-plan-card ${planId === 'plus' ? 'is-plus' : ''} ${
                    isCurrent ? 'is-current' : ''
                  }`}
                >
                  <div className="pricing-plan-top">
                    <div>
                      <div className="pricing-plan-name">{plan.name}</div>
                      <div className="pricing-plan-price">{plan.priceLabel}</div>
                    </div>
                    {isCurrent && <div className="pricing-plan-current-badge">แพ็กปัจจุบัน</div>}
                  </div>

                  <p className="pricing-plan-description">{plan.description}</p>

                  <div className="pricing-mini-heading">ต่อวัน</div>
                  <div className="pricing-plan-usage">
                    {FEATURE_ORDER.map((feature) => (
                      <div key={feature} className="pricing-plan-usage-row">
                        <span>{FEATURE_LABELS[feature]}</span>
                        <strong>{formatPlanLimit(plan.usage[feature])} / วัน</strong>
                      </div>
                    ))}
                  </div>

                  <div className="pricing-plan-divider" />

                  <div className="pricing-mini-heading">พื้นที่จัดการงาน</div>
                  <div className="pricing-plan-objects">
                    {OBJECT_KEYS.map((key) => (
                      <div key={key} className="pricing-plan-usage-row">
                        <span>{key === 'watchlist' ? 'Watchlist' : 'Post Lists'}</span>
                        <strong>{formatPlanLimit(plan.objects[key])}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="pricing-plan-divider" />

                  <div className="pricing-checklist">
                    {PLAN_FEATURES[planId].map((item) => (
                      <div key={item} className="pricing-feature-item">
                        <Check size={15} />
                        {item}
                      </div>
                    ))}
                  </div>

                  <button
                    className={`btn-pill ${planId === 'plus' ? 'primary' : ''}`}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                    onClick={() => handlePlanAction(planId)}
                    disabled={planId === 'plus' && isCheckoutLoading}
                  >
                    {isCurrent ? 'แพ็กปัจจุบัน' : `เลือก ${plan.name}`}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {isBuyModalVisible && (
        <div className="pricing-buy-modal-layer" role="dialog" aria-modal="true">
          <button
            className="pricing-buy-modal-backdrop"
            aria-label="ปิดหน้าต่างซื้อแพ็ก"
            onClick={() => setIsBuyModalOpen(false)}
          />
          <div className="pricing-buy-modal">
            <button
              className="pricing-buy-modal-close"
              onClick={() => setIsBuyModalOpen(false)}
              aria-label="ปิด"
            >
              <X size={18} />
            </button>

            <div className="pricing-buy-modal-body">
              {publishableKey ? (
                createElement('stripe-buy-button', {
                  'buy-button-id': STRIPE_BUY_BUTTON_ID,
                  'publishable-key': publishableKey,
                })
              ) : (
                <div className="pricing-buy-modal-fallback">
                  ไม่พบ VITE_STRIPE_PUBLISHABLE_KEY สำหรับแสดง Buy Button
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PricingWorkspace;
