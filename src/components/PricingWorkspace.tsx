import { ArrowRight, Check, Crown, Gauge, Layers3, Sparkles } from 'lucide-react';
import {
  FEATURE_HINTS,
  FEATURE_LABELS,
  OBJECT_LABELS,
  PLAN_ORDER,
  PLAN_DEFINITIONS,
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
    <div className="pricing-shell animate-fade-in" style={{ display: isVisible ? 'block' : 'none' }}>
      <section className="pricing-hero">
        <div className="pricing-hero-copy">
          <div className="pricing-eyebrow">
            <Sparkles size={14} />
            FORO PRICING
          </div>
          <div className="pricing-current-plan-line">
            <span className="pricing-current-plan-label">Current plan</span>
            <span className="pricing-current-plan-pill">{currentPlan.name}</span>
          </div>
          <h1 className="pricing-hero-title">โครงราคาแบบเบาแรง แต่ยังปล่อย workflow หลักของ Foro ได้เต็ม</h1>
          <p className="pricing-hero-subtitle">
            Search และ Generate ใช้คุณภาพเดียวกันทุกแพ็ก ต่างกันที่ปริมาณการใช้งานต่อวัน พื้นที่จัดการงาน และความสามารถด้าน export/share
          </p>

          <div className="pricing-hero-actions">
            <button className="btn-pill primary" onClick={() => onSelectPlan('plus')}>
              <Crown size={16} />
              เลือก Plus
            </button>
            <button className="btn-pill" onClick={onOpenContent}>
              เริ่มใช้งาน
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <div className="pricing-poster">
          <div className="pricing-poster-noise" />
          <div className="pricing-poster-panel">
            <div className="pricing-poster-header">
              <div>
                <div className="pricing-poster-kicker">Daily usage today</div>
                <div className="pricing-poster-plan-name">{currentPlan.name}</div>
              </div>
              <div className="pricing-poster-price">{currentPlan.priceLabel}</div>
            </div>

            <div className="pricing-meter-stack">
              {FEATURE_ORDER.map((feature) => {
                const limit = currentPlan.usage[feature];
                const used = dailyUsage[feature];
                const progress = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

                return (
                  <div key={feature} className="pricing-meter-row">
                    <div className="pricing-meter-topline">
                      <span>{FEATURE_LABELS[feature]}</span>
                      <span>
                        {remainingUsage[feature]} / {limit} left
                      </span>
                    </div>
                    <div className="pricing-meter-track">
                      <div className="pricing-meter-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="pricing-meter-hint">{FEATURE_HINTS[feature]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-band">
        <div className="pricing-band-header">
          <div>
            <div className="pricing-section-kicker">Plan comparison</div>
            <h2 className="pricing-section-title">สองแพ็กที่ชัดเจนพอสำหรับทั้งคนลองใช้และคนทำงานจริง</h2>
          </div>
        </div>

        <div className="pricing-plan-grid">
          {PLAN_ORDER.map((planId) => {
            const plan = PLAN_DEFINITIONS[planId];
            const isCurrent = planId === activePlanId;
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
                  {isCurrent && <div className="pricing-plan-current-badge">ใช้งานอยู่</div>}
                </div>

                <p className="pricing-plan-description">{plan.description}</p>

                <div className="pricing-plan-usage">
                  {FEATURE_ORDER.map((feature) => (
                    <div key={feature} className="pricing-plan-usage-row">
                      <span>{FEATURE_LABELS[feature]}</span>
                      <strong>{plan.usage[feature]} / วัน</strong>
                    </div>
                  ))}
                </div>

                <div className="pricing-plan-divider" />

                <div className="pricing-plan-objects">
                  <div className="pricing-mini-heading">
                    <Layers3 size={14} />
                    Workspace limits
                  </div>
                  {Object.entries(plan.objects).map(([key, value]) => (
                    <div key={key} className="pricing-plan-usage-row">
                      <span>{OBJECT_LABELS[key as keyof typeof OBJECT_LABELS]}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                <div className="pricing-plan-divider" />

                <div className="pricing-feature-list">
                  <div className="pricing-feature-item">
                    <Check size={14} />
                    Bookmarks ไม่จำกัด
                  </div>
                  <div className="pricing-feature-item">
                    <Check size={14} />
                    Saved generated drafts ไม่จำกัด
                  </div>
                  <div className="pricing-feature-item">
                    <Check size={14} />
                    Search presets สูงสุด 3 รายการ
                  </div>
                  <div className="pricing-feature-item">
                    <Check size={14} />
                    Search และ Generate คุณภาพเท่ากันทุกแพ็ก
                  </div>
                  <div className="pricing-feature-item">
                    <Check size={14} />
                    {plan.features.exportShare ? 'Export / Share ได้' : 'ยังไม่มี Export / Share'}
                  </div>
                </div>

                <button
                  className={`btn-pill ${planId === 'plus' ? 'primary' : ''}`}
                  onClick={() => onSelectPlan(planId)}
                  style={{ width: 'fit-content', marginTop: 'auto' }}
                >
                  {isCurrent ? 'แพ็กปัจจุบัน' : `สลับเป็น ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="pricing-band pricing-band-tinted">
        <div className="pricing-system-grid">
          <article className="pricing-system-panel">
            <div className="pricing-mini-heading">
              <Gauge size={14} />
              สิ่งที่ Foro meter จริง
            </div>
            <div className="pricing-checklist">
              <div>Feed จะถูกนับเมื่อผู้ใช้รีเฟรชฟีดหรือโหลด feed เพิ่ม</div>
              <div>Search จะถูกนับเฉพาะการเริ่ม query ใหม่ ไม่บวกตอนเลื่อนดูผลเดิม</div>
              <div>Generate จะถูกนับเมื่อสร้างงานใหม่หรือ regenerate อีกเวอร์ชัน</div>
            </div>
          </article>

          <article className="pricing-system-panel">
            <div className="pricing-mini-heading">
              <Sparkles size={14} />
              สิ่งที่ปล่อยให้ไม่จำกัด
            </div>
            <div className="pricing-checklist">
              <div>Bookmarks ไม่จำกัดทั้ง Free และ Plus</div>
              <div>Saved generated drafts ไม่จำกัดทั้ง Free และ Plus</div>
              <div>คุณภาพ Search / Generate ไม่ถูก nerf ระหว่างแพ็ก</div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};

export default PricingWorkspace;
