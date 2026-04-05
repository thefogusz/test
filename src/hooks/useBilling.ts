// @ts-nocheck
import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { type MeteredFeature } from '../config/pricingPlans';
import { usePricingPlan } from './usePricingPlan';
import { apiFetch } from '../utils/apiFetch';

const PLUS_SUCCESS_PARAM = 'success';
const PLUS_CANCELLED_PARAM = 'cancelled';

type UseBillingParams = {
  setActiveView: (view: string) => void;
  setStatus: (value: string) => void;
};

export const useBilling = ({ setActiveView, setStatus }: UseBillingParams) => {
  const {
    activePlanId,
    currentPlan,
    dailyUsage,
    remainingUsage,
    plusAccess,
    setActivePlanId,
    activatePlusForOneMonth,
    consumeUsage,
    resetDailyUsage,
  } = usePricingPlan();

  const [planNotice, setPlanNotice] = useState(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const handledCheckoutSessionIdRef = useRef(null);

  const pushPlanNotice = (title, body, tone = 'info') => {
    setPlanNotice({ title, body, tone, at: Date.now() });
  };

  const openPricingWithStatus = (message) => {
    setStatus(message);
    pushPlanNotice('Plan notice', message, 'warn');
  };

  const openPricingView = useCallback(() => {
    startTransition(() => {
      setActiveView('pricing');
    });
  }, [setActiveView]);

  const tryConsumeFeature = (feature: MeteredFeature) => {
    const result = consumeUsage(feature);
    if (!result.ok) {
      openPricingWithStatus(result.message);
      return false;
    }
    return true;
  };

  const canUseExportShare = () => {
    if (currentPlan.features.exportShare) return true;
    openPricingWithStatus('Export / Share เป็นฟีเจอร์ของแพ็ก Plus');
    return false;
  };

  const clearCheckoutParams = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('checkout');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  };

  const handleSwitchPlan = (planId) => {
    setActivePlanId(planId);
    pushPlanNotice(
      'Test mode updated',
      `สลับเป็น ${planId === 'admin' ? 'Admin mode' : `${planId.charAt(0).toUpperCase()}${planId.slice(1)} plan`} แล้ว`,
      'info',
    );
    setStatus(`สลับแพ็กเป็น ${planId === 'admin' ? 'Admin' : planId === 'plus' ? 'Plus' : 'Free'} แล้ว`);
  };

  const startPlusCheckout = async () => {
    if (isStartingCheckout) return;
    setIsStartingCheckout(true);
    setStatus('กำลังเชื่อมไปยัง Stripe Checkout...');

    try {
      const response = await apiFetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'ไม่สามารถสร้าง Stripe Checkout session ได้');
      }

      if (payload?.url) {
        window.location.assign(payload.url);
        return;
      }

      throw new Error('Stripe Checkout session ไม่ส่ง URL กลับมา');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เริ่มต้น Stripe Checkout ไม่สำเร็จ';
      pushPlanNotice('Stripe checkout unavailable', message, 'warn');
      setStatus(message);
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const handlePlanSelection = async (planId) => {
    if (planId !== 'plus') {
      handleSwitchPlan(planId);
      return;
    }
    if (activePlanId === 'plus') {
      setStatus('คุณใช้แพ็ก Plus อยู่แล้ว');
      return;
    }
    await startPlusCheckout();
  };

  const handleResetUsage = () => {
    resetDailyUsage();
    pushPlanNotice('Usage reset', 'รีเซ็ตตัวนับรายวันสำหรับการทดสอบแล้ว', 'info');
    setStatus('รีเซ็ต usage รายวันแล้ว');
  };

  // Checkout callback effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const checkoutState = url.searchParams.get('checkout');
    const sessionId = url.searchParams.get('session_id');

    if (!checkoutState) return;

    if (checkoutState === PLUS_CANCELLED_PARAM) {
      pushPlanNotice('Checkout cancelled', 'ยกเลิกการชำระเงินแพ็ก Plus แล้ว', 'warn');
      setStatus('ยกเลิกการชำระเงินแพ็ก Plus แล้ว');
      openPricingView();
      clearCheckoutParams();
      return;
    }

    if (checkoutState !== PLUS_SUCCESS_PARAM || !sessionId) {
      clearCheckoutParams();
      return;
    }

    if (handledCheckoutSessionIdRef.current === sessionId) {
      return;
    }

    handledCheckoutSessionIdRef.current = sessionId;

    let isMounted = true;

    const confirmCheckout = async () => {
      try {
        const response = await apiFetch(
          `/api/billing/checkout-session-status?session_id=${encodeURIComponent(sessionId)}`,
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || 'ตรวจสอบสถานะ Stripe Checkout ไม่สำเร็จ');
        }

        if (!isMounted) return;

        if (payload?.planId === 'plus') {
          activatePlusForOneMonth();
          pushPlanNotice('Plus activated', 'เปิดใช้งานแพ็ก Plus เป็นเวลา 1 เดือนเรียบร้อยแล้ว', 'info');
          setStatus('ชำระเงินสำเร็จ เปิดใช้งานแพ็ก Plus ได้ 1 เดือนแล้ว');
        } else {
          pushPlanNotice(
            'Payment pending',
            'Stripe ยังยืนยันการสมัครสมาชิกไม่เสร็จ ลองเปิดหน้านี้อีกครั้งในอีกสักครู่',
            'warn',
          );
          setStatus('Stripe ยังยืนยันการสมัครสมาชิกไม่เสร็จ');
        }

        openPricingView();
      } catch (error) {
        if (!isMounted) return;
        const message =
          error instanceof Error ? error.message : 'ตรวจสอบสถานะ Stripe Checkout ไม่สำเร็จ';
        pushPlanNotice('Checkout verification failed', message, 'warn');
        setStatus(message);
        openPricingView();
      } finally {
        clearCheckoutParams();
      }
    };

    confirmCheckout();

    return () => {
      isMounted = false;
    };
  }, [activatePlusForOneMonth, openPricingView]);

  return {
    activePlanId,
    currentPlan,
    dailyUsage,
    remainingUsage,
    plusAccess,
    planNotice,
    isStartingCheckout,
    openPricingView,
    openPricingWithStatus,
    tryConsumeFeature,
    canUseExportShare,
    handleSwitchPlan,
    handlePlanSelection,
    handleResetUsage,
    setPlanNotice,
  };
};
