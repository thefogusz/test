import { Check, Crown, Sparkles } from 'lucide-react';
import {
  FEATURE_LABELS,
  OBJECT_LABELS,
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

const PLAN_NOTES = {
  free: [
    'ลองใช้ของจริงได้ครบ',
    'เหมาะกับการใช้งานเบาๆ ระหว่างวัน',
    'ยังไม่มี Export / Share',
  ],
  plus: [
    'เหมาะกับคนที่ใช้ Foro ทำงานจริง',
    'ได้ usage มากขึ้นแบบชัดเจน',
    'มี Export / Share',
  ],
};

const COMPARISON_ROWS = [
  { label: 'Feed', type: 'usage', key: 'feed' },
  { label: 'Search', type: 'usage', key: 'search' },
  { label: 'Generate', type: 'usage', key: 'generate' },
  { label: 'Watchlist', type: 'object', key: 'watchlist' },
  { label: 'Post Lists', type: 'object', key: 'postLists' },
  { label: 'Search Presets', type: 'object', key: 'searchPresets' },
  { label: 'Bookmarks', type: 'feature', key: 'unlimitedBookmarks' },
  { label: 'Saved Drafts', type: 'feature', key: 'unlimitedDrafts' },
  { label: 'Export / Share', type: 'feature', key: 'exportShare' },
] as const;

const renderFeatureValue = (planId: PlanId, row: (typeof COMPARISON_ROWS)[number]) => {
  const plan = PLAN_DEFINITIONS[planId];

  if (row.type === 'usage') {
    return `${formatPlanLimit(plan.usage[row.key as MeteredFeature])} / วัน`;
  }

  if (row.type === 'object') {
    return formatPlanLimit(plan.objects[row.key as keyof typeof plan.objects]);
  }

  return plan.features[row.key as keyof typeof plan.features] ? 'มี' : 'ไม่มี';
};

const PricingWorkspace = ({
  isVisible,
  activePlanId,
  dailyUsage,
  remainingUsage,
  onSelectPlan,
  onOpenContent,
}: PricingWorkspaceProps) => {
  const currentPlan = PLAN_DEFINITIONS[activePlanId];

  return (
    <div className="pricing-page animate-fade-in" style={{ display: isVisible ? 'block' : 'none' }}>
      <section className="pricing-page-header">
        <div>
          <div className="pricing-page-eyebrow">Foro Pricing</div>
          <h1 className="pricing-page-title">เลือกแพ็กที่เหมาะกับการใช้งาน</h1>
          <p className="pricing-page-subtitle">
            Search และ Generate คุณภาพเท่ากันทุกแพ็ก ต่างกันที่จำนวนครั้งต่อวันและพื้นที่จัดการงาน
          </p>
        </div>

        <div className="pricing-page-actions">
          <button className="btn-pill" onClick={onOpenContent}>
            กลับไปใช้งาน
          </button>
          <button className="btn-pill primary" onClick={() => onSelectPlan('plus')}>
            <Crown size={15} />
            เลือก Plus
          </button>
        </div>
      </section>

      <section className="pricing-summary-card">
        <div className="pricing-summary-top">
          <div>
            <div className="pricing-summary-label">แพ็กที่ใช้อยู่ตอนนี้</div>
            <div className="pricing-summary-name-row">
              <h2 className="pricing-summary-name">{currentPlan.name}</h2>
              <span className="pricing-summary-price">{currentPlan.priceLabel}</span>
            </div>
            <p className="pricing-summary-copy">{currentPlan.headline}</p>
          </div>

          <div className="pricing-summary-badge">
            <Sparkles size={14} />
            {activePlanId === 'admin' ? 'Internal test mode' : 'ใช้งานอยู่ตอนนี้'}
          </div>
        </div>

        <div className="pricing-usage-grid">
          {FEATURE_ORDER.map((feature) => {
            const limit = currentPlan.usage[feature];
            const remaining = remainingUsage[feature];
            const used = dailyUsage[feature];
            const progress = Number.isFinite(limit)
              ? Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))
              : 0;

            return (
              <div key={feature} className="pricing-usage-card">
                <div className="pricing-usage-card-top">
                  <span>{FEATURE_LABELS[feature]}</span>
                  <strong>{Number.isFinite(remaining) ? `${remaining} เหลือ` : 'Unlimited'}</strong>
                </div>
                <div className="pricing-usage-card-meta">
                  ใช้ไป {used} จาก {formatPlanLimit(limit)}
                </div>
                <div className="pricing-usage-track">
                  <div className="pricing-usage-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pricing-card-grid">
        {PUBLIC_PLAN_IDS.map((planId) => {
          const plan = PLAN_DEFINITIONS[planId];
          const isCurrent = activePlanId === planId;
          return (
            <article key={planId} className={`pricing-plan-simple ${planId === 'plus' ? 'is-plus' : ''} ${isCurrent ? 'is-current' : ''}`}>
              <div className="pricing-plan-simple-top">
                <div>
                  <div className="pricing-plan-simple-name">{plan.name}</div>
                  <div className="pricing-plan-simple-price">{plan.priceLabel}</div>
                </div>
                {isCurrent && <div className="pricing-plan-simple-badge">Current</div>}
              </div>

              <div className="pricing-plan-simple-section-title">ต่อวัน</div>
              <div className="pricing-plan-simple-quota">
                {FEATURE_ORDER.map((feature) => (
                  <div key={feature} className="pricing-plan-simple-row">
                    <span>{FEATURE_LABELS[feature]}</span>
                    <strong>{formatPlanLimit(plan.usage[feature])} / วัน</strong>
                  </div>
                ))}
              </div>

              <div className="pricing-plan-simple-divider" />

              <div className="pricing-plan-simple-section-title">พื้นที่จัดการงาน</div>
              <div className="pricing-plan-simple-objects">
                {(['watchlist', 'postLists', 'searchPresets'] as const).map((key) => (
                  <div key={key} className="pricing-plan-simple-row">
                    <span>{OBJECT_LABELS[key]}</span>
                    <strong>{formatPlanLimit(plan.objects[key])}</strong>
                  </div>
                ))}
              </div>

              <div className="pricing-plan-simple-divider" />

              <div className="pricing-plan-simple-list">
                {PLAN_NOTES[planId].map((item) => (
                  <div key={item} className="pricing-plan-simple-list-item">
                    <Check size={14} />
                    <span>{item}</span>
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
      </section>

      <section className="pricing-matrix-card">
        <div className="pricing-matrix-header">
          <div>
            <div className="pricing-page-eyebrow">เปรียบเทียบ</div>
            <h2 className="pricing-matrix-title">ดูความต่างแบบเร็วๆ</h2>
          </div>
          <div className="pricing-matrix-note">Bookmarks และ Saved Drafts ไม่จำกัดทั้งสองแพ็ก</div>
        </div>

        <div className="pricing-matrix-table">
          <div className="pricing-matrix-row pricing-matrix-row-head">
            <div>รายการ</div>
            <div>Free</div>
            <div>Plus</div>
          </div>
          {COMPARISON_ROWS.map((row) => (
            <div key={row.label} className="pricing-matrix-row">
              <div>{row.label}</div>
              <div>{renderFeatureValue('free', row)}</div>
              <div>{renderFeatureValue('plus', row)}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="pricing-footnote">
        Feed จะนับเมื่อรีเฟรชฟีดหรือกดโหลดเพิ่ม, Search จะนับตอนเริ่ม query ใหม่, Generate จะนับตอนสร้างงานหรือ regenerate
      </div>
    </div>
  );
};

export default PricingWorkspace;
