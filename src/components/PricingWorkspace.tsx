import { Check, Crown, Shield } from 'lucide-react';
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
  onOpenContent: () => void;
};

const FEATURE_ORDER: MeteredFeature[] = ['feed', 'search', 'generate'];
const PUBLIC_PLAN_IDS: PlanId[] = ['free', 'plus'];
const OBJECT_KEYS = ['watchlist', 'postLists'] as const;

const PLAN_FEATURES: Record<'free' | 'plus', string[]> = {
  free: [
    'ลอง Feed, Search, Generate ได้ครบโดยไม่ลดคุณภาพ',
    'เหมาะกับการเช็กสัญญาณประจำวันและสร้างงานสั้น ๆ',
    'เหมาะกับการเริ่มใช้งานและทดลอง workflow หลัก',
  ],
  plus: [
    'ปริมาณต่อวันมากพอสำหรับการใช้งานจริงระหว่างวัน',
    'เพิ่มพื้นที่จัดการ watchlist และ post lists ชัดเจน',
    'เหมาะกับคนที่ใช้ Foro ติดตามและทำงานต่อเนื่องทุกวัน',
  ],
};

const SHARED_SYSTEM_NOTES = [
  'Search และ Generate ใช้ workflow คุณภาพเดียวกันทุกแพ็ก',
  'Bookmarks และ Saved Drafts ไม่จำกัดทั้ง Free และ Plus',
  'ต่างกันที่จำนวนครั้งต่อวันและขนาดพื้นที่จัดการงาน',
];

const PricingWorkspace = ({
  isVisible,
  activePlanId,
  dailyUsage,
  remainingUsage,
  onSelectPlan,
}: PricingWorkspaceProps) => {
  const currentPlan = PLAN_DEFINITIONS[activePlanId];

  return (
    <div className="pricing-shell pricing-shell-minimal animate-fade-in" style={{ display: isVisible ? 'block' : 'none' }}>
      <section className="pricing-band pricing-band-tinted pricing-minimal-header">
        <div className="pricing-minimal-topline">
          <span className="pricing-section-kicker">แพ็กเกจ Foro</span>
          <span className="pricing-current-plan-pill">
            <Shield size={14} />
            {currentPlan.name}
          </span>
        </div>

        <div className="pricing-minimal-head">
          <div className="pricing-minimal-copy">
            <h1 className="pricing-minimal-title">
              <span className="pricing-minimal-title-line">เลือกแพ็กที่</span>
              <span className="pricing-minimal-title-line accent">เหมาะกับคุณ</span>
            </h1>
            <p className="pricing-minimal-subtitle">
              Search และ Generate ใช้คุณภาพเดียวกัน ต่างกันแค่จำนวนต่อวันและพื้นที่จัดการงาน
            </p>
          </div>

          {activePlanId !== 'plus' && (
            <button className="btn-pill primary pricing-minimal-cta" onClick={() => onSelectPlan('plus')}>
              <Crown size={15} />
              เลือก Plus
            </button>
          )}
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
                  <strong>{Number.isFinite(remaining) ? `${remaining}/${formatPlanLimit(limit)}` : 'Unlimited'}</strong>
                </div>
                <div className="pricing-meter-track compact">
                  <div className="pricing-meter-fill" style={{ width: `${progress}%` }} />
                </div>
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
                className={`pricing-plan-card ${planId === 'plus' ? 'is-plus' : ''} ${isCurrent ? 'is-current' : ''}`}
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
                    <div key={item}>
                      <span className="pricing-feature-item">
                        <Check size={15} />
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  className={`btn-pill ${planId === 'plus' ? 'primary' : ''}`}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                  onClick={() => onSelectPlan(planId)}
                >
                  {isCurrent ? 'แพ็กปัจจุบัน' : `เลือก ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default PricingWorkspace;
